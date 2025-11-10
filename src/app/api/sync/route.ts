import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/middleware/validation";
import {
  phoneNumberSchema,
  emailSchema,
  aadharNumberSchema,
  panNumberSchema,
} from "@/lib/validators/studentValidator";
import {
  genderSchema,
  salutationSchema,
  educationLevelSchema,
  streamSchema,
  certificationTypeSchema,
  dateOfBirthSchema,
} from "@/lib/types/validations";
import { isKnownEnumValue } from "@/lib/validators/studentValidator";
import { studentExtraFieldsSchema } from "@/lib/jsonb/schemaRegistry";

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/sync endpoint.",
  );
}

/**
 * Validates the API key from the request header.
 *
 * SECURITY NOTE: This endpoint synchronizes student data.
 * INTERNAL_API_KEY is REQUIRED in production (enforced at module load).
 * In non-production environments, if INTERNAL_API_KEY is not set, a warning
 * is logged but requests are allowed (for development convenience).
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
        error: "Unauthorized. Valid X-Internal-API-Key header required.",
      },
      { status: 401 },
    );
  }

  return null;
}

const syncDataSchema = z
  .object({
    phone_number: phoneNumberSchema,
    email: emailSchema,
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().optional().nullable(),
    gender: genderSchema,
    date_of_birth: dateOfBirthSchema,
    guardian_phone: phoneNumberSchema.optional().nullable(),
    salutation: salutationSchema,
    father_name: z.string().trim().optional().nullable(),
    mother_name: z.string().trim().optional().nullable(),
    aadhar_number: aadharNumberSchema,
    pan_number: panNumberSchema,
    enrollment_status: z.string().trim().optional().nullable(),
    education_level: educationLevelSchema,
    stream: streamSchema,
    certification_type: certificationTypeSchema,
    extra_fields: studentExtraFieldsSchema.optional().default({}),
  })
  .refine((data) => !data.guardian_phone || data.guardian_phone !== data.phone_number, {
    message: "Guardian phone number must be different from student's phone number",
    path: ["guardian_phone"],
  });

type SyncData = z.infer<typeof syncDataSchema>;

async function handleSync(req: NextRequest, validatedData: SyncData, rawData: unknown) {
  const unknownEnumValues: Record<string, string> = {};
  const rawObj = rawData as Record<string, unknown>;

  if (rawObj.gender && !isKnownEnumValue(String(rawObj.gender), "gender")) {
    unknownEnumValues.original_gender = String(rawObj.gender);
  }

  if (rawObj.salutation && !isKnownEnumValue(String(rawObj.salutation), "salutation")) {
    unknownEnumValues.original_salutation = String(rawObj.salutation);
  }

  if (
    rawObj.education_level &&
    !isKnownEnumValue(String(rawObj.education_level), "educationLevel")
  ) {
    unknownEnumValues.original_education_level = String(rawObj.education_level);
  }

  if (rawObj.stream && !isKnownEnumValue(String(rawObj.stream), "stream")) {
    unknownEnumValues.original_stream = String(rawObj.stream);
  }

  if (
    rawObj.certification_type &&
    !isKnownEnumValue(String(rawObj.certification_type), "certificationType")
  ) {
    unknownEnumValues.original_certification_type = String(rawObj.certification_type);
  }

  return NextResponse.json({
    success: true,
    message: "Data synchronized successfully",
    data: validatedData,
    unknownEnumValues: Object.keys(unknownEnumValues).length > 0 ? unknownEnumValues : undefined,
    note: "This is a placeholder implementation. In production, this would sync data to the database. Unknown enum values were defaulted to known values and are preserved in unknownEnumValues for JSONB storage.",
  });
}

const validatedHandler = withValidation(syncDataSchema)(handleSync);

export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) {
    return authError;
  }
  return validatedHandler(req);
}
