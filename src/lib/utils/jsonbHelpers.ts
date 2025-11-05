import { ValidationResult, JSONBColumnName, JSONBFieldSchema } from "../types/schema-registry";
import {
  getSchemaRegistry,
  lookupFieldSchema,
  getFieldsByTargetColumn,
  validateStudentExtraFields,
  validateAddressAdditionalData,
  validateCertificationCustomFields,
  validateExamAttemptMetadata,
  validateAttendanceExtraMetrics,
  validateTestScoreAnalysisData,
  isNullOrEmpty,
  normalizeJsonbValue,
  mergeExtraFields,
  stripNullValuesFromExtraFields,
} from "../validators/schemaEvolution";

export const validateJsonbFieldByName = (fieldName: string, value: unknown): ValidationResult => {
  const fieldSchema = lookupFieldSchema(fieldName);

  if (!fieldSchema) {
    return {
      success: false,
      errors: [
        {
          field: fieldName,
          message: `Field "${fieldName}" not found in schema registry`,
          code: "FIELD_NOT_FOUND",
        },
      ],
    };
  }

  const validationResult = fieldSchema.validation.safeParse(value);

  if (validationResult.success) {
    return {
      success: true,
      data: validationResult.data,
    };
  }

  return {
    success: false,
    errors: [
      {
        field: fieldName,
        message: validationResult.error.issues[0]?.message || "Validation failed",
        code: "VALIDATION_FAILED",
      },
    ],
  };
};

export const validateJsonbFieldsByColumn = (
  data: Record<string, unknown>,
  targetColumn: JSONBColumnName,
): ValidationResult => {
  switch (targetColumn) {
    case "extra_fields":
      return validateStudentExtraFields(data);
    case "additional_data":
      return validateAddressAdditionalData(data);
    case "custom_fields":
      return validateCertificationCustomFields(data);
    case "metadata":
      return validateExamAttemptMetadata(data);
    case "extra_metrics":
      return validateAttendanceExtraMetrics(data);
    case "analysis_data":
      return validateTestScoreAnalysisData(data);
    case "raw_data":
      return {
        success: true,
        data,
      };
    default:
      return {
        success: false,
        errors: [
          {
            field: "targetColumn",
            message: `Unknown target column: ${targetColumn}`,
            code: "UNKNOWN_COLUMN",
          },
        ],
      };
  }
};

export const getFieldSchemaInfo = (fieldName: string): JSONBFieldSchema | null => {
  return lookupFieldSchema(fieldName) || null;
};

export const getFieldsForColumn = (targetColumn: JSONBColumnName): JSONBFieldSchema[] => {
  return getFieldsByTargetColumn(targetColumn);
};

export const getAllRegisteredFields = (): JSONBFieldSchema[] => {
  const registry = getSchemaRegistry();
  return Array.from(registry.values());
};

export const isFieldRegistered = (fieldName: string): boolean => {
  return lookupFieldSchema(fieldName) !== undefined;
};

export const getFieldTargetColumn = (fieldName: string): JSONBColumnName | null => {
  const fieldSchema = lookupFieldSchema(fieldName);
  return fieldSchema ? fieldSchema.targetColumn : null;
};

export const cleanJsonbData = (data: Record<string, unknown>): Record<string, unknown> => {
  return stripNullValuesFromExtraFields(data);
};

export const mergeJsonbData = (
  current: Record<string, unknown> | null | undefined,
  updates: Record<string, unknown>,
): Record<string, unknown> => {
  return mergeExtraFields(current, updates);
};

export const normalizeJsonbField = (value: unknown): unknown => {
  return normalizeJsonbValue(value);
};

export const isJsonbFieldEmpty = (value: unknown): boolean => {
  return isNullOrEmpty(value);
};

export const extractKnownFields = (
  data: Record<string, unknown>,
  targetColumn: JSONBColumnName,
): {
  knownFields: Record<string, unknown>;
  unknownFields: Record<string, unknown>;
} => {
  const fieldsForColumn = getFieldsByTargetColumn(targetColumn);
  const knownFieldNames = new Set(fieldsForColumn.map((f) => f.fieldName));

  const knownFields: Record<string, unknown> = {};
  const unknownFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (knownFieldNames.has(key)) {
      knownFields[key] = value;
    } else {
      unknownFields[key] = value;
    }
  }

  return { knownFields, unknownFields };
};

export const validateAndCleanJsonbData = (
  data: Record<string, unknown>,
  targetColumn: JSONBColumnName,
): ValidationResult => {
  const cleanedData = cleanJsonbData(data);
  return validateJsonbFieldsByColumn(cleanedData, targetColumn);
};

export const prepareJsonbDataForSubmission = (
  data: Record<string, unknown>,
  targetColumn: JSONBColumnName,
): {
  validationResult: ValidationResult;
  preparedData: Record<string, unknown> | null;
} => {
  const cleanedData = cleanJsonbData(data);
  const validationResult = validateJsonbFieldsByColumn(cleanedData, targetColumn);

  if (validationResult.success) {
    return {
      validationResult,
      preparedData: validationResult.data as Record<string, unknown>,
    };
  }

  return {
    validationResult,
    preparedData: null,
  };
};

export const getFieldValidationExample = (fieldName: string): unknown[] | null => {
  const fieldSchema = lookupFieldSchema(fieldName);
  return fieldSchema?.examples || null;
};

export const getFieldDescription = (fieldName: string): string | null => {
  const fieldSchema = lookupFieldSchema(fieldName);
  return fieldSchema?.description || null;
};

export const getFieldDataType = (fieldName: string): string | null => {
  const fieldSchema = lookupFieldSchema(fieldName);
  return fieldSchema?.dataType || null;
};

export const getFieldUsageFrequency = (fieldName: string): number | null => {
  const fieldSchema = lookupFieldSchema(fieldName);
  return fieldSchema?.usageFrequency || null;
};

export const shouldPromoteToStructuredColumn = (
  fieldName: string,
  threshold: number = 20,
): boolean => {
  const usageFrequency = getFieldUsageFrequency(fieldName);
  return usageFrequency !== null && usageFrequency >= threshold;
};

export const getHighFrequencyFieldsForPromotion = (threshold: number = 20): JSONBFieldSchema[] => {
  const allFields = getAllRegisteredFields();
  return allFields
    .filter((field) => field.usageFrequency && field.usageFrequency >= threshold)
    .sort((a, b) => (b.usageFrequency || 0) - (a.usageFrequency || 0));
};

export const formatValidationErrors = (result: ValidationResult): string[] => {
  if (result.success || !result.errors) {
    return [];
  }

  return result.errors.map((error) => `${error.field}: ${error.message}`);
};

export const formatValidationWarnings = (result: ValidationResult): string[] => {
  if (!result.warnings) {
    return [];
  }

  return result.warnings.map((warning) => `${warning.field}: ${warning.message}`);
};

export const hasValidationErrors = (result: ValidationResult): boolean => {
  return !result.success && result.errors !== undefined && result.errors.length > 0;
};

export const hasValidationWarnings = (result: ValidationResult): boolean => {
  return result.warnings !== undefined && result.warnings.length > 0;
};

export {
  validateStudentExtraFields,
  validateAddressAdditionalData,
  validateCertificationCustomFields,
  validateExamAttemptMetadata,
  validateAttendanceExtraMetrics,
  validateTestScoreAnalysisData,
  getSchemaRegistry,
  lookupFieldSchema,
  getFieldsByTargetColumn,
};
