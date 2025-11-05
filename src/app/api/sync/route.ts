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

    if (body.extra_fields && typeof body.extra_fields === "object") {
      const extraFieldsValidation = prepareJsonbDataForSubmission(
        body.extra_fields as Record<string, unknown>,
        "extra_fields" as JSONBColumnName,
      );

      if (extraFieldsValidation.validationResult.success) {
        jsonbFields.extra_fields = extraFieldsValidation.preparedData || {};

        if (extraFieldsValidation.validationResult.warnings) {
          validationWarnings.push(
            ...formatValidationWarnings(extraFieldsValidation.validationResult),
          );
        }
      } else {
        const errors = formatValidationErrors(extraFieldsValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for extra_fields",
            validationErrors: errors,
          },
          { status: 400 },
        );
      }
    }

    if (body.additional_data && typeof body.additional_data === "object") {
      const additionalDataValidation = prepareJsonbDataForSubmission(
        body.additional_data as Record<string, unknown>,
        "additional_data" as JSONBColumnName,
      );

      if (additionalDataValidation.validationResult.success) {
        jsonbFields.additional_data = additionalDataValidation.preparedData || {};

        if (additionalDataValidation.validationResult.warnings) {
          validationWarnings.push(
            ...formatValidationWarnings(additionalDataValidation.validationResult),
          );
        }
      } else {
        const errors = formatValidationErrors(additionalDataValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for additional_data",
            validationErrors: errors,
          },
          { status: 400 },
        );
      }
    }

    if (body.custom_fields && typeof body.custom_fields === "object") {
      const customFieldsValidation = prepareJsonbDataForSubmission(
        body.custom_fields as Record<string, unknown>,
        "custom_fields" as JSONBColumnName,
      );

      if (customFieldsValidation.validationResult.success) {
        jsonbFields.custom_fields = customFieldsValidation.preparedData || {};

        if (customFieldsValidation.validationResult.warnings) {
          validationWarnings.push(
            ...formatValidationWarnings(customFieldsValidation.validationResult),
          );
        }
      } else {
        const errors = formatValidationErrors(customFieldsValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for custom_fields",
            validationErrors: errors,
          },
          { status: 400 },
        );
      }
    }

    if (body.metadata && typeof body.metadata === "object") {
      const metadataValidation = prepareJsonbDataForSubmission(
        body.metadata as Record<string, unknown>,
        "metadata" as JSONBColumnName,
      );

      if (metadataValidation.validationResult.success) {
        jsonbFields.metadata = metadataValidation.preparedData || {};

        if (metadataValidation.validationResult.warnings) {
          validationWarnings.push(...formatValidationWarnings(metadataValidation.validationResult));
        }
      } else {
        const errors = formatValidationErrors(metadataValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for metadata",
            validationErrors: errors,
          },
          { status: 400 },
        );
      }
    }

    if (body.extra_metrics && typeof body.extra_metrics === "object") {
      const extraMetricsValidation = prepareJsonbDataForSubmission(
        body.extra_metrics as Record<string, unknown>,
        "extra_metrics" as JSONBColumnName,
      );

      if (extraMetricsValidation.validationResult.success) {
        jsonbFields.extra_metrics = extraMetricsValidation.preparedData || {};

        if (extraMetricsValidation.validationResult.warnings) {
          validationWarnings.push(
            ...formatValidationWarnings(extraMetricsValidation.validationResult),
          );
        }
      } else {
        const errors = formatValidationErrors(extraMetricsValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for extra_metrics",
            validationErrors: errors,
          },
          { status: 400 },
        );
      }
    }

    if (body.analysis_data && typeof body.analysis_data === "object") {
      const analysisDataValidation = prepareJsonbDataForSubmission(
        body.analysis_data as Record<string, unknown>,
        "analysis_data" as JSONBColumnName,
      );

      if (analysisDataValidation.validationResult.success) {
        jsonbFields.analysis_data = analysisDataValidation.preparedData || {};

        if (analysisDataValidation.validationResult.warnings) {
          validationWarnings.push(
            ...formatValidationWarnings(analysisDataValidation.validationResult),
          );
        }
      } else {
        const errors = formatValidationErrors(analysisDataValidation.validationResult);
        return NextResponse.json(
          {
            success: false,
            error: "Validation failed for analysis_data",
            validationErrors: errors,
          },
          { status: 400 },
        );
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
