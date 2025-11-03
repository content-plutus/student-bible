import { z } from 'zod';

export const formSubmissionSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid().nullable(),
  form_name: z.string().min(1, 'Form name is required'),
  submission_id: z.string().nullable(),
  submitted_at: z.string().datetime().nullable(),
  raw_data: z.record(z.string(), z.unknown()),
  processed: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const formSubmissionInsertSchema = formSubmissionSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const formSubmissionUpdateSchema = formSubmissionInsertSchema.partial();

export const formSubmissionPartialSchema = formSubmissionSchema.partial();

export type FormSubmission = z.infer<typeof formSubmissionSchema>;
export type FormSubmissionInsert = z.infer<typeof formSubmissionInsertSchema>;
export type FormSubmissionUpdate = z.infer<typeof formSubmissionUpdateSchema>;
export type FormSubmissionPartial = z.infer<typeof formSubmissionPartialSchema>;
