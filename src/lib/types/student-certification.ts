import { z } from "zod";

export const certificationStatusEnum = z.enum([
  "planned",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
]);

export const studentCertificationSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  certification_id: z.string().uuid(),
  enrollment_date: z.string().date().nullable(),
  status: certificationStatusEnum.default("planned"),
  progress_papers_completed: z.number().int().min(0).default(0),
  total_papers_target: z.number().int().min(0).nullable(),
  projected_exam: z.string().date().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const studentCertificationInsertSchema = studentCertificationSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const studentCertificationUpdateSchema = studentCertificationInsertSchema.partial();

export const studentCertificationPartialSchema = studentCertificationSchema.partial();

export type CertificationStatus = z.infer<typeof certificationStatusEnum>;
export type StudentCertification = z.infer<typeof studentCertificationSchema>;
export type StudentCertificationInsert = z.infer<typeof studentCertificationInsertSchema>;
export type StudentCertificationUpdate = z.infer<typeof studentCertificationUpdateSchema>;
export type StudentCertificationPartial = z.infer<typeof studentCertificationPartialSchema>;
