import { z } from "zod";

export type JSONBColumnName =
  | "extra_fields"
  | "custom_fields"
  | "additional_data"
  | "metadata"
  | "analysis_data"
  | "extra_metrics"
  | "raw_data";

export type JSONBDataType = "string" | "number" | "boolean" | "object" | "array";

export interface JSONBFieldSchema {
  fieldName: string;
  dataType: JSONBDataType;
  validation: z.ZodSchema;
  targetColumn: JSONBColumnName;
  usageFrequency?: number;
  description?: string;
  examples?: unknown[];
}

export interface SchemaRegistryEntry {
  fieldName: string;
  schema: JSONBFieldSchema;
}

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface JSONBValidationContext {
  targetColumn: JSONBColumnName;
  allowUnknownFields?: boolean;
  strictMode?: boolean;
  certificationType?: string | null;
}

export type SchemaRegistry = Map<string, JSONBFieldSchema>;

export interface FieldValidationOptions {
  allowPartial?: boolean;
  stripNulls?: boolean;
  allowUnknownFields?: boolean;
  context?: Record<string, unknown>;
}
