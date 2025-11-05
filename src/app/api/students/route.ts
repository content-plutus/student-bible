import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectDuplicates } from "@/lib/validators/duplicateDetector";
import { DEFAULT_MATCHING_CRITERIA, getPreset } from "@/lib/validators/matchingRules";
import { studentInsertSchema } from "@/lib/types/student";
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

const studentSearchSchema = z
  .object({
    phone_number: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    date_of_birth: z.union([z.string(), z.date()]).optional(),
    aadhar_number: z.string().optional(),
    guardian_phone: z.string().optional(),
    pan_number: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== null), {
    message: "At least one field must be provided for duplicate detection",
  });

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { studentData, options = {} } = body;

    if (!studentData) {
      return NextResponse.json(
        {
          success: false,
          error: "Student data is required",
        },
        { status: 400 },
      );
    }

    const validatedData = studentSearchSchema.parse(studentData);

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    const result = await detectDuplicates(supabase, validatedData, criteria, {
      excludeStudentId: options.excludeStudentId,
    });

    return NextResponse.json({
      success: true,
      result,
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
    console.error("Error detecting duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { studentData, createIfNoDuplicates = false, options = {} } = body;

    if (!studentData) {
      return NextResponse.json(
        {
          success: false,
          error: "Student data is required",
        },
        { status: 400 },
      );
    }

    const validatedSearchData = studentSearchSchema.parse(studentData);

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    const result = await detectDuplicates(supabase, validatedSearchData, criteria, {
      excludeStudentId: options.excludeStudentId,
    });

    if (!result.hasPotentialDuplicates && createIfNoDuplicates) {
      try {
        const validatedData = studentInsertSchema.parse(studentData);

        const { data: newStudent, error: insertError } = await supabase
          .from("students")
          .insert(validatedData)
          .select()
          .single();

        if (insertError) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to create student: ${insertError.message}`,
              duplicateCheckResult: result,
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          created: true,
          student: newStudent,
          duplicateCheckResult: result,
        });
      } catch (validationError) {
        return NextResponse.json(
          {
            success: false,
            error:
              validationError instanceof z.ZodError
                ? `Validation error: ${validationError.errors.map((e) => e.message).join(", ")}`
                : "Validation error occurred",
            duplicateCheckResult: result,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      created: false,
      duplicateCheckResult: result,
      message: result.hasPotentialDuplicates
        ? "Potential duplicates found. Student not created."
        : "No duplicates found but createIfNoDuplicates was false.",
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
    console.error("Error in student creation with duplicate check:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const aadhar = searchParams.get("aadhar");
    const firstName = searchParams.get("firstName");
    const lastName = searchParams.get("lastName");
    const preset = searchParams.get("preset");

    if (!phone && !email && !aadhar && !firstName && !lastName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one search parameter is required (phone, email, aadhar, firstName, or lastName)",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();

    const studentData: Record<string, string> = {};
    if (phone) studentData.phone_number = phone;
    if (email) studentData.email = email;
    if (aadhar) studentData.aadhar_number = aadhar;
    if (firstName) studentData.first_name = firstName;
    if (lastName) studentData.last_name = lastName;

    const criteria = preset
      ? getPreset(preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : DEFAULT_MATCHING_CRITERIA;

    const result = await detectDuplicates(supabase, studentData, criteria);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error searching for duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
