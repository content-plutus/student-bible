import { stringify } from "csv-stringify/sync";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export interface ExportRow {
  [key: string]: unknown;
}

export interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  fields: string[];
  includeExtraFields: boolean;
}

/**
 * Formats a value for export based on its type
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Flattens a student record with extra_fields into a single row
 */
export function flattenStudentRecord(
  student: Record<string, unknown>,
  fields: string[],
  includeExtraFields: boolean,
): ExportRow {
  const row: ExportRow = {};
  const extraFields = (student.extra_fields as Record<string, unknown>) || {};

  // Add core fields
  for (const field of fields) {
    if (field === "extra_fields") {
      continue; // Skip extra_fields as a field name, we'll handle it separately
    }

    if (field in student) {
      row[field] = student[field];
    } else if (includeExtraFields && field in extraFields) {
      // Field might be in extra_fields
      row[field] = extraFields[field];
    } else {
      row[field] = null;
    }
  }

  // If includeExtraFields is true, add all extra_fields that aren't already in fields
  if (includeExtraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      if (!fields.includes(key) && key !== "extra_fields") {
        row[`extra_fields.${key}`] = value;
      }
    }
  }

  return row;
}

/**
 * Collects all unique keys from all rows to ensure consistent headers
 */
function collectAllKeys(rows: ExportRow[]): string[] {
  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keySet.add(key);
    }
  }
  // Return sorted keys for consistent ordering (core fields first, then extra_fields.*)
  return Array.from(keySet).sort((a, b) => {
    // Sort extra_fields.* keys after regular fields
    const aIsExtra = a.startsWith("extra_fields.");
    const bIsExtra = b.startsWith("extra_fields.");
    if (aIsExtra !== bIsExtra) {
      return aIsExtra ? 1 : -1;
    }
    return a.localeCompare(b);
  });
}

/**
 * Normalizes rows to include all keys, filling missing values with null
 */
function normalizeRows(rows: ExportRow[], headers: string[]): ExportRow[] {
  return rows.map((row) => {
    const normalized: ExportRow = {};
    for (const header of headers) {
      normalized[header] = header in row ? row[header] : null;
    }
    return normalized;
  });
}

/**
 * Exports data to CSV format
 */
export function exportToCSV(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = collectAllKeys(rows);
  const normalizedRows = normalizeRows(rows, headers);
  const data = normalizedRows.map((row) => headers.map((header) => formatValue(row[header])));

  return stringify([headers, ...data], {
    header: false,
    quoted: true,
    escape: '"',
  });
}

/**
 * Exports data to JSON format
 */
export function exportToJSON(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

/**
 * Exports data to XLSX format
 */
export function exportToXLSX(rows: ExportRow[]): Buffer {
  if (rows.length === 0) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([[]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
  }

  const headers = collectAllKeys(rows);
  const normalizedRows = normalizeRows(rows, headers);
  const data = normalizedRows.map((row) => headers.map((header) => formatValue(row[header])));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

/**
 * Gets the appropriate MIME type for the export format
 */
export function getMimeType(format: "csv" | "json" | "xlsx"): string {
  switch (format) {
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
}

/**
 * Gets the appropriate file extension for the export format
 */
export function getFileExtension(format: "csv" | "json" | "xlsx"): string {
  return format;
}
