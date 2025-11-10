import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectDuplicates } from "@/lib/validators/duplicateDetector";
import { DEFAULT_MATCHING_CRITERIA, getPreset } from "@/lib/validators/matchingRules";
import { studentInsertSchema } from "@/lib/types/student";
import { studentExtraFieldsSchema, validateJsonbPayload } from "@/lib/jsonb/schemaRegistry";
import {
  validateBatchCodeFromExtraFields,
  stripNullValuesFromExtraFields,
} from "@/lib/validators/schemaEvolution";
import { CertificationType } from "@/lib/validators/rules";
import { buildAuditContext } from "@/lib/utils/auditContext";
import {
  cache,
  buildCacheKey,
  CACHE_TTLS,
  CACHE_NAMESPACES,
  CACHE_PREFIXES,
} from "@/lib/cache/memoryCache";
import { z } from "zod";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
  );
}

if (process.env.NODE_ENV === "production" && !process.env.INTERNAL_API_KEY) {
  throw new Error(
    "INTERNAL_API_KEY is required in production. These endpoints use service-role key and bypass RLS. " +
      "Set INTERNAL_API_KEY environment variable to secure the /api/students endpoints.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DUPLICATE_CACHE_NAMESPACE = CACHE_NAMESPACES.duplicateDetection;
const DUPLICATE_CACHE_PREFIX = CACHE_PREFIXES.duplicateDetection;
type DuplicateResult = Awaited<ReturnType<typeof detectDuplicates>>;

async function getDuplicateResultWithCache(
  supabaseClient: ReturnType<typeof getSupabaseClient>,
  payload: Record<string, unknown>,
  criteria: typeof DEFAULT_MATCHING_CRITERIA,
  options?: { excludeStudentId?: string | null },
): Promise<{ result: DuplicateResult; cacheKey: string }> {
  const cacheKey = buildCacheKey(DUPLICATE_CACHE_NAMESPACE, payload, criteria, options ?? {});
  let result = cache.get<DuplicateResult>(cacheKey);

  if (!result) {
    result = await detectDuplicates(supabaseClient, payload, criteria, options);
    cache.set(cacheKey, result, CACHE_TTLS.duplicateDetection);
  }

  return { result, cacheKey };
}

function invalidateDuplicateCache() {
  cache.invalidateByPrefix(DUPLICATE_CACHE_PREFIX);
}

/**
 * Validates the API key from the request header.
 *
 * SECURITY NOTE: These endpoints use the service-role key and bypass RLS.
 * INTERNAL_API_KEY is REQUIRED in production (enforced at module load).
 * In non-production environments, if INTERNAL_API_KEY is not set, a warning
 * is logged but requests are allowed (for development convenience).
 *
 * Additional security layers recommended:
 * - Infrastructure-level auth (VPN, internal network)
 * - Session-based auth (NextAuth, etc.)
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

const studentSearchSchema = z
  .object({
    phone_number: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    date_of_birth: z
      .union([
        z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), {
          message: "Invalid date_of_birth format",
        }),
        z.date(),
      ])
      .optional(),
    aadhar_number: z.string().optional(),
    guardian_phone: z.string().optional(),
    pan_number: z.string().optional(),
    extraFields: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== null), {
    message: "At least one field must be provided for duplicate detection",
  });

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

function validateExtraFieldKeys(extraFields: Record<string, unknown>): string[] {
  const invalidKeys: string[] = [];
  const schemaShape = studentExtraFieldsSchema.shape;

  for (const key of Object.keys(extraFields)) {
    if (!(key in schemaShape)) {
      invalidKeys.push(key);
    }
  }

  return invalidKeys;
}

function coerceExtraFieldTypes(extraFields: Record<string, unknown>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  const booleanFields = ["mentor_assigned", "whatsapp_opt_in"];

  for (const [key, value] of Object.entries(extraFields)) {
    if (booleanFields.includes(key) && typeof value === "string") {
      if (value.toLowerCase() === "true") {
        coerced[key] = true;
      } else if (value.toLowerCase() === "false") {
        coerced[key] = false;
      } else {
        coerced[key] = value;
      }
    } else {
      coerced[key] = value;
    }
  }

  return coerced;
}

export async function POST(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { studentData, options = {} } = body;

    if (!studentData) {
      return NextResponse.json(
        {
          success: false,
          error: "Student data is required",
        },
        { status: 400 },
      );
    }

    const validatedData = studentSearchSchema.parse(studentData);

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    const { result } = await getDuplicateResultWithCache(supabase, validatedData, criteria, {
      excludeStudentId: options.excludeStudentId,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        },
        { status: 400 },
      );
    }
    console.error("Error detecting duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
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
    const { studentData, createIfNoDuplicates = false, options = {} } = body;

    if (!studentData) {
      return NextResponse.json(
        {
          success: false,
          error: "Student data is required",
        },
        { status: 400 },
      );
    }

    const validatedSearchData = studentSearchSchema.parse(studentData);

    const supabase = getSupabaseClient();

    const criteria = options.preset
      ? getPreset(options.preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : options.criteria || DEFAULT_MATCHING_CRITERIA;

    let result: DuplicateResult;
    if (createIfNoDuplicates) {
      result = await detectDuplicates(supabase, validatedSearchData, criteria, {
        excludeStudentId: options.excludeStudentId,
      });
    } else {
      ({ result } = await getDuplicateResultWithCache(supabase, validatedSearchData, criteria, {
        excludeStudentId: options.excludeStudentId,
      }));
    }

    if (!result.hasPotentialDuplicates && createIfNoDuplicates) {
      try {
        const validatedData = studentInsertSchema.parse(studentData);

        const extraFields = validatedData.extra_fields ?? {};

        const registryValidation = validateJsonbPayload("students", "extra_fields", extraFields, {
          allowPartial: false,
          stripUnknownKeys: false,
        });

        if (!registryValidation.success) {
          return NextResponse.json(
            {
              success: false,
              created: false,
              error: "Extra fields validation failed",
              fieldErrors: registryValidation.errors,
              unknownKeys: registryValidation.unknownKeys,
              duplicateCheckResult: result,
            },
            { status: 400 },
          );
        }

        const sanitizedExtraFields = stripNullValuesFromExtraFields(
          (registryValidation.data as Record<string, unknown>) ?? extraFields,
        );

        const certificationType = sanitizedExtraFields.certification_type as
          | CertificationType
          | null
          | undefined;

        const batchValidation = validateBatchCodeFromExtraFields(
          sanitizedExtraFields,
          certificationType,
        );

        if (!batchValidation.success) {
          return NextResponse.json(
            {
              success: false,
              created: false,
              error: "Invalid batch_code",
              fieldErrors: [
                {
                  path: "extra_fields.batch_code",
                  message: batchValidation.error,
                  code: "invalid_batch_code",
                },
              ],
              duplicateCheckResult: result,
            },
            { status: 400 },
          );
        }

        const dataToInsert = {
          ...validatedData,
          extra_fields: sanitizedExtraFields,
        };

        const auditContext = buildAuditContext(request, "students:create");
        const { data: newStudent, error: insertError } = await supabase.rpc(
          "students_insert_with_audit",
          {
            payload: dataToInsert,
            p_actor: auditContext.actor,
            p_request_id: auditContext.requestId,
          },
        );

        if (insertError) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to create student: ${insertError.message}`,
              duplicateCheckResult: result,
            },
            { status: 500 },
          );
        }

        invalidateDuplicateCache();

        return NextResponse.json({
          success: true,
          created: true,
          student: newStudent,
          duplicateCheckResult: result,
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: "Validation error",
              fieldErrors: validationError.issues.map((e) => ({
                path: e.path.join("."),
                message: e.message,
                code: e.code,
              })),
              duplicateCheckResult: result,
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          {
            success: false,
            error: "Validation error occurred",
            duplicateCheckResult: result,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      created: false,
      duplicateCheckResult: result,
      message: result.hasPotentialDuplicates
        ? "Potential duplicates found. Student not created."
        : "No duplicates found but createIfNoDuplicates was false.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        },
        { status: 400 },
      );
    }
    console.error("Error in student creation with duplicate check:", error);
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
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const aadhar = searchParams.get("aadhar");
    const firstName = searchParams.get("firstName");
    const lastName = searchParams.get("lastName");
    const preset = searchParams.get("preset");

    const extraFields: Record<string, unknown> = {};
    for (const [key, value] of searchParams.entries()) {
      const match = key.match(/^extraField\[(.+)\]$/);
      if (match) {
        extraFields[match[1]] = value;
      }
    }

    const hasStandardFields = phone || email || aadhar || firstName || lastName;
    const hasExtraFields = Object.keys(extraFields).length > 0;

    if (!hasStandardFields && !hasExtraFields) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one search parameter is required (phone, email, aadhar, firstName, lastName, or extraField[key])",
        },
        { status: 400 },
      );
    }

    if (hasExtraFields) {
      const invalidKeys = validateExtraFieldKeys(extraFields);
      if (invalidKeys.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid extra field keys: ${invalidKeys.join(", ")}. Please use valid fields from the students.extra_fields schema.`,
          },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseClient();

    if (!hasStandardFields && hasExtraFields) {
      const { data: students, error: searchError } = await supabase
        .from("students")
        .select("*")
        .contains("extra_fields", extraFields);

      if (searchError) {
        return NextResponse.json(
          {
            success: false,
            error: `Search error: ${searchError.message}`,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        result: {
          hasPotentialDuplicates: students && students.length > 0,
          matches: students || [],
          totalMatches: students?.length || 0,
        },
      });
    }

    const studentData: Record<string, string> = {};
    if (phone) studentData.phone_number = phone;
    if (email) studentData.email = email;
    if (aadhar) studentData.aadhar_number = aadhar;
    if (firstName) studentData.first_name = firstName;
    if (lastName) studentData.last_name = lastName;

    const criteria = preset
      ? getPreset(preset)?.criteria || DEFAULT_MATCHING_CRITERIA
      : DEFAULT_MATCHING_CRITERIA;

    const { result } = await getDuplicateResultWithCache(supabase, studentData, criteria);

    if (hasExtraFields && result.matches && result.matches.length > 0) {
      const matchedIds = result.matches.map((match) => match.student.id);

      const coercedExtraFields = coerceExtraFieldTypes(extraFields);

      const { data: matchingStudents, error: filterError } = await supabase
        .from("students")
        .select("id")
        .in("id", matchedIds)
        .contains("extra_fields", coercedExtraFields);

      if (filterError) {
        return NextResponse.json(
          {
            success: false,
            error: `Error filtering by extra fields: ${filterError.message}`,
          },
          { status: 500 },
        );
      }

      const matchingIdSet = new Set(matchingStudents?.map((s) => s.id) || []);
      const filteredMatches = result.matches.filter((match) => matchingIdSet.has(match.student.id));

      return NextResponse.json({
        success: true,
        result: {
          ...result,
          matches: filteredMatches,
          totalMatches: filteredMatches.length,
          hasPotentialDuplicates: filteredMatches.length > 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error searching for duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
