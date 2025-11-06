import { NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/middleware/withValidation";
import {
  safeParseGender,
  safeParseSalutation,
  safeParseEducationLevel,
  safeParseStream,
  safeParseCertificationType,
  isKnownEnumValue,
} from "@/lib/validators/studentValidator";

const optionalEnumInput = z
  .union([z.string().transform((value) => value.trim()), z.null()])
  .optional();

const syncRequestSchema = z
  .object({
    gender: optionalEnumInput,
    salutation: optionalEnumInput,
    education_level: optionalEnumInput,
    stream: optionalEnumInput,
    certification_type: optionalEnumInput,
  })
  .passthrough();

const ENUM_FIELD_CONFIG = [
  {
    field: "gender",
    safeParse: safeParseGender,
    enumType: "gender",
    responseKey: "gender",
    originalKey: "original_gender",
  },
  {
    field: "salutation",
    safeParse: safeParseSalutation,
    enumType: "salutation",
    responseKey: "salutation",
    originalKey: "original_salutation",
  },
  {
    field: "education_level",
    safeParse: safeParseEducationLevel,
    enumType: "educationLevel",
    responseKey: "education_level",
    originalKey: "original_education_level",
  },
  {
    field: "stream",
    safeParse: safeParseStream,
    enumType: "stream",
    responseKey: "stream",
    originalKey: "original_stream",
  },
  {
    field: "certification_type",
    safeParse: safeParseCertificationType,
    enumType: "certificationType",
    responseKey: "certification_type",
    originalKey: "original_certification_type",
  },
] as const;

export const POST = withValidation(syncRequestSchema, async ({ validatedData }) => {
  try {
    const enumValues: Record<string, unknown> = {};
    const unknownEnumValues: Record<string, string> = {};

    ENUM_FIELD_CONFIG.forEach((config) => {
      const value = validatedData[config.field];
      if (value === undefined || value === null) {
        return;
      }

      const parsed = config.safeParse(value);
      if (!parsed.success) {
        return;
      }

      enumValues[config.responseKey] = parsed.data;

      if (typeof value === "string" && !isKnownEnumValue(value, config.enumType)) {
        unknownEnumValues[config.originalKey] = value;
      }
    });

    return NextResponse.json({
      success: true,
      message: "Data validated successfully with enum fallback support",
      validatedData: enumValues,
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
});
