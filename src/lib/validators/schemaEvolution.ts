import { z } from "zod";
import { BATCH_CODE_PATTERNS, CertificationType } from "./rules";

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

export const validatePartialData = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  allowPartial: boolean = true,
): JsonbValidationResult<T> => {
  if (allowPartial && schema instanceof z.ZodObject) {
    const partialSchema = schema.partial();
    return validateJsonbField(partialSchema, data) as JsonbValidationResult<T>;
  }
  return validateJsonbField(schema, data);
};

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
