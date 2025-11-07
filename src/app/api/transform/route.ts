import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transformationService } from "@/lib/services/transformationService";
import type { CompatibilityRule } from "@/lib/jsonb/compatibility";
import { VALID_TABLE_COLUMN_COMBINATIONS } from "@/lib/constants/tableColumns";
import "@/lib/jsonb/schemaRegistry";

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/transform endpoints.",
  );
}

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
        success: false,
        error: "Unauthorized. Valid X-Internal-API-Key header required.",
      },
      { status: 401 },
    );
  }

  return null;
}

function validateTableColumnCombination(table: string, column: string): string | null {
  const validColumns = VALID_TABLE_COLUMN_COMBINATIONS[table];
  if (!validColumns || !validColumns.includes(column)) {
    return `Invalid JSONB column '${column}' for table '${table}'. Valid columns: ${validColumns?.join(", ") || "none"}`;
  }
  return null;
}

const compatibilityRuleSchema: z.ZodType<CompatibilityRule> = z.object({
  description: z.string().optional(),
  rename: z.record(z.string(), z.string()).optional(),
  valueMap: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  defaults: z.record(z.string(), z.unknown()).optional(),
  drop: z.array(z.string()).optional(),
  transform: z.function().optional(),
});

const transformRequestSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]),
  rules: z.array(compatibilityRuleSchema).optional(),
});

const getTransformRequestSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
});

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validatedData = transformRequestSchema.parse(body);

    const { table, column, data, rules } = validatedData;

    const validationError = validateTableColumnCombination(table, column);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 },
      );
    }

    if (Array.isArray(data)) {
      const results = transformationService.transformImportData(table, column, data);

      return NextResponse.json({
        success: true,
        transformedData: results.map((r) => r.data),
        appliedRules: results.map((r) => r.appliedRules),
        count: results.length,
      });
    } else {
      const preview = transformationService.previewTransformation(table, column, data, rules);

      return NextResponse.json({
        success: true,
        transformedData: preview.transformed,
        appliedRules: preview.appliedRules,
        original: preview.original,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const column = searchParams.get("column");

    const validatedParams = getTransformRequestSchema.parse({ table, column });

    const validationError = validateTableColumnCombination(validatedParams.table, validatedParams.column);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 },
      );
    }

    const mappings = transformationService.getAvailableMappings(
      validatedParams.table,
      validatedParams.column,
    );

    return NextResponse.json({
      success: true,
      table: validatedParams.table,
      column: validatedParams.column,
      mappings,
      count: mappings.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}
