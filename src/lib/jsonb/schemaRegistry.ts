import { z, ZodIssue, ZodObject, ZodRawShape, ZodTypeAny } from "zod";
import {
  batchCodePartialSchema,
  certificationTypeSchema,
  emailSchema,
  phoneNumberSchema,
} from "@/lib/types/validations";
import { applyCompatibilityRules, registerCompatibilityRule } from "@/lib/jsonb/compatibility";

type JsonbSchemaKey = `${string}.${string}`;

export interface JsonbSchemaDefinition<TSchema extends ZodTypeAny = ZodTypeAny> {
  table: string;
  column: string;
  version: number;
  schema: TSchema;
  description?: string;
  allowUnknownKeys?: boolean;
}

export interface JsonbValidationOptions {
  allowPartial?: boolean;
  stripUnknownKeys?: boolean;
}

export interface JsonbValidationError {
  path: string;
  message: string;
  code: string;
}

export interface JsonbValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: JsonbValidationError[];
  unknownKeys?: string[];
  version?: number;
  appliedCompatibilityRules?: string[];
}

const mapZodIssues = (issues: ZodIssue[]): JsonbValidationError[] => {
  return issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "<root>",
    message: issue.message,
    code: issue.code,
  }));
};

class JsonbSchemaRegistry {
  private schemas = new Map<JsonbSchemaKey, JsonbSchemaDefinition>();

  public register<TSchema extends ZodTypeAny>(definition: JsonbSchemaDefinition<TSchema>): void {
    const key = this.getKey(definition.table, definition.column);
    this.schemas.set(key, definition);
  }

  public get<TSchema extends ZodTypeAny>(
    table: string,
    column: string,
  ): JsonbSchemaDefinition<TSchema> | undefined {
    const key = this.getKey(table, column);
    return this.schemas.get(key) as JsonbSchemaDefinition<TSchema> | undefined;
  }

  public list(): JsonbSchemaDefinition[] {
    return Array.from(this.schemas.values());
  }

  public compareAndSet<TSchema extends ZodTypeAny>(
    definition: JsonbSchemaDefinition<TSchema>,
    expectedVersion: number,
  ): boolean {
    const key = this.getKey(definition.table, definition.column);
    const current = this.schemas.get(key);
    if (!current || current.version !== expectedVersion) {
      return false;
    }
    this.schemas.set(key, definition);
    return true;
  }

  public validate<TSchema extends ZodTypeAny>(
    table: string,
    column: string,
    payload: unknown,
    options: JsonbValidationOptions = {},
  ): JsonbValidationResult<z.infer<TSchema>> {
    const definition = this.get<TSchema>(table, column);

    if (!definition) {
      return {
        success: false,
        errors: [
          {
            path: "<root>",
            message: `No JSONB schema registered for ${table}.${column}`,
            code: "schema_not_found",
          },
        ],
      };
    }

    const compatibilityResult =
      payload && typeof payload === "object"
        ? applyCompatibilityRules(table, column, payload as Record<string, unknown>)
        : { data: payload, appliedRules: [] };

    const schemaToUse = this.prepareSchema(definition.schema, definition.allowUnknownKeys, options);
    const result = schemaToUse.safeParse(compatibilityResult.data);

    if (!result.success) {
      return {
        success: false,
        errors: mapZodIssues(result.error.issues),
        version: definition.version,
      };
    }

    const unknownKeys = this.computeUnknownKeys(
      definition.schema,
      compatibilityResult.data,
      definition.allowUnknownKeys,
    );

    return {
      success: true,
      data: result.data,
      unknownKeys,
      version: definition.version,
      appliedCompatibilityRules: compatibilityResult.appliedRules,
    };
  }

  private prepareSchema<TSchema extends ZodTypeAny>(
    schema: TSchema,
    allowUnknownKeys: boolean | undefined,
    options: JsonbValidationOptions,
  ): TSchema {
    let workingSchema = schema;

    if (workingSchema instanceof ZodObject) {
      if (options.allowPartial) {
        workingSchema = workingSchema.partial() as unknown as TSchema;
      }

      if (options.stripUnknownKeys) {
        workingSchema = workingSchema.strip() as unknown as TSchema;
      } else if (allowUnknownKeys === true) {
        workingSchema = workingSchema.passthrough() as unknown as TSchema;
      } else {
        workingSchema = workingSchema.strict() as unknown as TSchema;
      }
    }

    return workingSchema;
  }

  private computeUnknownKeys(
    schema: ZodTypeAny,
    payload: unknown,
    allowUnknownKeys?: boolean,
  ): string[] | undefined {
    if (!(schema instanceof ZodObject)) {
      return undefined;
    }

    if (allowUnknownKeys !== true) {
      return undefined;
    }

    if (typeof payload !== "object" || payload === null) {
      return undefined;
    }

    const structuralSchema = schema as ZodObject<ZodRawShape>;
    const knownKeys = new Set(Object.keys(structuralSchema.shape));
    const payloadKeys = Object.keys(payload as Record<string, unknown>);
    const unknownKeys = payloadKeys.filter((key) => !knownKeys.has(key));

    return unknownKeys.length > 0 ? unknownKeys : undefined;
  }

  private getKey(table: string, column: string): JsonbSchemaKey {
    return `${table}.${column}`;
  }
}

export const jsonbSchemaRegistry = new JsonbSchemaRegistry();
const schemaBindingUpdaters = new Map<JsonbSchemaKey, (schema: ZodTypeAny) => void>();

function setSchemaBindingUpdater(
  table: string,
  column: string,
  updater: (schema: ZodTypeAny) => void,
) {
  schemaBindingUpdaters.set(`${table}.${column}`, updater);
}

export function updateSchemaBinding(table: string, column: string, schema: ZodTypeAny) {
  schemaBindingUpdaters.get(`${table}.${column}`)?.(schema);
}

const leadSourceSchema = z.enum(["event", "referral", "organic", "paid_ads", "partner", "other"]);
const preferredChannelSchema = z.enum(["phone", "email", "whatsapp"]);

let studentExtraFieldsSchema = batchCodePartialSchema
  .extend({
    guardian_email: emailSchema.optional().nullable(),
    alternate_phone: phoneNumberSchema.optional().nullable(),
    lead_source: leadSourceSchema.optional().nullable(),
    lead_owner: z.string().trim().max(120).optional().nullable(),
    counsellor_notes: z.string().trim().max(2000).optional().nullable(),
    mentor_assigned: z.boolean().optional(),
    mentor_name: z.string().trim().max(120).optional().nullable(),
    preferred_contact_time: z.string().trim().max(60).optional().nullable(),
    preferred_contact_channel: preferredChannelSchema.optional().nullable(),
    whatsapp_opt_in: z.boolean().optional(),
    consent_captured_at: z.string().datetime().optional().nullable(),
    last_form_submission_id: z.string().uuid().optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .catchall(z.unknown());

let addressAdditionalDataSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    delivery_instructions: z.string().trim().max(500).optional().nullable(),
    alternative_contact: phoneNumberSchema.optional().nullable(),
    delivery_window: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .refine(
        (value) => new Date(value.start).getTime() <= new Date(value.end).getTime(),
        "Delivery window start must be before end",
      )
      .optional()
      .nullable(),
    verification_status: z.enum(["pending", "verified", "failed"]).optional(),
    verification_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .catchall(z.unknown());

let studentCertificationCustomFieldsSchema = z
  .object({
    mentor_id: z.string().uuid().optional().nullable(),
    mentor_name: z.string().trim().max(120).optional().nullable(),
    study_plan_url: z.string().url("Study plan must be a valid URL").optional().nullable(),
    cohort_start_date: z.string().datetime().optional().nullable(),
    cohort_end_date: z.string().datetime().optional().nullable(),
    cohort_lead: z.string().trim().max(120).optional().nullable(),
    batch_prefix: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_-]{2,10}$/)
      .optional()
      .nullable(),
    batch_identifier: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_-]{2,20}$/)
      .optional()
      .nullable(),
    enrollment_channel: leadSourceSchema.optional().nullable(),
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .extend({
    // Reuse certification type validation to keep batch matching robust
    certification_type: certificationTypeSchema.optional().nullable(),
  })
  .catchall(z.unknown());

let certificationMetadataSchema = z
  .object({
    exam_sequence: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    awarding_body: z.string().trim().max(120).optional().nullable(),
    support_contact: z.string().trim().max(120).optional().nullable(),
    fee_currency: z.string().trim().max(3).optional().nullable(),
    official_url: z.string().url().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .catchall(z.unknown());

let academicInfoExtraFieldsSchema = z
  .object({
    board: z.string().trim().max(120).optional().nullable(),
    medium_of_instruction: z.string().trim().max(120).optional().nullable(),
    specialization: z.string().trim().max(120).optional().nullable(),
    gpa: z.number().min(0).max(10).optional().nullable(),
    gpa_scale: z.number().min(1).max(10).optional().nullable(),
    backlogs: z.number().int().min(0).optional().nullable(),
    extracurriculars: z.array(z.string().trim().min(1).max(120)).max(25).optional(),
    scholarships: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
    achievements: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
  })
  .catchall(z.unknown());

let examAttemptMetadataSchema = z
  .object({
    attempt_type: z.enum(["mock", "official", "retest"]).optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
    invigilator: z.string().trim().max(120).optional().nullable(),
    score_breakdown: z.record(z.string(), z.number()).optional().nullable(),
    time_spent_minutes: z.number().min(0).max(1440).optional().nullable(),
    resources_used: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    comments: z.string().trim().max(4000).optional().nullable(),
  })
  .catchall(z.unknown());

let attendanceExtraMetricsSchema = z
  .object({
    attention_score: z.number().min(0).max(100).optional().nullable(),
    participation_score: z.number().min(0).max(100).optional().nullable(),
    chat_messages: z.number().int().min(0).optional().nullable(),
    questions_asked: z.number().int().min(0).optional().nullable(),
    polls_answered: z.number().int().min(0).optional().nullable(),
    camera_on_ratio: z.number().min(0).max(1).optional().nullable(),
    joined_via: z.enum(["web", "mobile", "tablet", "phone"]).optional().nullable(),
  })
  .catchall(z.unknown());

let testScoreAnalysisSchema = z
  .object({
    topic_scores: z.record(z.string(), z.number()).optional().nullable(),
    strengths: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    weaknesses: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    time_analysis: z
      .array(
        z.object({
          section: z.string().trim().max(120),
          minutes: z.number().min(0).max(180),
        }),
      )
      .max(50)
      .optional(),
    recommendations: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
  })
  .catchall(z.unknown());

let formSubmissionRawDataSchema = z.record(z.string(), z.unknown());

jsonbSchemaRegistry.register({
  table: "students",
  column: "extra_fields",
  version: 1,
  schema: studentExtraFieldsSchema,
  description: "Flexible student profile attributes captured outside of the core schema.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("students", "extra_fields", (schema) => {
  studentExtraFieldsSchema = schema as typeof studentExtraFieldsSchema;
});

registerCompatibilityRule("students", "extra_fields", [
  {
    description: "Rename legacy camelCase keys to snake_case equivalents",
    rename: {
      mentorName: "mentor_name",
      mentorAssigned: "mentor_assigned",
      guardianEmail: "guardian_email",
      alternatePhone: "alternate_phone",
      preferredContactTime: "preferred_contact_time",
      preferredContactChannel: "preferred_contact_channel",
      consentCapturedAt: "consent_captured_at",
      lastFormSubmissionId: "last_form_submission_id",
      certificationType: "certification_type",
    },
  },
  {
    description: "Normalize legacy certification type identifiers",
    valueMap: {
      certification_type: {
        USCMA: "US CMA",
        US_CMA: "US CMA",
        ACCA_FND: "ACCA",
      },
    },
  },
]);

jsonbSchemaRegistry.register({
  table: "student_addresses",
  column: "additional_data",
  version: 1,
  schema: addressAdditionalDataSchema,
  description: "Supplementary address metadata such as delivery preferences and geocodes.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("student_addresses", "additional_data", (schema) => {
  addressAdditionalDataSchema = schema as typeof addressAdditionalDataSchema;
});

jsonbSchemaRegistry.register({
  table: "student_certifications",
  column: "custom_fields",
  version: 1,
  schema: studentCertificationCustomFieldsSchema,
  description: "Program-specific metadata for student certification enrolments.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("student_certifications", "custom_fields", (schema) => {
  studentCertificationCustomFieldsSchema = schema as typeof studentCertificationCustomFieldsSchema;
});

registerCompatibilityRule("student_certifications", "custom_fields", [
  {
    description: "Rename legacy custom field keys to canonical snake_case",
    rename: {
      mentorName: "mentor_name",
      mentorId: "mentor_id",
      studyPlanUrl: "study_plan_url",
      cohortStart: "cohort_start_date",
      cohortEnd: "cohort_end_date",
      cohortLead: "cohort_lead",
    },
  },
]);

jsonbSchemaRegistry.register({
  table: "certifications",
  column: "metadata",
  version: 1,
  schema: certificationMetadataSchema,
  description: "Certification-level metadata such as exam sequencing and support details.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("certifications", "metadata", (schema) => {
  certificationMetadataSchema = schema as typeof certificationMetadataSchema;
});

jsonbSchemaRegistry.register({
  table: "academic_info",
  column: "extra_fields",
  version: 1,
  schema: academicInfoExtraFieldsSchema,
  description: "Academic background extensions and unstructured achievements.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("academic_info", "extra_fields", (schema) => {
  academicInfoExtraFieldsSchema = schema as typeof academicInfoExtraFieldsSchema;
});

jsonbSchemaRegistry.register({
  table: "exam_attempts",
  column: "metadata",
  version: 1,
  schema: examAttemptMetadataSchema,
  description: "Per-attempt metadata including break-downs and evaluator comments.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("exam_attempts", "metadata", (schema) => {
  examAttemptMetadataSchema = schema as typeof examAttemptMetadataSchema;
});

jsonbSchemaRegistry.register({
  table: "attendance_records",
  column: "extra_metrics",
  version: 1,
  schema: attendanceExtraMetricsSchema,
  description: "Engagement telemetry and derived attendance metrics.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("attendance_records", "extra_metrics", (schema) => {
  attendanceExtraMetricsSchema = schema as typeof attendanceExtraMetricsSchema;
});

jsonbSchemaRegistry.register({
  table: "test_scores",
  column: "analysis_data",
  version: 1,
  schema: testScoreAnalysisSchema,
  description: "Analytical breakdown for assessments including strengths and improvements.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("test_scores", "analysis_data", (schema) => {
  testScoreAnalysisSchema = schema as typeof testScoreAnalysisSchema;
});

jsonbSchemaRegistry.register({
  table: "form_submissions",
  column: "raw_data",
  version: 1,
  schema: formSubmissionRawDataSchema,
  description: "Raw Google Form payloads stored verbatim for reconciliation.",
  allowUnknownKeys: true,
});
setSchemaBindingUpdater("form_submissions", "raw_data", (schema) => {
  formSubmissionRawDataSchema = schema as typeof formSubmissionRawDataSchema;
});

export {
  studentExtraFieldsSchema,
  addressAdditionalDataSchema,
  studentCertificationCustomFieldsSchema,
  certificationMetadataSchema,
  academicInfoExtraFieldsSchema,
  examAttemptMetadataSchema,
  attendanceExtraMetricsSchema,
  testScoreAnalysisSchema,
  formSubmissionRawDataSchema,
};

export const registerJsonbSchema = <TSchema extends ZodTypeAny>(
  definition: JsonbSchemaDefinition<TSchema>,
) => {
  jsonbSchemaRegistry.register(definition);
  updateSchemaBinding(definition.table, definition.column, definition.schema);
};

export const replaceJsonbSchemaDefinition = <TSchema extends ZodTypeAny>(
  definition: JsonbSchemaDefinition<TSchema>,
  expectedVersion: number,
): boolean => {
  const replaced = jsonbSchemaRegistry.compareAndSet(definition, expectedVersion);
  if (replaced) {
    updateSchemaBinding(definition.table, definition.column, definition.schema);
  }
  return replaced;
};

export const validateJsonbPayload = <TSchema extends ZodTypeAny>(
  table: string,
  column: string,
  payload: unknown,
  options?: JsonbValidationOptions,
) => {
  return jsonbSchemaRegistry.validate<TSchema>(table, column, payload, options);
};

export const getJsonbSchemaDefinition = <TSchema extends ZodTypeAny>(
  table: string,
  column: string,
) => {
  return jsonbSchemaRegistry.get<TSchema>(table, column);
};

export const listRegisteredJsonbSchemas = () => {
  return jsonbSchemaRegistry.list();
};
