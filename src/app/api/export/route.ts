import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/middleware/validation";

const exportParamsSchema = z.object({
  format: z.enum(["csv", "json", "xlsx"], {
    errorMap: () => ({ message: "Format must be one of: csv, json, xlsx" }),
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

async function handleExport(req: NextRequest, validatedData: ExportParams, _rawData: unknown) {
  const { format, filters, fields, include_extra_fields, limit, offset } = validatedData;

  return NextResponse.json({
    success: true,
    message: `Export request validated successfully for ${format} format`,
    export_config: {
      format,
      filters,
      fields,
      include_extra_fields,
      pagination: {
        limit,
        offset,
      },
    },
    note: "This is a placeholder implementation. In production, this would generate and return the requested export file.",
  });
}

export const POST = withValidation(exportParamsSchema)(handleExport);

const exportQuerySchema = z.object({
  format: z.enum(["csv", "json", "xlsx"]).default("json"),
  certification_type: z.string().optional(),
  enrollment_status: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(10000))
    .optional()
    .default("1000"),
});

type ExportQuery = z.infer<typeof exportQuerySchema>;

async function handleExportGet(req: NextRequest, validatedData: ExportQuery, _rawData: unknown) {
  return NextResponse.json({
    success: true,
    message: "Export query validated successfully",
    query: validatedData,
    note: "This is a placeholder implementation. In production, this would generate and return the requested export file.",
  });
}

export const GET = withValidation(exportQuerySchema)(handleExportGet);
