import { z } from "zod";
import { createEnumWithFallback } from "./validations";

export const genderValues = ["Male", "Female", "Others"] as const;
export const salutationValues = ["Mr", "Ms", "Mrs"] as const;

export type Gender = (typeof genderValues)[number];
export type Salutation = (typeof salutationValues)[number];

const genderSchema = createEnumWithFallback(genderValues, "Others");
const salutationSchema = createEnumWithFallback(salutationValues, null, {
  normalize: (value) => value.replace(/\.$/, ""),
});

export const studentSchema = z
  .object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    phone_number: z
      .string()
      .length(10)
      .regex(/^[6-9][0-9]{9}$/, "Phone number must be a valid Indian mobile number"),
    email: z.string().email().toLowerCase(),
    first_name: z.string().min(1, "First name is required").trim(),
    last_name: z.string().trim().nullable(),
    gender: genderSchema.nullable(),
    date_of_birth: z.string().date().nullable(),
    guardian_phone: z
      .string()
      .length(10)
      .regex(/^[6-9][0-9]{9}$/, "Guardian phone must be a valid Indian mobile number")
      .nullable(),
    salutation: salutationSchema.nullable(),
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
