import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { studentUpdateSchema } from "@/lib/types/student";
import {
  withErrorHandling,
  createSuccessResponse,
  NotFoundError,
  AuthenticationError,
  handleDatabaseOperation,
  ErrorCode,
} from "@/lib/errors";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
function validateApiKey(request: NextRequest): void {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    console.warn(
      "WARNING: INTERNAL_API_KEY not set. API endpoints are unprotected. " +
        "This is only allowed in non-production environments.",
    );
    return;
  }

  const requestApiKey = request.headers.get("X-Internal-API-Key");

  if (!requestApiKey || requestApiKey !== apiKey) {
    throw new AuthenticationError(
      "Unauthorized. Valid X-Internal-API-Key header required.",
      ErrorCode.UNAUTHORIZED,
      {
        metadata: {
          endpoint: request.nextUrl.pathname,
          method: request.method,
        },
      },
    );
  }
}

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const GET = withErrorHandling(
  async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {
    validateApiKey(request);

    const supabase = getSupabaseClient();
    const { id } = await context!.params;

    const result = await supabase.from("students").select("*").eq("id", id).single();

    if (result.error) {
      // Handle "not found" case (PGRST116 is Supabase's "no rows returned" code)
      if (result.error.code === "PGRST116") {
        throw new NotFoundError(`Student with ID ${id} not found`, {
          metadata: {
            endpoint: request.nextUrl.pathname,
            method: request.method,
          },
        });
      }
      // Re-throw other database errors to be classified by error handler
      throw result.error;
    }

    if (!result.data) {
      throw new NotFoundError(`Student with ID ${id} not found`, {
        metadata: {
          endpoint: request.nextUrl.pathname,
          method: request.method,
        },
      });
    }

    const { extra_fields, ...coreFields } = result.data;
    const mergedStudent = {
      ...coreFields,
      ...(extra_fields || {}),
    };

    return createSuccessResponse({ student: mergedStudent });
  },
);

export const PATCH = withErrorHandling(
  async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {
    validateApiKey(request);

    const body = await request.json();
    const validatedData = studentUpdateSchema.parse(body);

    const supabase = getSupabaseClient();
    const { id } = await context!.params;

    const { full_name, extra_fields, ...coreFields } = validatedData;
    void full_name;

    const updatedStudent = await handleDatabaseOperation(
      async () => {
        const { data, error: rpcError } = await supabase.rpc("students_update_profile", {
          student_id: id,
          core_patch: coreFields,
          extra_patch: extra_fields || {},
          strip_nulls: true,
        });

        if (rpcError) {
          if (rpcError.message && rpcError.message.includes("not found")) {
            throw new NotFoundError(`Student with ID ${id} not found`, {
              metadata: {
                endpoint: request.nextUrl.pathname,
                method: request.method,
              },
            });
          }
          throw rpcError;
        }

        if (!data) {
          throw new NotFoundError(`Student with ID ${id} not found`, {
            metadata: {
              endpoint: request.nextUrl.pathname,
              method: request.method,
            },
          });
        }

        return data;
      },
      {
        metadata: {
          endpoint: request.nextUrl.pathname,
          method: request.method,
        },
      },
    );

    const { extra_fields: updatedExtraFields, ...updatedCoreFields } = updatedStudent;
    const mergedStudent = {
      ...updatedCoreFields,
      ...(updatedExtraFields || {}),
    };

    return createSuccessResponse({ student: mergedStudent });
  },
);
