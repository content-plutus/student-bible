import { NextRequest, NextResponse } from "next/server";
import {
  safeParseGender,
  safeParseSalutation,
  safeParseEducationLevel,
  safeParseStream,
  safeParseCertificationType,
  isKnownEnumValue,
} from "@/lib/validators/studentValidator";
import {
  prepareJsonbDataForSubmission,
  formatValidationErrors,
  formatValidationWarnings,
} from "@/lib/utils/jsonbHelpers";
import { JSONBColumnName } from "@/lib/types/schema-registry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validatedData: Record<string, unknown> = {};
    const unknownEnumValues: Record<string, string> = {};
    const jsonbFields: Record<string, Record<string, unknown>> = {};
    const validationWarnings: string[] = [];

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

    const JSONB_FIELDS: JSONBColumnName[] = [
      "extra_fields",
      "additional_data",
      "custom_fields",
      "metadata",
      "extra_metrics",
      "analysis_data",
      "raw_data",
    ];

    for (const fieldName of JSONB_FIELDS) {
      if (body[fieldName] && typeof body[fieldName] === "object") {
        const validation = prepareJsonbDataForSubmission(
          body[fieldName] as Record<string, unknown>,
          fieldName,
        );

        if (validation.validationResult.success) {
          jsonbFields[fieldName] = validation.preparedData || {};

          if (validation.validationResult.warnings) {
            validationWarnings.push(...formatValidationWarnings(validation.validationResult));
          }
        } else {
          const errors = formatValidationErrors(validation.validationResult);
          return NextResponse.json(
            {
              success: false,
              error: `Validation failed for ${fieldName}`,
              validationErrors: errors,
            },
            { status: 400 },
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data validated successfully with enum fallback support and JSONB validation",
      validatedData,
      jsonbFields: Object.keys(jsonbFields).length > 0 ? jsonbFields : undefined,
      unknownEnumValues: Object.keys(unknownEnumValues).length > 0 ? unknownEnumValues : undefined,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      note: "Unknown enum values were defaulted to known values. Original values are preserved in unknownEnumValues for JSONB storage. JSONB fields have been validated against the schema registry.",
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
