import { z, ZodNumber, ZodObject, ZodRawShape, ZodString, ZodTypeAny } from "zod";
import { emailSchema, phoneNumberSchema } from "@/lib/validators/studentValidator";
import {
  certificationTypeSchema,
  dateOfBirthSchema,
  educationLevelSchema,
  genderSchema,
  salutationSchema,
  streamSchema,
} from "@/lib/types/validations";
import {
  getJsonbSchemaDefinition,
  registerJsonbSchema,
  type JsonbSchemaDefinition,
} from "@/lib/jsonb/schemaRegistry";

export type SchemaExtensionFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "phone"
  | "url"
  | "json"
  | "gender"
  | "salutation"
  | "education_level"
  | "stream"
  | "certification_type";

export interface SchemaExtensionFieldDefinition {
  field_name: string;
  field_type: SchemaExtensionFieldType;
  required?: boolean;
  description?: string | null;
  default_value?: unknown;
  validation_rules?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    pattern?: string;
    enum_values?: string[];
  } | null;
}

export interface ApplySchemaExtensionResult {
  version: number;
  addedFields: string[];
}

export function buildZodSchemaForField(definition: SchemaExtensionFieldDefinition): ZodTypeAny {
  const rules = definition.validation_rules;
  let schema = getBaseSchema(definition.field_type, rules);

  if (!definition.required) {
    schema = schema.optional().nullable();
  }

  if (definition.default_value !== undefined) {
    schema = schema.default(definition.default_value as never);
  }

  return schema.describe(definition.description ?? undefined);
}

function getBaseSchema(
  fieldType: SchemaExtensionFieldType,
  rules?: SchemaExtensionFieldDefinition["validation_rules"] | null,
): ZodTypeAny {
  switch (fieldType) {
    case "email":
      return applyStringRules(emailSchema, rules);
    case "phone":
      return applyStringRules(phoneNumberSchema, rules);
    case "url":
      return applyStringRules(z.string().url(), rules);
    case "date":
      return applyStringRules(dateOfBirthSchema, rules);
    case "gender":
      return genderSchema;
    case "salutation":
      return salutationSchema;
    case "education_level":
      return educationLevelSchema;
    case "stream":
      return streamSchema;
    case "certification_type":
      return certificationTypeSchema;
    case "number":
      return applyNumericRules(z.number(), rules);
    case "boolean":
      return z.boolean();
    case "json":
      return z.record(z.string(), z.unknown());
    case "string":
    default:
      return applyStringRules(z.string().trim(), rules);
  }
}

function applyStringRules(
  schema: ZodTypeAny,
  rules?: SchemaExtensionFieldDefinition["validation_rules"] | null,
) {
  if (!rules) {
    return schema;
  }

  let workingSchema = schema;
  if (workingSchema instanceof ZodString) {
    if (rules.min_length !== undefined) {
      workingSchema = workingSchema.min(rules.min_length);
    }
    if (rules.max_length !== undefined) {
      workingSchema = workingSchema.max(rules.max_length);
    }
  }

  if (rules.pattern) {
    try {
      workingSchema = workingSchema.regex(new RegExp(rules.pattern));
    } catch {
      // ignore invalid regex patterns
    }
  }

  if (rules.enum_values && rules.enum_values.length > 0) {
    const uniqueValues = Array.from(new Set(rules.enum_values));
    if (uniqueValues.length === 1) {
      workingSchema = z.literal(uniqueValues[0]);
    } else {
      workingSchema = z.union(
        uniqueValues.map((value) => z.literal(value)) as [ZodTypeAny, ...ZodTypeAny[]],
      );
    }
  }

  return workingSchema;
}

function applyNumericRules(
  schema: ZodTypeAny,
  rules?: SchemaExtensionFieldDefinition["validation_rules"] | null,
) {
  if (!rules) {
    return schema;
  }

  let workingSchema = schema;
  if (workingSchema instanceof ZodNumber) {
    if (rules.min_value !== undefined) {
      workingSchema = workingSchema.min(rules.min_value);
    }
    if (rules.max_value !== undefined) {
      workingSchema = workingSchema.max(rules.max_value);
    }
  }

  return workingSchema;
}

export function applySchemaExtensions(
  table: string,
  column: string,
  fields: SchemaExtensionFieldDefinition[],
): ApplySchemaExtensionResult {
  const definition = getJsonbSchemaDefinition(table, column) as
    | JsonbSchemaDefinition<ZodObject<ZodRawShape>>
    | undefined;

  if (!definition) {
    throw new Error(`No JSONB schema registered for ${table}.${column}`);
  }

  if (!(definition.schema instanceof ZodObject)) {
    throw new Error(`JSONB schema for ${table}.${column} is not an object schema`);
  }

  const shape = definition.schema.shape;
  const newShape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    if (field.field_name in shape || field.field_name in newShape) {
      throw new Error(`Field '${field.field_name}' already exists on ${table}.${column}`);
    }
    newShape[field.field_name] = buildZodSchemaForField(field);
  }

  const updatedSchema = definition.schema.extend(newShape);
  const updatedDefinition: JsonbSchemaDefinition = {
    ...definition,
    version: definition.version + 1,
    schema: updatedSchema,
  };

  registerJsonbSchema(updatedDefinition);

  return {
    version: updatedDefinition.version,
    addedFields: Object.keys(newShape),
  };
}
