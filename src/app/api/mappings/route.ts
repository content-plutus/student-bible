import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transformationService } from "@/lib/services/transformationService";
import type { CompatibilityRule } from "@/lib/jsonb/compatibility";
import { VALID_TABLE_COLUMN_COMBINATIONS } from "@/lib/constants/tableColumns";
import "@/lib/jsonb/schemaRegistry";

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/mappings endpoints.",
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

const compatibilityRuleSchema: z.ZodType<Omit<CompatibilityRule, "transform">> = z.object({
  description: z.string().optional(),
  rename: z.record(z.string(), z.string()).optional(),
  valueMap: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  defaults: z.record(z.string(), z.unknown()).optional(),
  drop: z.array(z.string()).optional(),
});

const addMappingSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
  rules: z.array(compatibilityRuleSchema).min(1, "At least one rule is required"),
});

const updateMappingSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
  rules: z.array(compatibilityRuleSchema).min(1, "At least one rule is required"),
  replace: z.boolean().optional().default(false),
});

const deleteMappingSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
});

function validateTableColumnCombination(table: string, column: string): string | null {
  const validColumns = VALID_TABLE_COLUMN_COMBINATIONS[table];
  if (!validColumns || !validColumns.includes(column)) {
    return `Invalid JSONB column '${column}' for table '${table}'. Valid columns: ${validColumns?.join(", ") || "none"}`;
  }
  return null;
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

    if (table && column) {
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

      const mappings = transformationService.getAvailableMappings(table, column);

      return NextResponse.json({
        success: true,
        table,
        column,
        mappings,
        count: mappings.length,
      });
    }

    const allMappings: Record<string, Record<string, CompatibilityRule[]>> = {};

    for (const [table, columns] of Object.entries(VALID_TABLE_COLUMN_COMBINATIONS)) {
      allMappings[table] = {};
      for (const column of columns) {
        const mappings = transformationService.getAvailableMappings(table, column);
        if (mappings.length > 0) {
          allMappings[table][column] = mappings;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mappings: allMappings,
      validCombinations: VALID_TABLE_COLUMN_COMBINATIONS,
    });
  } catch (error) {
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

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validatedData = addMappingSchema.parse(body);

    const { table, column, rules } = validatedData;

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

    transformationService.registerFieldMapping(table, column, rules);

    const updatedMappings = transformationService.getAvailableMappings(table, column);

    return NextResponse.json({
      success: true,
      message: "Field mapping rules added successfully",
      table,
      column,
      addedRules: rules.length,
      totalRules: updatedMappings.length,
      mappings: updatedMappings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
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

export async function PUT(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validatedData = updateMappingSchema.parse(body);

    const { table, column, rules, replace } = validatedData;

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

    if (replace) {
      transformationService.resetMappingsFor(table, column);
    }

    transformationService.registerFieldMapping(table, column, rules);

    const updatedMappings = transformationService.getAvailableMappings(table, column);

    return NextResponse.json({
      success: true,
      message: replace
        ? `Replaced rules for ${table}.${column} (restored defaults, then applied ${rules.length} new rules)`
        : "Field mapping rules updated successfully",
      table,
      column,
      updatedRules: rules.length,
      totalRules: updatedMappings.length,
      mappings: updatedMappings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
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

export async function DELETE(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validatedData = deleteMappingSchema.parse(body);

    const { table, column } = validatedData;

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

    transformationService.resetMappingsFor(table, column);

    return NextResponse.json({
      success: true,
      message: `Cleared custom rules and restored defaults for ${table}.${column}`,
      table,
      column,
      note: "In-memory only - not persisted to database. Seeded defaults have been restored.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.issues,
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
