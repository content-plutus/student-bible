import { NextResponse } from "next/server";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { listRegisteredJsonbSchemas } from "@/lib/jsonb/schemaRegistry";
import {
  studentExtraFieldsSchema,
  addressAdditionalDataSchema,
  studentCertificationCustomFieldsSchema,
  certificationMetadataSchema,
  academicInfoExtraFieldsSchema,
  examAttemptMetadataSchema,
  attendanceExtraMetricsSchema,
  testScoreAnalysisSchema,
  formSubmissionRawDataSchema,
} from "@/lib/jsonb/schemaRegistry";
import { studentInsertSchema, studentUpdateSchema } from "@/lib/types/student";
import {
  phoneNumberSchema,
  emailSchema,
  aadharNumberSchema,
  panNumberSchema,
} from "@/lib/validators/studentValidator";
import {
  genderSchema,
  salutationSchema,
  educationLevelSchema,
  streamSchema,
  certificationTypeSchema,
  dateOfBirthSchema,
} from "@/lib/types/validations";
import { importOptionsSchema } from "@/lib/types/import";

const validationErrorSchema = z.object({
  field: z.string().describe("The field that failed validation"),
  message: z.string().describe("Human-readable error message"),
  code: z.string().describe("Machine-readable error code"),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Error message"),
  details: z.array(validationErrorSchema).optional().describe("Detailed validation errors"),
});

const studentSearchSchema = z
  .object({
    phone_number: z.string().optional().describe("Student phone number"),
    email: z.string().email().optional().describe("Student email address"),
    first_name: z.string().optional().describe("Student first name"),
    last_name: z.string().optional().describe("Student last name"),
    date_of_birth: z
      .union([
        z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), {
          message: "Invalid date_of_birth format",
        }),
        z.date(),
      ])
      .optional()
      .describe("Student date of birth"),
    aadhar_number: z.string().optional().describe("Student Aadhar number"),
    guardian_phone: z.string().optional().describe("Guardian phone number"),
    pan_number: z.string().optional().describe("Student PAN number"),
    extraFields: z.record(z.string(), z.unknown()).optional().describe("Additional JSONB fields"),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== null), {
    message: "At least one field must be provided for duplicate detection",
  });

const duplicateDetectionOptionsSchema = z.object({
  preset: z
    .enum(["strict", "moderate", "lenient", "contact_only", "name_and_dob"])
    .optional()
    .describe("Preset matching criteria"),
  excludeStudentId: z.string().uuid().optional().describe("Student ID to exclude from results"),
});

const duplicateDetectionRequestSchema = z.object({
  studentData: studentSearchSchema.describe("Student data to check for duplicates"),
  options: duplicateDetectionOptionsSchema.optional().describe("Duplicate detection options"),
});

const conditionalCreateRequestSchema = z.object({
  studentData: studentInsertSchema.describe("Student data to create"),
  createIfNoDuplicates: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to create student if no duplicates found"),
  options: duplicateDetectionOptionsSchema.optional().describe("Duplicate detection options"),
});

const syncDataSchema = z
  .object({
    phone_number: phoneNumberSchema,
    email: emailSchema,
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().optional().nullable(),
    gender: genderSchema,
    date_of_birth: dateOfBirthSchema,
    guardian_phone: phoneNumberSchema.optional().nullable(),
    salutation: salutationSchema,
    father_name: z.string().trim().optional().nullable(),
    mother_name: z.string().trim().optional().nullable(),
    aadhar_number: aadharNumberSchema,
    pan_number: panNumberSchema,
    enrollment_status: z.string().trim().optional().nullable(),
    education_level: educationLevelSchema,
    stream: streamSchema,
    certification_type: certificationTypeSchema,
    extra_fields: studentExtraFieldsSchema.optional().default({}),
  })
  .refine((data) => !data.guardian_phone || data.guardian_phone !== data.phone_number, {
    message: "Guardian phone number must be different from student's phone number",
    path: ["guardian_phone"],
  });

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

const compatibilityRuleSchema = z.object({
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

const transformRequestSchema = z.object({
  table: z.string().min(1, "Table name is required"),
  column: z.string().min(1, "Column name is required"),
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]),
  rules: z.array(compatibilityRuleSchema).optional(),
});

export async function GET() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", "ApiKeyAuth", {
    type: "apiKey",
    in: "header",
    name: "X-Internal-API-Key",
    description:
      "Internal API key for authentication. Required in production, optional in development.",
  });

  registry.registerComponent("schemas", "ValidationError", {
    type: "object",
    properties: {
      field: { type: "string", description: "The field that failed validation" },
      message: { type: "string", description: "Human-readable error message" },
      code: { type: "string", description: "Machine-readable error code" },
    },
    required: ["field", "message", "code"],
  });

  registry.registerComponent("schemas", "ErrorResponse", {
    type: "object",
    properties: {
      error: { type: "string", description: "Error message" },
      details: {
        type: "array",
        items: { $ref: "#/components/schemas/ValidationError" },
        description: "Detailed validation errors",
      },
    },
    required: ["error"],
  });

  const jsonbSchemas = listRegisteredJsonbSchemas();
  jsonbSchemas.forEach((schema) => {
    const schemaName = `${schema.table}_${schema.column}`;
    registry.registerComponent("schemas", schemaName, {
      type: "object",
      description: schema.description || `JSONB schema for ${schema.table}.${schema.column}`,
      additionalProperties: true,
    });
  });

  registry.registerComponent("schemas", "StudentExtraFields", {
    type: "object",
    description: "Flexible student profile attributes captured outside of the core schema",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "AddressAdditionalData", {
    type: "object",
    description: "Supplementary address metadata such as delivery preferences and geocodes",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "StudentCertificationCustomFields", {
    type: "object",
    description: "Program-specific metadata for student certification enrolments",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "CertificationMetadata", {
    type: "object",
    description: "Certification-level metadata such as exam sequencing and support details",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "AcademicInfoExtraFields", {
    type: "object",
    description: "Academic background extensions and unstructured achievements",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "ExamAttemptMetadata", {
    type: "object",
    description: "Per-attempt metadata including break-downs and evaluator comments",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "AttendanceExtraMetrics", {
    type: "object",
    description: "Engagement telemetry and derived attendance metrics",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "TestScoreAnalysisData", {
    type: "object",
    description: "Analytical breakdown for assessments including strengths and improvements",
    additionalProperties: true,
  });

  registry.registerComponent("schemas", "FormSubmissionRawData", {
    type: "object",
    description: "Raw Google Form payloads stored verbatim for reconciliation",
    additionalProperties: true,
  });

  registry.registerPath({
    method: "post",
    path: "/api/students",
    description: "Detect duplicate students based on provided data",
    summary: "Detect duplicate students",
    tags: ["Students"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                studentData: {
                  type: "object",
                  description: "Student data to check for duplicates",
                },
                options: {
                  type: "object",
                  properties: {
                    preset: {
                      type: "string",
                      enum: ["strict", "moderate", "lenient", "contact_only", "name_and_dob"],
                      description: "Preset matching criteria",
                    },
                    excludeStudentId: {
                      type: "string",
                      format: "uuid",
                      description: "Student ID to exclude from results",
                    },
                  },
                },
              },
              required: ["studentData"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Duplicate detection results",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                result: {
                  type: "object",
                  properties: {
                    hasPotentialDuplicates: { type: "boolean" },
                    matches: { type: "array", items: { type: "object" } },
                    totalMatches: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized - Invalid or missing API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "put",
    path: "/api/students",
    description: "Conditionally create a student if no duplicates are found",
    summary: "Conditional student creation",
    tags: ["Students"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                studentData: {
                  type: "object",
                  description: "Student data to create",
                },
                createIfNoDuplicates: {
                  type: "boolean",
                  default: false,
                  description: "Whether to create student if no duplicates found",
                },
                options: {
                  type: "object",
                  properties: {
                    preset: {
                      type: "string",
                      enum: ["strict", "moderate", "lenient", "contact_only", "name_and_dob"],
                    },
                    excludeStudentId: { type: "string", format: "uuid" },
                  },
                },
              },
              required: ["studentData"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Student creation result",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                created: { type: "boolean" },
                student: { type: "object" },
                duplicateCheckResult: { type: "object" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/students",
    description: "Search for duplicate students via query parameters",
    summary: "Search duplicate students",
    tags: ["Students"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        aadhar: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        preset: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "Search results",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                result: { type: "object" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/students/{id}",
    description: "Get a student by ID",
    summary: "Get student by ID",
    tags: ["Students"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Student details",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                student: { type: "object" },
              },
            },
          },
        },
      },
      404: {
        description: "Student not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/students/{id}",
    description: "Update a student by ID",
    summary: "Update student",
    tags: ["Students"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              description: "Student update data",
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated student",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                student: { type: "object" },
              },
            },
          },
        },
      },
      404: {
        description: "Student not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/sync",
    description: "Synchronize student data with unknown enum detection",
    summary: "Sync student data",
    tags: ["Sync"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                phone_number: { type: "string" },
                email: { type: "string", format: "email" },
                first_name: { type: "string" },
                last_name: { type: "string", nullable: true },
                gender: { type: "string" },
                date_of_birth: { type: "string", format: "date" },
                guardian_phone: { type: "string", nullable: true },
                salutation: { type: "string" },
                father_name: { type: "string", nullable: true },
                mother_name: { type: "string", nullable: true },
                aadhar_number: { type: "string" },
                pan_number: { type: "string" },
                enrollment_status: { type: "string", nullable: true },
                education_level: { type: "string" },
                stream: { type: "string" },
                certification_type: { type: "string" },
                extra_fields: {
                  $ref: "#/components/schemas/StudentExtraFields",
                },
              },
              required: [
                "phone_number",
                "email",
                "first_name",
                "gender",
                "date_of_birth",
                "salutation",
                "aadhar_number",
                "pan_number",
                "education_level",
                "stream",
                "certification_type",
              ],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Sync successful",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                data: { type: "object" },
                unknownEnumValues: { type: "object" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/export",
    description: "Export student data in various formats (CSV, JSON, XLSX)",
    summary: "Export student data",
    tags: ["Export"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                format: {
                  type: "string",
                  enum: ["csv", "json", "xlsx"],
                  description: "Export format",
                },
                filters: {
                  type: "object",
                  properties: {
                    certification_type: { type: "string" },
                    enrollment_status: { type: "string" },
                    date_from: { type: "string", format: "date-time" },
                    date_to: { type: "string", format: "date-time" },
                    gender: { type: "string", enum: ["Male", "Female", "Others"] },
                    min_age: { type: "number", minimum: 16, maximum: 100 },
                    max_age: { type: "number", minimum: 16, maximum: 100 },
                  },
                },
                fields: {
                  type: "array",
                  items: { type: "string" },
                  description: "Fields to include in export",
                },
                include_extra_fields: {
                  type: "boolean",
                  default: false,
                  description: "Include JSONB extra fields",
                },
                limit: {
                  type: "number",
                  minimum: 1,
                  maximum: 10000,
                  default: 1000,
                },
                offset: { type: "number", minimum: 0, default: 0 },
              },
              required: ["format"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Exported file",
        content: {
          "text/csv": {
            schema: { type: "string", format: "binary" },
          },
          "application/json": {
            schema: { type: "string", format: "binary" },
          },
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      404: {
        description: "No students found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/export",
    description: "Export student data via query parameters",
    summary: "Export student data (GET)",
    tags: ["Export"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        format: z.enum(["csv", "json", "xlsx"]).optional(),
        certification_type: z.string().optional(),
        enrollment_status: z.string().optional(),
        gender: z.enum(["Male", "Female", "Others"]).optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
        fields: z.string().optional(),
        include_extra_fields: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "Exported file",
        content: {
          "text/csv": {
            schema: { type: "string", format: "binary" },
          },
          "application/json": {
            schema: { type: "string", format: "binary" },
          },
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/schema/extend",
    description: "Dynamically add fields to JSONB columns with validation rules",
    summary: "Extend JSONB schema",
    tags: ["Schema"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                table_name: {
                  type: "string",
                  enum: [
                    "students",
                    "student_addresses",
                    "student_certifications",
                    "exam_attempts",
                    "form_submissions",
                    "attendance_records",
                    "test_scores",
                    "academic_info",
                  ],
                },
                jsonb_column: {
                  type: "string",
                  enum: [
                    "extra_fields",
                    "additional_data",
                    "custom_fields",
                    "metadata",
                    "raw_data",
                    "extra_metrics",
                    "analysis_data",
                  ],
                },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field_name: { type: "string" },
                      field_type: {
                        type: "string",
                        enum: ["string", "number", "boolean", "date", "email", "phone", "url", "json"],
                      },
                      required: { type: "boolean", default: false },
                      default_value: {},
                      description: { type: "string" },
                      validation_rules: { type: "object" },
                    },
                    required: ["field_name", "field_type"],
                  },
                  minItems: 1,
                  maxItems: 50,
                },
                migration_strategy: {
                  type: "string",
                  enum: ["merge", "replace", "append"],
                  default: "merge",
                },
                apply_to_existing: { type: "boolean", default: false },
              },
              required: ["table_name", "jsonb_column", "fields"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Schema extension validated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                extension_config: { type: "object" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/import",
    description: "Import student data from CSV or JSON with duplicate detection",
    summary: "Import student data",
    tags: ["Import"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "CSV file to import",
                },
              },
            },
          },
          "application/json": {
            schema: {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: { type: "object" },
                  description: "Array of student records to import",
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Import completed or job created",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                jobId: { type: "string", format: "uuid" },
                status: { type: "string" },
                totalRecords: { type: "number" },
                processedRecords: { type: "number" },
                successfulRecords: { type: "number" },
                failedRecords: { type: "number" },
                errors: { type: "array", items: { type: "object" } },
                insertedStudentIds: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/import",
    description: "Get import job status by job ID",
    summary: "Get import job status",
    tags: ["Import"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        jobId: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Import job status",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                jobId: { type: "string", format: "uuid" },
                status: { type: "string" },
                totalRecords: { type: "number" },
                processedRecords: { type: "number" },
                successfulRecords: { type: "number" },
                failedRecords: { type: "number" },
                errors: { type: "array", items: { type: "object" } },
                insertedStudentIds: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                completedAt: { type: "string", format: "date-time", nullable: true },
                metadata: { type: "object" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      404: {
        description: "Import job not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/mappings",
    description: "Get field mapping rules for table-column combinations",
    summary: "Get field mappings",
    tags: ["Mappings"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        table: z.string().optional(),
        column: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: "Field mappings",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                table: { type: "string" },
                column: { type: "string" },
                mappings: { type: "array", items: { type: "object" } },
                count: { type: "number" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/mappings",
    description: "Add field mapping rules for a table-column combination",
    summary: "Add field mappings",
    tags: ["Mappings"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                table: { type: "string" },
                column: { type: "string" },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      rename: { type: "object" },
                      valueMap: { type: "object" },
                      defaults: { type: "object" },
                      drop: { type: "array", items: { type: "string" } },
                    },
                  },
                  minItems: 1,
                },
              },
              required: ["table", "column", "rules"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Mapping rules added",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                table: { type: "string" },
                column: { type: "string" },
                addedRules: { type: "number" },
                totalRules: { type: "number" },
                mappings: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "put",
    path: "/api/mappings",
    description: "Update field mapping rules for a table-column combination",
    summary: "Update field mappings",
    tags: ["Mappings"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                table: { type: "string" },
                column: { type: "string" },
                rules: {
                  type: "array",
                  items: { type: "object" },
                  minItems: 1,
                },
                replace: { type: "boolean", default: false },
              },
              required: ["table", "column", "rules"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Mapping rules updated",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                table: { type: "string" },
                column: { type: "string" },
                updatedRules: { type: "number" },
                totalRules: { type: "number" },
                mappings: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/mappings",
    description: "Delete field mapping rules for a table-column combination",
    summary: "Delete field mappings",
    tags: ["Mappings"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                table: { type: "string" },
                column: { type: "string" },
              },
              required: ["table", "column"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Mapping rules deleted",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                table: { type: "string" },
                column: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/transform",
    description: "Transform data using compatibility rules",
    summary: "Transform data",
    tags: ["Transform"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                table: { type: "string" },
                column: { type: "string" },
                data: {
                  oneOf: [
                    { type: "object" },
                    { type: "array", items: { type: "object" } },
                  ],
                },
                rules: {
                  type: "array",
                  items: { type: "object" },
                },
              },
              required: ["table", "column", "data"],
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Transformed data",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                transformedData: {},
                appliedRules: { type: "array", items: { type: "string" } },
                original: { type: "object" },
                count: { type: "number" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/transform",
    description: "Get available transformation mappings for a table-column combination",
    summary: "Get transformation mappings",
    tags: ["Transform"],
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        table: z.string(),
        column: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Transformation mappings",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                table: { type: "string" },
                column: { type: "string" },
                mappings: { type: "array", items: { type: "object" } },
                count: { type: "number" },
              },
            },
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Student Bible API",
      version: "1.0.0",
      description:
        "Centralized student data management system for educational institutions with comprehensive duplicate detection, flexible JSONB schemas, and multi-source data ingestion capabilities. Supports Indian certification programs (ACCA, US CMA, CFA, US CPA) with specialized validation for Indian identifiers (Aadhar, PAN).",
      contact: {
        name: "Plutus Education",
        email: "content@plutuseducation.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.plutuseducation.com",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Students",
        description: "Student CRUD operations with intelligent duplicate detection",
      },
      {
        name: "Sync",
        description: "Data synchronization with unknown enum detection",
      },
      {
        name: "Export",
        description: "Export student data in multiple formats (CSV, JSON, XLSX)",
      },
      {
        name: "Schema",
        description: "Dynamic JSONB schema extension",
      },
      {
        name: "Import",
        description: "Batch import from CSV or JSON with duplicate handling",
      },
      {
        name: "Mappings",
        description: "Field mapping and compatibility rules management",
      },
      {
        name: "Transform",
        description: "Data transformation using compatibility rules",
      },
    ],
  });

  return NextResponse.json(document);
}
