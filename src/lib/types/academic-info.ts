import { z } from "zod";
import { createEnumWithFallback } from "./validations";

const currentYear = new Date().getFullYear();
export const stream12thValues = ["Commerce", "Arts", "Science", "Other"] as const;
export type Stream12th = (typeof stream12thValues)[number];
const stream12thSchema = createEnumWithFallback(stream12thValues, "Other");

export const academicInfoSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  highest_education_level: z.string().nullable(),
  college_name: z.string().trim().nullable(),
  university_name: z.string().trim().nullable(),
  major_subject: z.string().trim().nullable(),
  passing_year: z
    .number()
    .int()
    .min(1950, "Passing year must be 1950 or later")
    .max(currentYear + 5, `Passing year cannot be more than ${currentYear + 5}`)
    .nullable(),
  stream_12th: stream12thSchema.nullable(),
  grades: z.record(z.string(), z.unknown()).nullable(),
  extra_fields: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const academicInfoInsertSchema = academicInfoSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const academicInfoUpdateSchema = academicInfoInsertSchema.partial();

export const academicInfoPartialSchema = academicInfoSchema.partial();

export type AcademicInfo = z.infer<typeof academicInfoSchema>;
export type AcademicInfoInsert = z.infer<typeof academicInfoInsertSchema>;
export type AcademicInfoUpdate = z.infer<typeof academicInfoUpdateSchema>;
export type AcademicInfoPartial = z.infer<typeof academicInfoPartialSchema>;
