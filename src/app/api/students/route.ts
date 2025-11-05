import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectDuplicates } from "@/lib/validators/duplicateDetector";
import {
  DEFAULT_MATCHING_CRITERIA,
  getPreset,
} from "@/lib/validators/matchingRules";
import { studentInsertSchema } from "@/lib/types/student";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
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

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    const result = await detectDuplicates(supabase, studentData, criteria, {
      excludeStudentId: options.excludeStudentId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
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

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    const result = await detectDuplicates(supabase, studentData, criteria, {
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
          error: "At least one search parameter is required (phone, email, aadhar, firstName, or lastName)",
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
