import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createDuplicateDetector, type StudentInput } from "@/lib/validators/duplicateDetector";
import {
  validatePhoneNumber,
  validateEmail,
  validateAadharNumber,
} from "@/lib/validators/studentValidator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationErrors = validateStudentInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    const studentData: StudentInput = {
      phone_number: body.phone_number,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || null,
      date_of_birth: body.date_of_birth || null,
      aadhar_number: body.aadhar_number || null,
      extra_fields: body.extra_fields || {},
    };

    const detector = await createDuplicateDetector();
    const result = await detector.detectDuplicates(studentData);

    if (result.is_duplicate && result.confidence === "high") {
      return NextResponse.json(
        {
          error: "Duplicate student detected",
          duplicate_detection: result,
          message:
            "A student with very similar information already exists. Please review the matches before proceeding.",
        },
        { status: 409 },
      );
    }

    if (result.is_duplicate && result.confidence === "medium") {
      return NextResponse.json(
        {
          warning: "Potential duplicate detected",
          duplicate_detection: result,
          message:
            "A student with similar information may already exist. Please review the matches.",
          can_proceed: true,
        },
        { status: 200 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: newStudent, error: insertError } = await supabase
      .from("students")
      .insert({
        phone_number: studentData.phone_number,
        email: studentData.email,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        date_of_birth: studentData.date_of_birth,
        aadhar_number: studentData.aadhar_number,
        extra_fields: studentData.extra_fields,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "Duplicate constraint violation",
            message: "A student with this phone number, email, or AADHAR already exists.",
            details: insertError.message,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to create student",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        student: newStudent,
        duplicate_detection: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/students:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkDuplicates = searchParams.get("check_duplicates") === "true";

    if (!checkDuplicates) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message:
            "Use POST to create students or add check_duplicates=true to check for duplicates",
        },
        { status: 400 },
      );
    }

    const phone = searchParams.get("phone_number");
    const email = searchParams.get("email");
    const firstName = searchParams.get("first_name");
    const lastName = searchParams.get("last_name");
    const aadhar = searchParams.get("aadhar_number");

    if (!phone && !email && !firstName) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          message: "At least one of phone_number, email, or first_name is required",
        },
        { status: 400 },
      );
    }

    const studentData: StudentInput = {
      phone_number: phone || "",
      email: email || "",
      first_name: firstName || "",
      last_name: lastName || null,
      aadhar_number: aadhar || null,
    };

    const detector = await createDuplicateDetector();
    const result = await detector.detectDuplicates(studentData);

    return NextResponse.json({
      duplicate_detection: result,
    });
  } catch (error) {
    console.error("Error in GET /api/students:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function validateStudentInput(body: unknown): string[] {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    errors.push("Request body must be a valid JSON object");
    return errors;
  }

  const data = body as Record<string, unknown>;

  if (!data.phone_number || typeof data.phone_number !== "string") {
    errors.push("phone_number is required and must be a string");
  } else if (!validatePhoneNumber(data.phone_number)) {
    errors.push("phone_number must be a valid Indian mobile number (10 digits starting with 6-9)");
  }

  if (!data.email || typeof data.email !== "string") {
    errors.push("email is required and must be a string");
  } else if (!validateEmail(data.email)) {
    errors.push("email must be a valid email address");
  }

  if (!data.first_name || typeof data.first_name !== "string") {
    errors.push("first_name is required and must be a string");
  } else if (data.first_name.trim().length < 2) {
    errors.push("first_name must be at least 2 characters");
  }

  if (data.aadhar_number !== null && data.aadhar_number !== undefined) {
    if (typeof data.aadhar_number !== "string") {
      errors.push("aadhar_number must be a string");
    } else if (data.aadhar_number.trim() !== "" && !validateAadharNumber(data.aadhar_number)) {
      errors.push("aadhar_number must be a valid 12-digit AADHAR number");
    }
  }

  return errors;
}
