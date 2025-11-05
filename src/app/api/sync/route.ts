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

const syncDataSchema = z.object({
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
  extra_fields: z.record(z.unknown()).optional().default({}),
});

type SyncData = z.infer<typeof syncDataSchema>;

async function handleSync(req: NextRequest, validatedData: SyncData) {
  return NextResponse.json({
    success: true,
    message: "Data synchronized successfully",
    data: validatedData,
    note: "This is a placeholder implementation. In production, this would sync data to the database.",
  });
}

export const POST = withValidation(syncDataSchema)(handleSync);
