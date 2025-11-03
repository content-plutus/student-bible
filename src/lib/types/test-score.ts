import { z } from "zod";

export const testScoreSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  assessment_name: z.string().min(1, "Assessment name is required"),
  assessment_type: z.string().nullable(),
  assessment_date: z.string().date().nullable(),
  score: z.number().min(0).max(999.99).nullable(),
  max_score: z.number().min(0).max(999.99).nullable(),
  weighted_score: z.number().min(0).max(999.99).nullable(),
  analysis_data: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const testScoreInsertSchema = testScoreSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const testScoreUpdateSchema = testScoreInsertSchema.partial();

export const testScorePartialSchema = testScoreSchema.partial();

export type TestScore = z.infer<typeof testScoreSchema>;
export type TestScoreInsert = z.infer<typeof testScoreInsertSchema>;
export type TestScoreUpdate = z.infer<typeof testScoreUpdateSchema>;
export type TestScorePartial = z.infer<typeof testScorePartialSchema>;
