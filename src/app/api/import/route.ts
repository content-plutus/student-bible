import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DynamicCsvParser } from "@/lib/utils/csvParser";
import { BatchImportService } from "@/lib/services/batchImportService";
import { importOptionsSchema, type ImportOptionsInput } from "@/lib/types/import";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/import endpoints.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function getSupabaseClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!);
}

async function parseCsvFile(file: File): Promise<Array<Record<string, unknown>>> {
  const buffer = await file.arrayBuffer();
  const tempPath = join(tmpdir(), `import-${Date.now()}-${Math.random().toString(36).substring(7)}.csv`);

  try {
    writeFileSync(tempPath, Buffer.from(buffer));

    const parser = new DynamicCsvParser({
      targetTable: "students",
      batchSize: 1000,
    });

    const result = await parser.parseAndTransform(tempPath);

    return result.records.map((r) => ({
      ...r.structuredFields,
      extra_fields: r.jsonbFields,
    }));
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function createImportJob(
  supabase: ReturnType<typeof getSupabaseClient>,
  totalRecords: number,
  metadata: {
    sourceType: "csv" | "json";
    batchSize: number;
    options?: {
      skipDuplicates?: boolean;
      createIfNoDuplicates?: boolean;
      duplicateCheckPreset?: string;
    };
    fileName?: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      status: "pending",
      total_records: totalRecords,
      processed_records: 0,
      successful_records: 0,
      failed_records: 0,
      error_summary: [],
      inserted_student_ids: [],
      metadata,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create import job: ${error?.message || "Unknown error"}`);
  }

  return data.id;
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let records: Array<Record<string, unknown>>;
    let sourceType: "csv" | "json" = "json";
    let fileName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: "File is required for CSV import",
          },
          { status: 400 },
        );
      }

      fileName = file.name;
      sourceType = "csv";
      records = await parseCsvFile(file);
    } else {
      const body = await request.json();
      const data = body.data || body;

      if (!Array.isArray(data)) {
        return NextResponse.json(
          {
            success: false,
            error: "Request body must contain a 'data' array or be an array",
          },
          { status: 400 },
        );
      }

      records = data;
    }

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No records to import",
        },
        { status: 400 },
        );
    }

    const searchParams = request.nextUrl.searchParams;
    const asyncMode = searchParams.get("async") === "true";

    let options: ImportOptionsInput = {};
    try {
      const optionsParam = searchParams.get("options");
      if (optionsParam) {
        options = JSON.parse(optionsParam);
      }
    } catch {
      // Ignore invalid options JSON
    }

    const validatedOptions = importOptionsSchema.parse({
      ...options,
      async: asyncMode,
    });

    const supabase = getSupabaseClient();

    const jobId = await createImportJob(supabase, records.length, {
      sourceType,
      batchSize: validatedOptions.batchSize,
      options: {
        skipDuplicates: validatedOptions.skipDuplicates,
        createIfNoDuplicates: validatedOptions.createIfNoDuplicates,
        duplicateCheckPreset: validatedOptions.duplicateCheckPreset,
      },
      fileName,
    });

    if (validatedOptions.async) {
      return NextResponse.json({
        success: true,
        jobId,
        status: "pending",
        message: "Import job created. Use GET /api/import?jobId=<id> to check status.",
      });
    }

    const importService = new BatchImportService(supabase, validatedOptions);
    const result = await importService.processBatchImport(records, jobId, {
      sourceType,
      batchSize: validatedOptions.batchSize,
      options: {
        skipDuplicates: validatedOptions.skipDuplicates,
        createIfNoDuplicates: validatedOptions.createIfNoDuplicates,
        duplicateCheckPreset: validatedOptions.duplicateCheckPreset,
      },
      fileName,
    });

    const { data: job } = await supabase.from("import_jobs").select("*").eq("id", jobId).single();

    return NextResponse.json({
      success: result.success,
      jobId,
      status: job?.status || "completed",
      totalRecords: job?.total_records || records.length,
      processedRecords: job?.processed_records || records.length,
      successfulRecords: job?.successful_records || 0,
      failedRecords: job?.failed_records || 0,
      errors: result.errors,
      insertedStudentIds: job?.inserted_student_ids || [],
      completedAt: job?.completed_at || null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Error processing import:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
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
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: "jobId query parameter is required",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();
    const { data: job, error } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "Import job not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      totalRecords: job.total_records,
      processedRecords: job.processed_records,
      successfulRecords: job.successful_records,
      failedRecords: job.failed_records,
      errors: job.error_summary || [],
      insertedStudentIds: job.inserted_student_ids || [],
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
      metadata: job.metadata,
    });
  } catch (error) {
    console.error("Error fetching import job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

