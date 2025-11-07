import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { studentInsertSchema } from "@/lib/types/student";
import { validateJsonbPayload } from "@/lib/jsonb/schemaRegistry";
import {
  validateBatchCodeFromExtraFields,
  stripNullValuesFromExtraFields,
} from "@/lib/validators/schemaEvolution";
import { detectDuplicates } from "@/lib/validators/duplicateDetector";
import { DEFAULT_MATCHING_CRITERIA, getPreset } from "@/lib/validators/matchingRules";
import { CertificationType } from "@/lib/validators/rules";
import type {
  ImportJobStatus,
  ImportError,
  ImportOptions,
  BatchImportResult,
  ImportJobMetadata,
} from "@/lib/types/import";

export interface ValidatedStudentRecord {
  data: z.infer<typeof studentInsertSchema>;
  rowNumber: number;
}

export interface ValidationResult {
  valid: ValidatedStudentRecord[];
  errors: ImportError[];
}

export class BatchImportService {
  private supabase: SupabaseClient;
  private options: Required<ImportOptions>;

  constructor(supabase: SupabaseClient, options: ImportOptions = {}) {
    this.supabase = supabase;
    this.options = {
      batchSize: options.batchSize ?? 100,
      async: options.async ?? false,
      skipDuplicates: options.skipDuplicates ?? false,
      createIfNoDuplicates: options.createIfNoDuplicates ?? false,
      duplicateCheckPreset: options.duplicateCheckPreset,
      rollbackOnError: options.rollbackOnError ?? false,
    };
  }

  /**
   * Main orchestration function for batch import
   */
  async processBatchImport(
    records: Array<Record<string, unknown>>,
    jobId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: ImportJobMetadata,
  ): Promise<{ success: boolean; errors: ImportError[] }> {
    try {
      await this.updateJobStatus(jobId, "processing");

      const totalRecords = records.length;
      await this.updateJobProgress(jobId, {
        total_records: totalRecords,
        processed_records: 0,
        successful_records: 0,
        failed_records: 0,
      });

      const batches = this.createBatches(records, this.options.batchSize);
      const allErrors: ImportError[] = [];
      const allInsertedIds: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResult = await this.processBatch(batch, i + 1, jobId);

        allErrors.push(...batchResult.errors);
        allInsertedIds.push(...batchResult.insertedIds);

        const processedRecords = Math.min((i + 1) * this.options.batchSize, totalRecords);
        await this.updateJobProgress(jobId, {
          processed_records: processedRecords,
          successful_records: allInsertedIds.length,
          failed_records: allErrors.length,
          inserted_student_ids: allInsertedIds,
          error_summary: allErrors,
        });

        if (
          this.options.rollbackOnError &&
          batchResult.errorCount > 0 &&
          batchResult.successCount === 0
        ) {
          await this.rollbackImport(jobId, allInsertedIds);
          await this.updateJobStatus(jobId, "rolled_back");
          return {
            success: false,
            errors: allErrors,
          };
        }
      }

      const finalStatus: ImportJobStatus =
        allErrors.length === 0 ? "completed" : allInsertedIds.length > 0 ? "completed" : "failed";

      await this.updateJobStatus(jobId, finalStatus, {
        completed_at: new Date().toISOString(),
      });

      return {
        success: finalStatus === "completed",
        errors: allErrors,
      };
    } catch (error) {
      await this.updateJobStatus(jobId, "failed");
      throw error;
    }
  }

  /**
   * Validate a batch of records
   */
  async validateBatch(
    records: Array<Record<string, unknown>>,
    startRowNumber: number,
  ): Promise<ValidationResult> {
    const valid: ValidatedStudentRecord[] = [];
    const errors: ImportError[] = [];

    for (let i = 0; i < records.length; i++) {
      const rowNumber = startRowNumber + i;
      const record = records[i];

      try {
        const validatedData = studentInsertSchema.parse(record);

        const extraFields = validatedData.extra_fields ?? {};

        const registryValidation = validateJsonbPayload("students", "extra_fields", extraFields, {
          allowPartial: false,
          stripUnknownKeys: false,
        });

        if (!registryValidation.success) {
          errors.push(
            ...(registryValidation.errors?.map((err) => ({
              row: rowNumber,
              path: err.path,
              message: err.message,
              code: err.code,
              value: err.value,
            })) ?? [
              {
                row: rowNumber,
                message: "Extra fields validation failed",
                code: "validation_error",
              },
            ]),
          );
          continue;
        }

        const sanitizedExtraFields = stripNullValuesFromExtraFields(
          (registryValidation.data as Record<string, unknown>) ?? extraFields,
        );

        const certificationType = sanitizedExtraFields.certification_type as
          | CertificationType
          | null
          | undefined;

        const batchValidation = validateBatchCodeFromExtraFields(
          sanitizedExtraFields,
          certificationType,
        );

        if (!batchValidation.success) {
          errors.push({
            row: rowNumber,
            path: "extra_fields.batch_code",
            message: batchValidation.error || "Invalid batch_code",
            code: "invalid_batch_code",
          });
          continue;
        }

        valid.push({
          data: {
            ...validatedData,
            extra_fields: sanitizedExtraFields,
          },
          rowNumber,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(
            ...error.errors.map((e) => ({
              row: rowNumber,
              path: e.path.join("."),
              message: e.message,
              code: e.code,
              value: e.path.reduce((obj, key) => obj?.[key], record as Record<string, unknown>),
            })),
          );
        } else {
          errors.push({
            row: rowNumber,
            message: error instanceof Error ? error.message : "Validation error",
            code: "validation_error",
          });
        }
      }
    }

    return { valid, errors };
  }

  /**
   * Process a single batch: validate, check duplicates, and insert
   */
  private async processBatch(
    records: Array<Record<string, unknown>>,
    batchNumber: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jobId: string,
  ): Promise<BatchImportResult> {
    const startRowNumber = (batchNumber - 1) * this.options.batchSize + 2;
    const validationResult = await this.validateBatch(records, startRowNumber);

    const errors: ImportError[] = [...validationResult.errors];
    const insertedIds: string[] = [];

    if (validationResult.valid.length === 0) {
      return {
        successCount: 0,
        errorCount: errors.length,
        errors,
        insertedIds: [],
      };
    }

    const criteria = this.options.duplicateCheckPreset
      ? getPreset(this.options.duplicateCheckPreset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : DEFAULT_MATCHING_CRITERIA;

    for (const validatedRecord of validationResult.valid) {
      try {
        if (!this.options.skipDuplicates) {
          const duplicateResult = await detectDuplicates(
            this.supabase,
            validatedRecord.data,
            criteria,
          );

          if (duplicateResult.hasPotentialDuplicates && !this.options.createIfNoDuplicates) {
            errors.push({
              row: validatedRecord.rowNumber,
              message: "Potential duplicate found",
              code: "duplicate_detected",
              value: duplicateResult.matches[0]?.student.id,
            });
            continue;
          }
        }

        const insertResult = await this.insertStudent(validatedRecord.data);
        if (insertResult.success && insertResult.id) {
          insertedIds.push(insertResult.id);
        } else {
          errors.push({
            row: validatedRecord.rowNumber,
            message: insertResult.error || "Failed to insert student",
            code: "insert_error",
          });
        }
      } catch (error) {
        errors.push({
          row: validatedRecord.rowNumber,
          message: error instanceof Error ? error.message : "Unknown error",
          code: "processing_error",
        });
      }
    }

    return {
      successCount: insertedIds.length,
      errorCount: errors.length,
      errors,
      insertedIds,
    };
  }

  /**
   * Insert a single student record
   */
  private async insertStudent(
    data: z.infer<typeof studentInsertSchema>,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: inserted, error } = await this.supabase
        .from("students")
        .insert(data)
        .select("id")
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        id: inserted?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Insert a batch of validated records within a transaction
   */
  async insertBatch(validatedRecords: ValidatedStudentRecord[]): Promise<BatchImportResult> {
    const errors: ImportError[] = [];
    const insertedIds: string[] = [];

    for (const record of validatedRecords) {
      const result = await this.insertStudent(record.data);
      if (result.success && result.id) {
        insertedIds.push(result.id);
      } else {
        errors.push({
          row: record.rowNumber,
          message: result.error || "Failed to insert student",
          code: "insert_error",
        });
      }
    }

    return {
      successCount: insertedIds.length,
      errorCount: errors.length,
      errors,
      insertedIds,
    };
  }

  /**
   * Rollback an import by deleting inserted students
   */
  async rollbackImport(jobId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) {
      return;
    }

    try {
      const { error } = await this.supabase.from("students").delete().in("id", studentIds);

      if (error) {
        throw new Error(`Rollback failed: ${error.message}`);
      }

      await this.updateJobStatus(jobId, "rolled_back");
    } catch (error) {
      console.error("Error during rollback:", error);
      throw error;
    }
  }

  /**
   * Update import job progress
   */
  async updateJobProgress(
    jobId: string,
    updates: {
      total_records?: number;
      processed_records?: number;
      successful_records?: number;
      failed_records?: number;
      inserted_student_ids?: string[];
      error_summary?: ImportError[];
    },
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      ...updates,
    };

    if (updates.inserted_student_ids) {
      updateData.inserted_student_ids = updates.inserted_student_ids;
    }

    if (updates.error_summary) {
      updateData.error_summary = updates.error_summary;
    }

    const { error } = await this.supabase.from("import_jobs").update(updateData).eq("id", jobId);

    if (error) {
      console.error("Error updating job progress:", error);
      throw new Error(`Failed to update job progress: ${error.message}`);
    }
  }

  /**
   * Update import job status
   */
  async updateJobStatus(
    jobId: string,
    status: ImportJobStatus,
    additionalUpdates?: { completed_at?: string },
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
    };

    if (additionalUpdates?.completed_at) {
      updateData.completed_at = additionalUpdates.completed_at;
    }

    const { error } = await this.supabase.from("import_jobs").update(updateData).eq("id", jobId);

    if (error) {
      console.error("Error updating job status:", error);
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  /**
   * Create batches from records
   */
  private createBatches<T>(records: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    return batches;
  }
}

export function createBatchImportService(
  supabase: SupabaseClient,
  options?: ImportOptions,
): BatchImportService {
  return new BatchImportService(supabase, options);
}
