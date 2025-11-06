import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { validateJsonbPayload, getJsonbSchemaDefinition } from "@/lib/jsonb/schemaRegistry";
import { applyCompatibilityRules } from "@/lib/jsonb/compatibility";
import {
  validatePhoneNumber,
  validateEmail,
  validateAadharNumber,
  validatePanNumber,
  validatePostalCode,
  validateGuardianPhone,
  validateBatchCode,
} from "@/lib/validators/studentValidator";
import { ENUM_VALUES } from "@/lib/validators/rules";

export interface CsvParseOptions {
  encoding?: BufferEncoding;
  batchSize?: number;
  targetTable: string;
  fieldMappingRules?: Record<string, string>;
  jsonbColumn?: string;
}

export interface CsvParseError {
  row: number;
  column?: string;
  message: string;
  value?: unknown;
}

export interface CsvBatchResult {
  batchNumber: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: CsvParseError[];
}

export interface CsvParseResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  batches: CsvBatchResult[];
  errors: CsvParseError[];
  unmappedColumns: string[];
}

export interface ParsedRow {
  structuredFields: Record<string, unknown>;
  jsonbFields: Record<string, unknown>;
  rowNumber: number;
  errors: CsvParseError[];
}

const STRUCTURED_FIELD_MAPPINGS: Record<string, string[]> = {
  students: [
    "id",
    "first_name",
    "last_name",
    "full_name",
    "phone_number",
    "email",
    "date_of_birth",
    "gender",
    "salutation",
    "guardian_phone",
    "aadhar_number",
    "pan_number",
    "enrollment_status",
    "created_at",
    "updated_at",
  ],
  student_addresses: [
    "id",
    "student_id",
    "address_type",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "postal_code",
    "country",
    "is_primary",
    "created_at",
    "updated_at",
  ],
  student_certifications: [
    "id",
    "student_id",
    "certification_id",
    "enrollment_date",
    "expected_completion_date",
    "actual_completion_date",
    "status",
    "created_at",
    "updated_at",
  ],
  certifications: [
    "id",
    "name",
    "code",
    "description",
    "duration_months",
    "created_at",
    "updated_at",
  ],
  academic_info: [
    "id",
    "student_id",
    "education_level",
    "institution_name",
    "stream",
    "year_of_passing",
    "percentage",
    "created_at",
    "updated_at",
  ],
  exam_attempts: [
    "id",
    "student_id",
    "certification_id",
    "exam_date",
    "score",
    "passed",
    "created_at",
    "updated_at",
  ],
  attendance_records: [
    "id",
    "student_id",
    "session_id",
    "date",
    "status",
    "duration_minutes",
    "created_at",
    "updated_at",
  ],
  test_scores: [
    "id",
    "student_id",
    "test_id",
    "score",
    "max_score",
    "percentage",
    "created_at",
    "updated_at",
  ],
  form_submissions: ["id", "student_id", "form_id", "submitted_at", "created_at", "updated_at"],
};

const JSONB_COLUMN_MAPPINGS: Record<string, string> = {
  students: "extra_fields",
  student_addresses: "additional_data",
  student_certifications: "custom_fields",
  certifications: "metadata",
  academic_info: "extra_fields",
  exam_attempts: "metadata",
  attendance_records: "extra_metrics",
  test_scores: "analysis_data",
  form_submissions: "raw_data",
};

export class DynamicCsvParser {
  private options: Required<CsvParseOptions>;

  constructor(options: CsvParseOptions) {
    this.options = {
      encoding: options.encoding || "utf-8",
      batchSize: options.batchSize || 500,
      targetTable: options.targetTable,
      fieldMappingRules: options.fieldMappingRules || {},
      jsonbColumn:
        options.jsonbColumn || JSONB_COLUMN_MAPPINGS[options.targetTable] || "extra_fields",
    };
  }

  async parse(filePath: string): Promise<CsvParseResult> {
    const fileContent = this.readFile(filePath);
    const { records } = this.parseCSV(fileContent);

    const result: CsvParseResult = {
      totalRows: records.length,
      successCount: 0,
      errorCount: 0,
      batches: [],
      errors: [],
      unmappedColumns: this.detectUnmappedColumns(records),
    };

    const batches = this.createBatches(records);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResult = this.processBatch(batch, i + 1);
      result.batches.push(batchResult);
      result.successCount += batchResult.successCount;
      result.errorCount += batchResult.errorCount;
      result.errors.push(...batchResult.errors);
    }

    return result;
  }

  private readFile(filePath: string): string {
    const buffer = readFileSync(filePath);
    const encoding = this.detectEncoding(buffer);
    return buffer.toString(encoding);
  }

  private detectEncoding(buffer: Buffer): BufferEncoding {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8";
    }

    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return "utf16le";
    }

    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return "utf16le";
    }

    return this.options.encoding;
  }

  private parseCSV(content: string): { records: Record<string, string>[]; delimiter: string } {
    const delimiters = [",", ";", "\t", "|"];
    let bestDelimiter = ",";
    let maxColumns = 0;

    for (const delimiter of delimiters) {
      try {
        const testRecords = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          delimiter,
          relax_column_count: true,
        });

        if (testRecords.length > 0) {
          const columnCount = Object.keys(testRecords[0]).length;
          if (columnCount > maxColumns) {
            maxColumns = columnCount;
            bestDelimiter = delimiter;
          }
        }
      } catch {
        continue;
      }
    }

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter: bestDelimiter,
      relax_column_count: true,
    });

    return { records, delimiter: bestDelimiter };
  }

  private detectUnmappedColumns(records: Record<string, string>[]): string[] {
    if (records.length === 0) return [];

    const csvColumns = Object.keys(records[0]);
    const structuredFields = STRUCTURED_FIELD_MAPPINGS[this.options.targetTable] || [];
    const compatibilityRules = this.getCompatibilityFieldNames();

    const unmappedColumns = csvColumns.filter((col) => {
      const normalizedCol = this.normalizeColumnName(col);
      const mappedCol = this.options.fieldMappingRules[col] || col;

      return (
        !structuredFields.includes(normalizedCol) &&
        !structuredFields.includes(mappedCol) &&
        !compatibilityRules.has(normalizedCol) &&
        !compatibilityRules.has(mappedCol)
      );
    });

    return unmappedColumns;
  }

  private getCompatibilityFieldNames(): Set<string> {
    const fields = new Set<string>();
    const schemaDefinition = getJsonbSchemaDefinition(
      this.options.targetTable,
      this.options.jsonbColumn,
    );

    if (schemaDefinition && schemaDefinition.schema) {
      const schema = schemaDefinition.schema;
      if ("shape" in schema && schema.shape) {
        Object.keys(schema.shape).forEach((key) => fields.add(key));
      }
    }

    return fields;
  }

  private normalizeColumnName(columnName: string): string {
    return columnName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  private createBatches(records: Record<string, string>[]): Record<string, string>[][] {
    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < records.length; i += this.options.batchSize) {
      batches.push(records.slice(i, i + this.options.batchSize));
    }
    return batches;
  }

  private processBatch(batch: Record<string, string>[], batchNumber: number): CsvBatchResult {
    const result: CsvBatchResult = {
      batchNumber,
      totalRows: batch.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (let i = 0; i < batch.length; i++) {
      const rowNumber = (batchNumber - 1) * this.options.batchSize + i + 2;
      const parsedRow = this.parseRow(batch[i], rowNumber);

      if (parsedRow.errors.length > 0) {
        result.errorCount++;
        result.errors.push(...parsedRow.errors);
      } else {
        result.successCount++;
      }
    }

    return result;
  }

  private parseRow(row: Record<string, string>, rowNumber: number): ParsedRow {
    const structuredFields: Record<string, unknown> = {};
    const jsonbFields: Record<string, unknown> = {};
    const errors: CsvParseError[] = [];

    const structuredFieldNames = STRUCTURED_FIELD_MAPPINGS[this.options.targetTable] || [];

    for (const [csvColumn, value] of Object.entries(row)) {
      const trimmedValue = value?.trim();
      if (!trimmedValue) continue;

      const mappedColumn = this.mapColumn(csvColumn);
      const normalizedColumn = this.normalizeColumnName(csvColumn);

      let targetField: string | null = null;

      if (structuredFieldNames.includes(mappedColumn)) {
        targetField = mappedColumn;
      } else if (structuredFieldNames.includes(normalizedColumn)) {
        targetField = normalizedColumn;
      } else {
        const normalizedWithoutUnderscores = normalizedColumn.replace(/_/g, "");
        const fuzzyMatch = structuredFieldNames.find((field) => {
          const fieldWithoutUnderscores = field.replace(/_/g, "");
          return (
            fieldWithoutUnderscores.toLowerCase() === normalizedWithoutUnderscores.toLowerCase() ||
            normalizedWithoutUnderscores
              .toLowerCase()
              .startsWith(fieldWithoutUnderscores.toLowerCase()) ||
            fieldWithoutUnderscores
              .toLowerCase()
              .startsWith(normalizedWithoutUnderscores.toLowerCase())
          );
        });
        if (fuzzyMatch) {
          targetField = fuzzyMatch;
        }
      }

      if (targetField) {
        const validationError = this.validateField(targetField, trimmedValue, structuredFields);
        if (validationError) {
          errors.push({
            row: rowNumber,
            column: csvColumn,
            message: validationError,
            value: trimmedValue,
          });
        } else {
          structuredFields[targetField] = trimmedValue;
        }
      } else {
        jsonbFields[mappedColumn] = trimmedValue;
      }
    }

    if (Object.keys(jsonbFields).length > 0) {
      const jsonbValidation = this.validateJsonbFields(jsonbFields, rowNumber);
      if (jsonbValidation.errors) {
        errors.push(...jsonbValidation.errors);
      }
    }

    return {
      structuredFields,
      jsonbFields,
      rowNumber,
      errors,
    };
  }

  private mapColumn(csvColumn: string): string {
    if (this.options.fieldMappingRules[csvColumn]) {
      return this.options.fieldMappingRules[csvColumn];
    }

    const compatibilityResult = applyCompatibilityRules(
      this.options.targetTable,
      this.options.jsonbColumn,
      { [csvColumn]: "" },
    );

    const renamedKeys = Object.keys(compatibilityResult.data);
    if (renamedKeys.length > 0 && renamedKeys[0] !== csvColumn) {
      return renamedKeys[0];
    }

    return csvColumn;
  }

  private validateField(
    fieldName: string,
    value: string,
    allFields: Record<string, unknown>,
  ): string | null {
    switch (fieldName) {
      case "phone_number":
        return validatePhoneNumber(value) ? null : "Invalid phone number format";

      case "email":
        return validateEmail(value) ? null : "Invalid email format";

      case "aadhar_number":
        return validateAadharNumber(value) ? null : "Invalid AADHAR number";

      case "pan_number":
        return validatePanNumber(value) ? null : "Invalid PAN number";

      case "postal_code":
        return validatePostalCode(value) ? null : "Invalid postal code";

      case "guardian_phone":
        if (!validateGuardianPhone(value)) {
          return "Invalid guardian phone number format";
        }
        if (allFields.phone_number && value === allFields.phone_number) {
          return "Guardian phone must be different from student phone";
        }
        return null;

      case "gender":
        if (!value) return null;
        return ENUM_VALUES.gender.includes(value as never) ? null : "Invalid gender value";

      case "salutation":
        if (!value) return null;
        return ENUM_VALUES.salutation.includes(value as never) ? null : "Invalid salutation value";

      case "education_level":
        if (!value) return null;
        return ENUM_VALUES.educationLevel.includes(value as never)
          ? null
          : "Invalid education level";

      case "stream":
        if (!value) return null;
        return ENUM_VALUES.stream.includes(value as never) ? null : "Invalid stream value";

      case "certification_type":
        if (!value) return null;
        return ENUM_VALUES.certificationType.includes(value as never)
          ? null
          : "Invalid certification type";

      case "batch_code":
        const certificationType = allFields.certification_type as string | undefined;
        return validateBatchCode(value, certificationType) ? null : "Invalid batch code format";

      case "date_of_birth":
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return "Invalid date format";
        }
        const year = date.getFullYear();
        if (year < 1950 || year > 2010) {
          return "Date of birth must be between 1950 and 2010";
        }
        return null;

      default:
        return null;
    }
  }

  private validateJsonbFields(
    jsonbFields: Record<string, unknown>,
    rowNumber: number,
  ): { errors?: CsvParseError[] } {
    try {
      const validationResult = validateJsonbPayload(
        this.options.targetTable,
        this.options.jsonbColumn,
        jsonbFields,
        { allowPartial: true },
      );

      if (!validationResult.success && validationResult.errors) {
        const isSchemaNotFound = validationResult.errors.some(
          (err) => err.code === "schema_not_found",
        );
        if (isSchemaNotFound) {
          return {};
        }

        return {
          errors: validationResult.errors.map((err) => ({
            row: rowNumber,
            column: err.path,
            message: err.message,
          })),
        };
      }
    } catch {
      return {};
    }

    return {};
  }

  public async parseAndTransform(filePath: string): Promise<{
    records: Array<{
      structuredFields: Record<string, unknown>;
      jsonbFields: Record<string, unknown>;
    }>;
    errors: CsvParseError[];
    unmappedColumns: string[];
  }> {
    const fileContent = this.readFile(filePath);
    const { records } = this.parseCSV(fileContent);

    const transformedRecords: Array<{
      structuredFields: Record<string, unknown>;
      jsonbFields: Record<string, unknown>;
    }> = [];
    const allErrors: CsvParseError[] = [];

    for (let i = 0; i < records.length; i++) {
      const rowNumber = i + 2;
      const parsedRow = this.parseRow(records[i], rowNumber);

      if (parsedRow.errors.length === 0) {
        transformedRecords.push({
          structuredFields: parsedRow.structuredFields,
          jsonbFields: parsedRow.jsonbFields,
        });
      } else {
        allErrors.push(...parsedRow.errors);
      }
    }

    return {
      records: transformedRecords,
      errors: allErrors,
      unmappedColumns: this.detectUnmappedColumns(records),
    };
  }
}

export const createCsvParser = (options: CsvParseOptions): DynamicCsvParser => {
  return new DynamicCsvParser(options);
};
