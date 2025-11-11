import { ZodObject, type ZodRawShape, type ZodTypeAny } from "zod";
import {
  getJsonbSchemaDefinition,
  registerJsonbSchema,
  type JsonbSchemaDefinition,
} from "@/lib/jsonb/schemaRegistry";
import {
  buildZodSchemaForField,
  type SchemaExtensionFieldDefinition,
  type SchemaExtensionFieldType,
} from "@/lib/jsonb/schemaExtensionBuilder";

type SchemaExtensionRow = {
  table_name: string;
  jsonb_column: string;
  field_name: string;
  field_type: string;
  description?: string | null;
  required?: boolean | null;
  default_value?: unknown;
  validation_rules?: SchemaExtensionFieldDefinition["validation_rules"] | null;
  schema_version?: number | null;
};

type SchemaExtensionGroup = {
  table: string;
  column: string;
  version: number;
  fields: SchemaExtensionFieldDefinition[];
};

const SUPPORTED_FIELD_TYPES: readonly SchemaExtensionFieldType[] = [
  "string",
  "number",
  "boolean",
  "date",
  "email",
  "phone",
  "url",
  "json",
  "gender",
  "salutation",
  "education_level",
  "stream",
  "certification_type",
] as const;

let rehydrationPromise: Promise<void> | null = null;
let hasRehydrated = false;
let skipLogged = false;

export function ensureJsonbSchemaExtensionsLoaded(): Promise<void> {
  if (typeof window !== "undefined") {
    return Promise.resolve();
  }

  if (hasRehydrated) {
    return Promise.resolve();
  }

  if (rehydrationPromise) {
    return rehydrationPromise;
  }

  rehydrationPromise = (async () => {
    try {
      await performRehydration();
      hasRehydrated = true;
    } catch (error) {
      console.error("Failed to rehydrate JSONB schema extensions:", error);
      throw error;
    } finally {
      rehydrationPromise = null;
    }
  })();

  return rehydrationPromise;
}

export function resetJsonbSchemaRehydrationStateForTests() {
  hasRehydrated = false;
  rehydrationPromise = null;
  skipLogged = false;
}

async function performRehydration(): Promise<void> {
  if (shouldSkipRehydration()) {
    hasRehydrated = true;
    return;
  }

  const { supabaseAdmin } = await import("@/lib/supabase/server");
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("jsonb_schema_extensions")
    .select(
      "table_name,jsonb_column,field_name,field_type,description,required,default_value,validation_rules,schema_version",
    )
    .order("schema_version", { ascending: true })
    .order("field_name", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return;
  }

  const grouped = groupExtensions(data);
  for (const group of grouped.values()) {
    applyPersistedExtensions(group);
  }
}

function shouldSkipRehydration(): boolean {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!skipLogged && process.env.NODE_ENV !== "test") {
      console.warn(
        "Skipping JSONB schema rehydration: SUPABASE_SERVICE_ROLE_KEY is not set (development only).",
      );
      skipLogged = true;
    }
    return true;
  }

  if (process.env.NODE_ENV === "test" && process.env.JSONB_SCHEMA_REHYDRATE_IN_TESTS !== "true") {
    return true;
  }

  return false;
}

function groupExtensions(rows: SchemaExtensionRow[]) {
  const grouped = new Map<string, SchemaExtensionGroup>();

  for (const row of rows) {
    const fieldType = normalizeFieldType(row.field_type);
    if (!fieldType) {
      console.warn(
        `Skipping schema extension for ${row.table_name}.${row.jsonb_column}.${row.field_name}: unsupported field_type '${row.field_type}'.`,
      );
      continue;
    }

    const key = `${row.table_name}.${row.jsonb_column}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        table: row.table_name,
        column: row.jsonb_column,
        version: row.schema_version ?? 1,
        fields: [],
      });
    }

    const group = grouped.get(key)!;
    group.version = Math.max(group.version, row.schema_version ?? group.version);
    group.fields.push({
      field_name: row.field_name,
      field_type: fieldType,
      required: row.required ?? false,
      description: row.description ?? undefined,
      default_value: row.default_value ?? undefined,
      validation_rules: row.validation_rules ?? undefined,
    });
  }

  return grouped;
}

function applyPersistedExtensions(group: SchemaExtensionGroup) {
  const definition = getJsonbSchemaDefinition(group.table, group.column) as
    | JsonbSchemaDefinition<ZodObject<ZodRawShape>>
    | undefined;

  if (!definition) {
    console.warn(
      `No base JSONB schema registered for ${group.table}.${group.column}; skipping persisted extensions.`,
    );
    return;
  }

  if (!(definition.schema instanceof ZodObject)) {
    return;
  }

  const additionalShape: Record<string, ZodTypeAny> = {};
  for (const field of group.fields) {
    if (field.field_name in definition.schema.shape || field.field_name in additionalShape) {
      continue;
    }
    additionalShape[field.field_name] = buildZodSchemaForField(field);
  }

  const newFields = Object.keys(additionalShape);
  if (newFields.length === 0) {
    return;
  }

  Object.assign(definition.schema.shape, additionalShape);
  registerJsonbSchema({
    ...definition,
    version: Math.max(group.version, definition.version),
  });
}

function normalizeFieldType(value: string | null | undefined): SchemaExtensionFieldType | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase() as SchemaExtensionFieldType;
  return SUPPORTED_FIELD_TYPES.includes(normalized) ? normalized : null;
}
