import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/middleware/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  exportToCSV,
  exportToJSON,
  exportToXLSX,
  flattenStudentRecord,
  getMimeType,
  getFileExtension,
} from "@/lib/utils/exportFormatters";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/export endpoints.",
  );
}

/**
 * Validates the API key from the request header.
 *
 * SECURITY NOTE: These endpoints use the service-role key and bypass RLS.
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
        success: false,
        error: "Unauthorized. Valid X-Internal-API-Key header required.",
      },
      { status: 401 },
    );
  }

  return null;
}

const exportParamsSchema = z.object({
  format: z.enum(["csv", "json", "xlsx"], {
    message: "Format must be one of: csv, json, xlsx",
  }),
  filters: z
    .object({
      certification_type: z.string().optional(),
      enrollment_status: z.string().optional(),
      date_from: z.string().datetime().optional(),
      date_to: z.string().datetime().optional(),
      gender: z.enum(["Male", "Female", "Others"]).optional(),
      min_age: z.number().int().min(16).max(100).optional(),
      max_age: z.number().int().min(16).max(100).optional(),
    })
    .optional()
    .default({}),
  fields: z
    .array(z.string().min(1, "Field name cannot be empty"))
    .min(1, "At least one field must be specified")
    .optional()
    .default(["id", "phone_number", "email", "first_name", "last_name", "enrollment_status"]),
  include_extra_fields: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(10000).optional().default(1000),
  offset: z.number().int().min(0).optional().default(0),
});

type ExportParams = z.infer<typeof exportParamsSchema>;

/**
 * Calculates date of birth range for age filtering using precise dates
 * Returns the date range that corresponds to the age range
 * Uses date-fns format to avoid timezone conversion issues
 */
function getDateOfBirthRange(
  minAge?: number,
  maxAge?: number,
): {
  maxDate?: string;
  minDate?: string;
} {
  const today = new Date();
  const result: { maxDate?: string; minDate?: string } = {};

  if (minAge !== undefined) {
    // For min age, we want students who are at least minAge years old
    // This means date_of_birth must be <= (today - minAge years)
    const maxDate = new Date(today);
    maxDate.setFullYear(today.getFullYear() - minAge);
    // Use date-fns format to avoid timezone conversion (toISOString converts to UTC)
    result.maxDate = format(maxDate, "yyyy-MM-dd");
  }

  if (maxAge !== undefined) {
    // For max age, we want students who are at most maxAge years old
    // This means date_of_birth must be >= (today - (maxAge + 1) years + 1 day)
    const minDate = new Date(today);
    minDate.setFullYear(today.getFullYear() - (maxAge + 1));
    // Add one day to make it inclusive of students who turned maxAge today
    minDate.setDate(minDate.getDate() + 1);
    // Use date-fns format to avoid timezone conversion
    result.minDate = format(minDate, "yyyy-MM-dd");
  }

  return result;
}

/**
 * Builds a Supabase query with filters applied
 * Age filters are applied in SQL before pagination to ensure accurate results
 */
function buildQuery(
  supabase: SupabaseClient,
  filters: ExportParams["filters"],
  limit: number,
  offset: number,
) {
  let query = supabase.from("students").select("*");

  // Apply enrollment_status filter
  if (filters?.enrollment_status) {
    query = query.eq("enrollment_status", filters.enrollment_status);
  }

  // Apply gender filter
  if (filters?.gender) {
    query = query.eq("gender", filters.gender);
  }

  // Apply date range filters (on created_at)
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  // Apply certification_type filter (from extra_fields)
  if (filters?.certification_type) {
    query = query.eq("extra_fields->>certification_type", filters.certification_type);
  }

  // Apply age filters using date_of_birth (before pagination)
  if (filters?.min_age !== undefined || filters?.max_age !== undefined) {
    const { minDate, maxDate } = getDateOfBirthRange(filters.min_age, filters.max_age);
    if (maxDate) {
      // Students must be born on or before this date (at least minAge years old)
      query = query.lte("date_of_birth", maxDate);
    }
    if (minDate) {
      // Students must be born on or after this date (at most maxAge years old)
      query = query.gte("date_of_birth", minDate);
    }
    // Exclude students without date_of_birth when age filtering is applied
    query = query.not("date_of_birth", "is", null);
  }

  // Apply pagination AFTER all filters
  query = query.range(offset, offset + limit - 1);

  // Order by created_at descending for consistent results
  query = query.order("created_at", { ascending: false });

  return query;
}

async function handleExport(req: NextRequest, validatedData: ExportParams) {
  const authError = validateApiKey(req);
  if (authError) {
    return authError;
  }

  try {
    const { format, filters, fields, include_extra_fields, limit, offset } = validatedData;

    const supabase = supabaseAdmin();
    const query = buildQuery(supabase, filters, limit, offset);

    const { data: students, error } = await query;

    if (error) {
      console.error("Error fetching students for export:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch students: ${error.message}`,
        },
        { status: 500 },
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No students found matching the specified filters",
        },
        { status: 404 },
      );
    }

    // Flatten student records with field selection
    const exportRows = students.map((student) =>
      flattenStudentRecord(student, fields, include_extra_fields),
    );

    // Generate export based on format
    let exportData: string | Buffer;
    let contentType: string;

    switch (format) {
      case "csv":
        exportData = exportToCSV(exportRows);
        contentType = getMimeType("csv");
        break;
      case "json":
        exportData = exportToJSON(exportRows);
        contentType = getMimeType("json");
        break;
      case "xlsx":
        exportData = exportToXLSX(exportRows);
        contentType = getMimeType("xlsx");
        break;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `students-export-${timestamp}.${getFileExtension(format)}`;

    // Return file response
    return new NextResponse(exportData as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error in export handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

export const POST = withValidation(exportParamsSchema)(handleExport);

const exportQuerySchema = z.object({
  format: z.enum(["csv", "json", "xlsx"]).default("json"),
  certification_type: z.string().optional(),
  enrollment_status: z.string().optional(),
  gender: z.enum(["Male", "Female", "Others"]).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1000))
    .pipe(z.number().int().min(1).max(10000)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
  fields: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.string().min(1)).min(1).optional()),
  include_extra_fields: z
    .string()
    .default("false")
    .transform((val) => val === "true")
    .pipe(z.boolean()),
});

type ExportQuery = z.infer<typeof exportQuerySchema>;

async function handleExportGet(req: NextRequest, validatedData: ExportQuery) {
  const authError = validateApiKey(req);
  if (authError) {
    return authError;
  }

  try {
    // Convert query params to POST format
    const exportParams: ExportParams = {
      format: validatedData.format,
      filters: {
        certification_type: validatedData.certification_type,
        enrollment_status: validatedData.enrollment_status,
        gender: validatedData.gender,
      },
      fields: validatedData.fields || [
        "id",
        "phone_number",
        "email",
        "first_name",
        "last_name",
        "enrollment_status",
      ],
      include_extra_fields: validatedData.include_extra_fields,
      limit: validatedData.limit,
      offset: validatedData.offset,
    };

    return handleExport(req, exportParams);
  } catch (error) {
    console.error("Error in GET export handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

export const GET = withValidation(exportQuerySchema)(handleExportGet);
