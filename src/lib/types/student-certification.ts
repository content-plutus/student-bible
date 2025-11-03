import { z } from "zod";
import { createEnumWithFallback } from "./validations";

export const certificationStatusValues = [
  "planned",
  "in_progress",
  "completed",
  "on_hold",
  "dropped",
] as const;

export const certificationStatusEnum = z.enum(certificationStatusValues);
const certificationStatusSchema = createEnumWithFallback(certificationStatusValues, "planned");

export const studentCertificationSchema = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    certification_id: z.string().uuid(),
    enrollment_date: z.string().date().nullable(),
    status: certificationStatusSchema.default("planned"),
    progress_papers_completed: z.number().int().min(0).default(0),
    total_papers_target: z.number().int().min(0).nullable(),
    batch_code: z.string().trim().nullable().optional(),
    projected_exam: z.string().date().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).default({}),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .superRefine((data, ctx) => {
    const raw = data.batch_code;
    if (raw === undefined || raw === null) {
      return;
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch code cannot be empty",
        path: ["batch_code"],
      });
      return;
    }

    const pattern = /^[A-Z]{2,5}_[A-Z0-9]{1,10}_(Sec[A-Z]|Batch|Group)_\d{1,2}_[A-Z]$/;
    if (!pattern.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Batch code must follow format: PREFIX_IDENTIFIER_(SecX|Batch|Group)_<number>_<letter>",
        path: ["batch_code"],
      });
      return;
    }

    const parts = trimmed.split("_");
    const prefix = parts[0];
    const identifier = parts[1];

    const expectedPrefix = data.custom_fields?.batch_prefix;
    const expectedIdentifier = data.custom_fields?.batch_identifier;

    if (expectedPrefix && expectedPrefix !== prefix) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Batch prefix must match ${expectedPrefix}`,
        path: ["batch_code"],
      });
    }

    if (expectedIdentifier && expectedIdentifier !== identifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Batch identifier must match ${expectedIdentifier}`,
        path: ["batch_code"],
      });
    }
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
