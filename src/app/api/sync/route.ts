import { NextRequest, NextResponse } from "next/server";
import {
  safeParseGender,
  safeParseSalutation,
  safeParseEducationLevel,
  safeParseStream,
  safeParseCertificationType,
  isKnownEnumValue,
} from "@/lib/validators/studentValidator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validatedData: Record<string, unknown> = {};
    const unknownEnumValues: Record<string, string> = {};

    if (body.gender !== undefined && body.gender !== null) {
      const genderResult = safeParseGender(body.gender);
      if (genderResult.success) {
        validatedData.gender = genderResult.data;
        if (!isKnownEnumValue(body.gender, "gender")) {
          unknownEnumValues.original_gender = body.gender;
        }
      }
    }

    if (body.salutation !== undefined && body.salutation !== null) {
      const salutationResult = safeParseSalutation(body.salutation);
      if (salutationResult.success) {
        validatedData.salutation = salutationResult.data;
        if (!isKnownEnumValue(body.salutation, "salutation")) {
          unknownEnumValues.original_salutation = body.salutation;
        }
      }
    }

    if (body.education_level !== undefined && body.education_level !== null) {
      const educationLevelResult = safeParseEducationLevel(body.education_level);
      if (educationLevelResult.success) {
        validatedData.education_level = educationLevelResult.data;
        if (!isKnownEnumValue(body.education_level, "educationLevel")) {
          unknownEnumValues.original_education_level = body.education_level;
        }
      }
    }

    if (body.stream !== undefined && body.stream !== null) {
      const streamResult = safeParseStream(body.stream);
      if (streamResult.success) {
        validatedData.stream = streamResult.data;
        if (!isKnownEnumValue(body.stream, "stream")) {
          unknownEnumValues.original_stream = body.stream;
        }
      }
    }

    if (body.certification_type !== undefined && body.certification_type !== null) {
      const certificationTypeResult = safeParseCertificationType(body.certification_type);
      if (certificationTypeResult.success) {
        validatedData.certification_type = certificationTypeResult.data;
        if (!isKnownEnumValue(body.certification_type, "certificationType")) {
          unknownEnumValues.original_certification_type = body.certification_type;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data validated successfully with enum fallback support",
      validatedData,
      unknownEnumValues: Object.keys(unknownEnumValues).length > 0 ? unknownEnumValues : undefined,
      note: "Unknown enum values were defaulted to known values. Original values are preserved in unknownEnumValues for JSONB storage.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
