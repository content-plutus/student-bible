import { NextRequest, NextResponse } from "next/server";
import { studentUpdateSchema } from "@/lib/types/student";
import { z } from "zod";
import { withAuth } from "@/lib/middleware/auth";
import type { SupabaseClient, User } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    "Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL must be set",
  );
}

async function handleGET(
  request: NextRequest,
  user: User,
  supabase: SupabaseClient,
  params: { id: string },
) {
  try {
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth()((req, user, supabase) => handleGET(req, user, supabase, params))(request);
}

async function handlePATCH(
  request: NextRequest,
  user: User,
  supabase: SupabaseClient,
  params: { id: string },
) {
  try {
    const body = await request.json();

    const validatedData = studentUpdateSchema.parse(body);

    const { full_name, extra_fields, ...coreFields } = validatedData;
    void full_name;

    const { data: updatedStudent, error: rpcError } = await supabase.rpc(
      "students_update_profile",
      {
        student_id: params.id,
        core_patch: coreFields,
        extra_patch: extra_fields || {},
        strip_nulls: true,
      },
    );

    if (rpcError) {
      if (rpcError.message && rpcError.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Student not found",
          },
          { status: 404 },
        );
      }
      throw rpcError;
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth()((req, user, supabase) => handlePATCH(req, user, supabase, params))(request);
}
