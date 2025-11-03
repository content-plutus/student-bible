import { z } from "zod";

export const examAttemptSchema = z.object({
  id: z.string().uuid(),
  student_certification_id: z.string().uuid(),
  paper_code: z.string().min(1, "Paper code is required"),
  attempt_date: z.string().date().nullable(),
  result: z.string().nullable(),
  score: z.number().min(0).max(999.99).nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const examAttemptInsertSchema = examAttemptSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const examAttemptUpdateSchema = examAttemptInsertSchema.partial();

export const examAttemptPartialSchema = examAttemptSchema.partial();

export type ExamAttempt = z.infer<typeof examAttemptSchema>;
export type ExamAttemptInsert = z.infer<typeof examAttemptInsertSchema>;
export type ExamAttemptUpdate = z.infer<typeof examAttemptUpdateSchema>;
export type ExamAttemptPartial = z.infer<typeof examAttemptPartialSchema>;
