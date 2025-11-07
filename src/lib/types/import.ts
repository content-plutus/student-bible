import { z } from "zod";

export type ImportJobStatus = "pending" | "processing" | "completed" | "failed" | "rolled_back";

export interface ImportError {
  row: number;
  column?: string;
  path?: string;
  message: string;
  code?: string;
  value?: unknown;
}

export interface ImportJobMetadata {
  sourceType: "csv" | "json";
  batchSize: number;
  options?: {
    skipDuplicates?: boolean;
    createIfNoDuplicates?: boolean;
    duplicateCheckPreset?: string;
  };
  fileName?: string;
  startedBy?: string;
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  error_summary: ImportError[];
  inserted_student_ids: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  metadata: ImportJobMetadata;
}

export interface ImportOptions {
  batchSize?: number;
  async?: boolean;
  skipDuplicates?: boolean;
  createIfNoDuplicates?: boolean;
  duplicateCheckPreset?: string;
  rollbackOnError?: boolean;
}

export interface ImportResult {
  jobId: string;
  status: ImportJobStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: ImportError[];
  insertedStudentIds: string[];
  completedAt: string | null;
}

export interface BatchImportResult {
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  insertedIds: string[];
}

export const importOptionsSchema = z.object({
  batchSize: z.number().int().min(1).max(500).optional().default(100),
  async: z.boolean().optional().default(false),
  skipDuplicates: z.boolean().optional().default(false),
  createIfNoDuplicates: z.boolean().optional().default(false),
  duplicateCheckPreset: z.string().optional(),
  rollbackOnError: z.boolean().optional().default(false),
});

export type ImportOptionsInput = z.infer<typeof importOptionsSchema>;

