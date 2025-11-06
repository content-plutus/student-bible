import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { studentUpdateSchema } from "@/lib/types/student";
import { z } from "zod";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/students endpoints.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validates the API key from the request header.
 *
 * SECURITY NOTE: These endpoints use the service-role key and bypass RLS.
 * INTERNAL_API_KEY is REQUIRED in production (enforced at module load).
 * In non-production environments, if INTERNAL_API_KEY is not set, a warning
 * is logged but requests are allowed (for development convenience).
 *
 * Additional security layers recommended:
 * - Infrastructure-level auth (VPN, internal network)
 * - Session-based auth (NextAuth, etc.)
 */
function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    console.warn(
      "WARNING: INTERNAL_API_KEY not set. API endpoints are unprotected. " +
        "This is only allowed in non-production environments.",
    );
    return null;
  }

  const requestApiKey = request.headers.get("X-Internal-API-Key");

  if (!requestApiKey || requestApiKey !== apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized. Valid X-Internal-API-Key header required.",
      },
      { status: 401 },
    );
  }

  return null;
}

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const supabase = getSupabaseClient();

    const { data: student, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Student not found",
          },
          { status: 404 },
        );
      }
      throw error;
    }

    const { extra_fields, ...coreFields } = student;
    const mergedStudent = {
      ...coreFields,
      ...(extra_fields || {}),
    };

    return NextResponse.json({
      success: true,
      student: mergedStudent,
    });
  } catch (error) {
    console.error("Error retrieving student:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();

    const validatedData = studentUpdateSchema.partial().parse(body);

    const supabase = getSupabaseClient();

    const { extra_fields, ...coreFields } = validatedData;

    const { error: fetchError } = await supabase
      .from("students")
      .select("id")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Student not found",
          },
          { status: 404 },
        );
      }
      throw fetchError;
    }

    if (extra_fields && Object.keys(extra_fields).length > 0) {
      const { error: rpcError } = await supabase.rpc("students_update_extra_fields", {
        student_id: params.id,
        patch: extra_fields,
        strip_nulls: true,
      });

      if (rpcError) {
        throw rpcError;
      }
    }

    if (Object.keys(coreFields).length > 0) {
      const { error: updateError } = await supabase
        .from("students")
        .update(coreFields)
        .eq("id", params.id);

      if (updateError) {
        throw updateError;
      }
    }

    const { data: updatedStudent, error: refetchError } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.id)
      .single();

    if (refetchError) {
      throw refetchError;
    }

    const { extra_fields: updatedExtraFields, ...updatedCoreFields } = updatedStudent;
    const mergedStudent = {
      ...updatedCoreFields,
      ...(updatedExtraFields || {}),
    };

    return NextResponse.json({
      success: true,
      student: mergedStudent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        },
        { status: 400 },
      );
    }
    console.error("Error updating student:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
