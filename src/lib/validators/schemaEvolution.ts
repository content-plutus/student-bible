import { z } from "zod";
import { BATCH_CODE_PATTERNS, CertificationType } from "./rules";
import {
  JSONBFieldSchema,
  SchemaRegistry,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  JSONBValidationContext,
  JSONBColumnName,
} from "../types/schema-registry";
import {
  batchCodeSchema,
  mentorIdSchema,
  preferredContactTimeSchema,
  deliveryInstructionsSchema,
  landmarkDetailsSchema,
  mockPerformanceSchema,
  examFeedbackSchema,
  participationNotesSchema,
  attentionScoreSchema,
  questionCountSchema,
  scoreBreakdownSchema,
  weakAreasSchema,
  strongAreasSchema,
} from "../types/validations";

export interface JsonbValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export const validateJsonbField = <T>(
  schema: z.ZodType<T>,
  value: unknown,
): JsonbValidationResult<T> => {
  const result = schema.safeParse(value);
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  return {
    success: false,
    error: result.error.issues[0]?.message || "Validation failed",
  };
};

export const validateBatchCodeFromExtraFields = (
  extraFields: Record<string, unknown>,
  certificationType: CertificationType | null | undefined,
): JsonbValidationResult<string> => {
  const batchCode = extraFields.batch_code;

  if (batchCode === null || batchCode === undefined) {
    return {
      success: true,
      data: undefined,
    };
  }

  if (typeof batchCode !== "string") {
    return {
      success: false,
      error: "Batch code must be a string",
    };
  }

  const trimmedBatchCode = batchCode.trim();

  if (trimmedBatchCode.length === 0) {
    return {
      success: false,
      error: "Batch code cannot be empty",
    };
  }

  if (!certificationType) {
    return {
      success: true,
      data: trimmedBatchCode,
    };
  }

  const pattern = BATCH_CODE_PATTERNS[certificationType];
  if (!pattern) {
    return {
      success: false,
      error: `Unknown certification type: ${certificationType}`,
    };
  }

  if (!pattern.pattern.test(trimmedBatchCode)) {
    return {
      success: false,
      error: `${pattern.message}. Example: ${pattern.example}`,
    };
  }

  return {
    success: true,
    data: trimmedBatchCode,
  };
};

export const validateExtraFieldsWithBatchCode = (
  extraFields: Record<string, unknown>,
  certificationType: CertificationType | null | undefined,
): JsonbValidationResult<Record<string, unknown>> => {
  const batchCodeResult = validateBatchCodeFromExtraFields(extraFields, certificationType);

  if (!batchCodeResult.success) {
    return {
      success: false,
      error: batchCodeResult.error,
    };
  }

  return {
    success: true,
    data: extraFields,
  };
};

export const isNullOrEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return true;
  }
  if (value === "NA" || value === "N/A" || value === "na" || value === "n/a") {
    return true;
  }
  return false;
};

export const normalizeJsonbValue = (value: unknown): unknown => {
  if (isNullOrEmpty(value)) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
};

export function validatePartialData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): JsonbValidationResult<z.infer<T>>;
export function validatePartialData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  allowPartial: false,
): JsonbValidationResult<z.infer<T>>;
export function validatePartialData<S extends z.ZodRawShape>(
  schema: z.ZodObject<S>,
  data: unknown,
  allowPartial: true,
): JsonbValidationResult<Partial<z.infer<z.ZodObject<S>>>>;
export function validatePartialData(
  schema: z.ZodTypeAny,
  data: unknown,
  allowPartial?: boolean,
): JsonbValidationResult<unknown> {
  if (allowPartial === true && schema instanceof z.ZodObject) {
    const partialSchema = (schema as z.ZodObject<z.ZodRawShape>).partial();
    return validateJsonbField(partialSchema, data);
  }
  return validateJsonbField(schema, data);
}

export const extractBatchCodeFromExtraFields = (
  extraFields: Record<string, unknown> | null | undefined,
): string | null => {
  if (!extraFields || typeof extraFields !== "object") {
    return null;
  }

  const batchCode = extraFields.batch_code;
  if (typeof batchCode === "string" && batchCode.trim().length > 0) {
    return batchCode.trim();
  }

  return null;
};

export const extractCertificationTypeFromExtraFields = (
  extraFields: Record<string, unknown> | null | undefined,
): CertificationType | null => {
  if (!extraFields || typeof extraFields !== "object") {
    return null;
  }

  const certificationType = extraFields.certification_type;
  if (
    typeof certificationType === "string" &&
    (certificationType === "US CMA" ||
      certificationType === "ACCA" ||
      certificationType === "CFA" ||
      certificationType === "US CPA")
  ) {
    return certificationType as CertificationType;
  }

  return null;
};

export const validateBatchCodeCompatibility = (
  batchCode: string | null | undefined,
  certificationType: CertificationType | null | undefined,
): JsonbValidationResult<boolean> => {
  if (isNullOrEmpty(batchCode)) {
    return {
      success: true,
      data: true,
    };
  }

  if (!certificationType) {
    return {
      success: true,
      data: true,
    };
  }

  const trimmedBatchCode = typeof batchCode === "string" ? batchCode.trim() : "";
  const pattern = BATCH_CODE_PATTERNS[certificationType];

  if (!pattern) {
    return {
      success: false,
      error: `Unknown certification type: ${certificationType}`,
    };
  }

  if (!pattern.pattern.test(trimmedBatchCode)) {
    return {
      success: false,
      error: `Batch code "${trimmedBatchCode}" does not match ${certificationType} format. ${pattern.message}. Example: ${pattern.example}`,
    };
  }

  return {
    success: true,
    data: true,
  };
};

export const createJsonbFieldValidator = <T>(fieldName: string, schema: z.ZodType<T>) => {
  return (extraFields: Record<string, unknown>): JsonbValidationResult<T> => {
    const value = extraFields[fieldName];
    return validateJsonbField(schema, value);
  };
};

export const mergeExtraFields = (
  current: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>,
): Record<string, unknown> => {
  const result = { ...(current || {}) };

  for (const [key, value] of Object.entries(updates)) {
    const normalizedValue = normalizeJsonbValue(value);
    if (normalizedValue === null) {
      delete result[key];
    } else {
      result[key] = normalizedValue;
    }
  }

  return result;
};

export const stripNullValuesFromExtraFields = (
  extraFields: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extraFields)) {
    if (!isNullOrEmpty(value)) {
      result[key] = value;
    }
  }

  return result;
};

let schemaRegistryInstance: SchemaRegistry | null = null;

export const buildSchemaRegistry = (): SchemaRegistry => {
  const registry: SchemaRegistry = new Map();

  registry.set("batch_code", {
    fieldName: "batch_code",
    dataType: "string",
    validation: batchCodeSchema,
    targetColumn: "extra_fields",
    description: "Batch code for student certification enrollment",
    examples: ["ACCA_2024_Batch_5", "CMA_PART1_Batch_3_E"],
  });

  registry.set("mentor_id", {
    fieldName: "mentor_id",
    dataType: "string",
    validation: mentorIdSchema,
    targetColumn: "extra_fields",
    description: "Unique identifier for assigned mentor",
    examples: ["MENTOR_001", "MENTOR_042"],
  });

  registry.set("preferred_contact_time", {
    fieldName: "preferred_contact_time",
    dataType: "string",
    validation: preferredContactTimeSchema,
    targetColumn: "extra_fields",
    description: "Student's preferred time for contact",
    examples: ["Morning (9AM-12PM)", "Evening (6PM-9PM)"],
  });

  registry.set("delivery_instructions", {
    fieldName: "delivery_instructions",
    dataType: "string",
    validation: deliveryInstructionsSchema,
    targetColumn: "additional_data",
    description: "Special instructions for book delivery",
    examples: ["Leave at gate", "Call before delivery"],
  });

  registry.set("landmark_details", {
    fieldName: "landmark_details",
    dataType: "string",
    validation: landmarkDetailsSchema,
    targetColumn: "additional_data",
    description: "Detailed landmark information for address",
    examples: ["Near City Mall", "Opposite Metro Station"],
  });

  registry.set("mock_performance", {
    fieldName: "mock_performance",
    dataType: "object",
    validation: mockPerformanceSchema,
    targetColumn: "metadata",
    description: "Performance data from mock exams",
    examples: [{ score: 85, rank: 12, percentile: 92.5 }],
  });

  registry.set("exam_feedback", {
    fieldName: "exam_feedback",
    dataType: "string",
    validation: examFeedbackSchema,
    targetColumn: "metadata",
    description: "Feedback provided after exam attempt",
    examples: ["Good performance overall", "Needs improvement in theory"],
  });

  registry.set("attention_score", {
    fieldName: "attention_score",
    dataType: "number",
    validation: attentionScoreSchema,
    targetColumn: "extra_metrics",
    description: "Student attention level during session (0-10)",
    examples: [8, 9, 7],
  });

  registry.set("question_count", {
    fieldName: "question_count",
    dataType: "number",
    validation: questionCountSchema,
    targetColumn: "extra_metrics",
    description: "Number of questions asked during session",
    examples: [3, 5, 0],
  });

  registry.set("participation_notes", {
    fieldName: "participation_notes",
    dataType: "string",
    validation: participationNotesSchema,
    targetColumn: "extra_metrics",
    description: "Notes about student participation",
    examples: ["Very active", "Asked insightful questions"],
  });

  registry.set("score_breakdown", {
    fieldName: "score_breakdown",
    dataType: "object",
    validation: scoreBreakdownSchema,
    targetColumn: "analysis_data",
    description: "Detailed breakdown of test scores",
    examples: [{ theory: 45, practical: 40, total: 85 }],
  });

  registry.set("weak_areas", {
    fieldName: "weak_areas",
    dataType: "array",
    validation: weakAreasSchema,
    targetColumn: "analysis_data",
    description: "Topics where student needs improvement",
    examples: [["Financial Accounting", "Cost Management"]],
  });

  registry.set("strong_areas", {
    fieldName: "strong_areas",
    dataType: "array",
    validation: strongAreasSchema,
    targetColumn: "analysis_data",
    description: "Topics where student excels",
    examples: [["Taxation", "Audit"]],
  });

  return registry;
};

export const getSchemaRegistry = (): SchemaRegistry => {
  if (!schemaRegistryInstance) {
    schemaRegistryInstance = buildSchemaRegistry();
  }
  return schemaRegistryInstance;
};

export const lookupFieldSchema = (fieldName: string): JSONBFieldSchema | undefined => {
  const registry = getSchemaRegistry();
  return registry.get(fieldName);
};

export const getFieldsByTargetColumn = (targetColumn: JSONBColumnName): JSONBFieldSchema[] => {
  const registry = getSchemaRegistry();
  const fields: JSONBFieldSchema[] = [];

  for (const [, schema] of registry) {
    if (schema.targetColumn === targetColumn) {
      fields.push(schema);
    }
  }

  return fields;
};

export const getHighFrequencyFields = (threshold: number = 20): JSONBFieldSchema[] => {
  const registry = getSchemaRegistry();
  const fields: JSONBFieldSchema[] = [];

  for (const [, schema] of registry) {
    if (schema.usageFrequency && schema.usageFrequency >= threshold) {
      fields.push(schema);
    }
  }

  return fields.sort((a, b) => (b.usageFrequency || 0) - (a.usageFrequency || 0));
};

export const validateJsonbData = (
  data: Record<string, unknown>,
  context: JSONBValidationContext,
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validatedData: Record<string, unknown> = {};

  const allowUnknownFields = context.allowUnknownFields ?? true;
  const strictMode = context.strictMode ?? false;

  for (const [fieldName, value] of Object.entries(data)) {
    const fieldSchema = lookupFieldSchema(fieldName);

    if (!fieldSchema) {
      if (allowUnknownFields) {
        warnings.push({
          field: fieldName,
          message: `Unknown field "${fieldName}" - not in schema registry`,
          code: "UNKNOWN_FIELD",
        });
        validatedData[fieldName] = value;
      } else if (strictMode) {
        errors.push({
          field: fieldName,
          message: `Unknown field "${fieldName}" is not allowed in strict mode`,
          code: "UNKNOWN_FIELD_STRICT",
        });
      } else {
        validatedData[fieldName] = value;
      }
      continue;
    }

    if (fieldSchema.targetColumn !== context.targetColumn) {
      warnings.push({
        field: fieldName,
        message: `Field "${fieldName}" belongs to column "${fieldSchema.targetColumn}" but is being validated for "${context.targetColumn}"`,
        code: "WRONG_TARGET_COLUMN",
      });
    }

    const validationResult = fieldSchema.validation.safeParse(value);

    if (validationResult.success) {
      validatedData[fieldName] = validationResult.data;
    } else {
      const errorMessage = validationResult.error.issues[0]?.message || "Validation failed";
      errors.push({
        field: fieldName,
        message: errorMessage,
        code: "VALIDATION_FAILED",
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  return {
    success: true,
    data: validatedData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

export const validateStudentExtraFields = (data: unknown): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "extra_fields",
          message: "Extra fields must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "extra_fields",
    allowUnknownFields: true,
    strictMode: false,
  });
};

export const validateAddressAdditionalData = (data: unknown): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "additional_data",
          message: "Additional data must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "additional_data",
    allowUnknownFields: true,
    strictMode: false,
  });
};

export const validateCertificationCustomFields = (
  data: unknown,
  certificationType?: string | null,
): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "custom_fields",
          message: "Custom fields must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "custom_fields",
    allowUnknownFields: true,
    strictMode: false,
    certificationType,
  });
};

export const validateExamAttemptMetadata = (data: unknown): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "metadata",
          message: "Metadata must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "metadata",
    allowUnknownFields: true,
    strictMode: false,
  });
};

export const validateAttendanceExtraMetrics = (data: unknown): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "extra_metrics",
          message: "Extra metrics must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "extra_metrics",
    allowUnknownFields: true,
    strictMode: false,
  });
};

export const validateTestScoreAnalysisData = (data: unknown): ValidationResult => {
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      errors: [
        {
          field: "analysis_data",
          message: "Analysis data must be an object",
          code: "INVALID_TYPE",
        },
      ],
    };
  }

  return validateJsonbData(data as Record<string, unknown>, {
    targetColumn: "analysis_data",
    allowUnknownFields: true,
    strictMode: false,
  });
};
