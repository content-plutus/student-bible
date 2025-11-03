import { z } from "zod";
import {
  phoneNumberSchema,
  guardianPhoneSchema,
  emailSchema,
} from "../validators/studentValidator";

export const studentSchema = z
  .object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    phone_number: phoneNumberSchema,
    email: emailSchema,
    first_name: z.string().min(1, "First name is required").trim(),
    last_name: z.string().trim().nullable(),
    gender: z.string().nullable(),
    date_of_birth: z.string().date().nullable(),
    guardian_phone: guardianPhoneSchema,
    salutation: z.string().nullable(),
    father_name: z.string().trim().nullable(),
    mother_name: z.string().trim().nullable(),
    aadhar_number: z
      .string()
      .length(12)
      .regex(/^[0-9]{12}$/, "AADHAR number must be exactly 12 digits")
      .nullable(),
    pan_number: z
      .string()
      .length(10)
      .regex(
        /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        "PAN number must follow format: 5 letters, 4 digits, 1 letter",
      )
      .nullable(),
    enrollment_status: z.string().nullable(),
    extra_fields: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(
    (data) => {
      if (data.guardian_phone && data.phone_number) {
        return data.guardian_phone !== data.phone_number;
      }
      return true;
    },
    {
      message: "Guardian phone number must be different from student phone number",
      path: ["guardian_phone"],
    },
  );

export const studentInsertSchema = studentSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const studentUpdateSchema = studentInsertSchema.partial();

export const studentPartialSchema = studentSchema.partial();

export type Student = z.infer<typeof studentSchema>;
export type StudentInsert = z.infer<typeof studentInsertSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type StudentPartial = z.infer<typeof studentPartialSchema>;
