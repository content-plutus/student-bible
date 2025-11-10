import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/middleware/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  applySchemaExtensions,
  type SchemaExtensionFieldDefinition,
} from "@/lib/jsonb/schemaExtensionBuilder";
import { getJsonbSchemaDefinition, registerJsonbSchema } from "@/lib/jsonb/schemaRegistry";
import { applyAuditContext, buildAuditContext } from "@/lib/utils/auditContext";

type SchemaExtensionPayload = z.infer<typeof schemaExtensionSchema>;

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/schema/extend endpoint.",
  );
}

/**
 * Validates the API key from the request header.
 *
 * SECURITY NOTE: This endpoint modifies JSONB schemas.
 * INTERNAL_API_KEY is REQUIRED in production (enforced at module load).
 * In non-production environments, if INTERNAL_API_KEY is not set, a warning
 * is logged but requests are allowed (for development convenience).
 */
function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    console.warn(
      "WARNING: INTERNAL_API_KEY not set. API endpoints are unprotected. " +
        "This is only allowed in non-production environments.",
    );
    return null;
  }

  const requestApiKey = request.headers.get("X-Internal-API-Key");

  if (!requestApiKey || requestApiKey !== apiKey) {
    return NextResponse.json(
      {
        error: "Unauthorized. Valid X-Internal-API-Key header required.",
      },
      { status: 401 },
    );
  }

  return null;
}

const fieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "email",
  "phone",
  "url",
  "json",
]);

const fieldDefinitionSchema = z.object({
  field_name: z
    .string()
    .trim()
    .min(1, "Field name is required")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Field name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores",
    ),
  field_type: fieldTypeSchema,
  required: z.boolean().optional().default(false),
  default_value: z.unknown().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  validation_rules: z
    .object({
      min_length: z.number().int().min(0).optional(),
      max_length: z.number().int().min(0).optional(),
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      pattern: z.string().optional(),
      enum_values: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
});

const schemaExtensionSchema = z.object({
  table_name: z.enum(
    [
      "students",
      "student_addresses",
      "student_certifications",
      "exam_attempts",
      "form_submissions",
      "attendance_records",
      "test_scores",
      "academic_info",
    ],
    {
      message:
        "Table name must be one of: students, student_addresses, student_certifications, exam_attempts, form_submissions, attendance_records, test_scores, academic_info",
    },
  ),
  jsonb_column: z.enum(
    [
      "extra_fields",
      "additional_data",
      "custom_fields",
      "metadata",
      "raw_data",
      "extra_metrics",
      "analysis_data",
    ],
    {
      message:
        "JSONB column must be one of: extra_fields, additional_data, custom_fields, metadata, raw_data, extra_metrics, analysis_data",
    },
  ),
  fields: z
    .array(fieldDefinitionSchema)
    .min(1, "At least one field definition is required")
    .max(50, "Cannot add more than 50 fields at once"),
  migration_strategy: z.enum(["merge", "replace", "append"]).optional().default("merge"),
  apply_to_existing: z.boolean().optional().default(false),
});

async function handleSchemaExtension(request: NextRequest, validatedData: SchemaExtensionPayload) {
  const { table_name, jsonb_column, fields, migration_strategy, apply_to_existing } = validatedData;

  const fieldNames = fields.map((f) => f.field_name);
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);

  if (duplicates.length > 0) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [
          {
            field: "fields",
            message: `Duplicate field names found: ${duplicates.join(", ")}`,
            code: "DUPLICATE_FIELD_NAMES",
          },
        ],
      },
      { status: 400 },
    );
  }

  const validTableColumnCombinations: Record<string, string[]> = {
    students: ["extra_fields"],
    student_addresses: ["additional_data"],
    student_certifications: ["custom_fields"],
    exam_attempts: ["metadata"],
    form_submissions: ["raw_data"],
    attendance_records: ["extra_metrics"],
    test_scores: ["analysis_data"],
    academic_info: ["extra_fields"],
  };

  const validColumns = validTableColumnCombinations[table_name];
  if (!validColumns || !validColumns.includes(jsonb_column)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [
          {
            field: "jsonb_column",
            message: `Invalid JSONB column '${jsonb_column}' for table '${table_name}'. Valid columns: ${validColumns?.join(", ") || "none"}`,
            code: "INVALID_TABLE_COLUMN_COMBINATION",
          },
        ],
      },
      { status: 400 },
    );
  }

  const originalDefinition = getJsonbSchemaDefinition(table_name, jsonb_column);
  if (originalDefinition?.schema instanceof z.ZodObject) {
    const conflicts = fields
      .filter((field) => field.field_name in originalDefinition.schema.shape)
      .map((field) => field.field_name);

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Schema conflict",
          details: `Field(s) already exist on ${table_name}.${jsonb_column}: ${conflicts.join(", ")}`,
        },
        { status: 409 },
      );
    }
  }

  let schemaResult: ReturnType<typeof applySchemaExtensions>;
  try {
    schemaResult = applySchemaExtensions(table_name, jsonb_column, fields);
    const supabase = supabaseAdmin();
    await applyAuditContext(supabase, buildAuditContext(request, "schema-extension"));
    const extensionRecords = fields.map((field) => ({
      table_name,
      jsonb_column,
      field_name: field.field_name,
      field_type: field.field_type,
      description: field.description,
      required: field.required ?? false,
      allow_null: !(field.required ?? false),
      default_value: field.default_value ?? null,
      validation_rules: field.validation_rules ?? null,
      migration_strategy,
      apply_to_existing,
      schema_version: schemaResult.version,
      last_applied_at: new Date().toISOString(),
    }));

    const { data: persisted, error: persistError } = await supabase
      .from("jsonb_schema_extensions")
      .upsert(extensionRecords, {
        onConflict: "table_name,jsonb_column,field_name",
      })
      .select("id");

    if (persistError) {
      throw persistError;
    }

    let updatedRows = 0;
    const defaultsPayload = buildDefaultsPayload(fields);
    if (apply_to_existing && defaultsPayload) {
      const { data, error: rpcError } = await supabase.rpc("apply_jsonb_schema_extension", {
        target_table: table_name,
        jsonb_column,
        extension_payload: defaultsPayload,
        field_names: Object.keys(defaultsPayload),
        strategy: migration_strategy,
      });
      if (rpcError) {
        throw rpcError;
      }
      updatedRows = data ?? 0;
    }

    return NextResponse.json({
      success: true,
      message: "Schema extension applied successfully",
      extension: {
        table: table_name,
        column: jsonb_column,
        fields: fieldNames,
        schemaVersion: schemaResult.version,
      },
      persistence: {
        storedDefinitions: persisted?.length ?? 0,
        recordsUpdated: updatedRows,
      },
    });
  } catch (error) {
    if (originalDefinition) {
      registerJsonbSchema(originalDefinition);
    }
    if (error instanceof Error) {
      const status = error.message.includes("Unsafe regex pattern")
        ? 400
        : error.message.includes("already exists")
          ? 409
          : 500;
      return NextResponse.json(
        {
          error: "Schema extension failed",
          details: error.message,
        },
        { status },
      );
    }
    return NextResponse.json(
      {
        error: "Schema extension failed",
        details: "Unknown error",
      },
      { status: 500 },
    );
  }
}

const validatedHandler = withValidation(schemaExtensionSchema)(handleSchemaExtension);

export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) {
    return authError;
  }
  return validatedHandler(req);
}

function buildDefaultsPayload(fields: SchemaExtensionFieldDefinition[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.default_value !== undefined && field.default_value !== null) {
      payload[field.field_name] = field.default_value;
    }
  }
  return Object.keys(payload).length > 0 ? payload : null;
}
