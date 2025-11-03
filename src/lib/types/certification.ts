import { z } from 'zod';

export const certificationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1, 'Certification code is required'),
  name: z.string().min(1, 'Certification name is required'),
  description: z.string().nullable(),
  total_papers: z.number().int().positive().nullable(),
  organization: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const certificationInsertSchema = certificationSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const certificationUpdateSchema = certificationInsertSchema.partial();

export const certificationPartialSchema = certificationSchema.partial();

export type Certification = z.infer<typeof certificationSchema>;
export type CertificationInsert = z.infer<typeof certificationInsertSchema>;
export type CertificationUpdate = z.infer<typeof certificationUpdateSchema>;
export type CertificationPartial = z.infer<typeof certificationPartialSchema>;
