import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import {
  calculateOverallStatus,
  mapStatusesByName,
  type DependencyState,
  type DependencyStatus,
} from "@/lib/health/status";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_ENV_VARS = ["INTERNAL_API_KEY"];
const DATABASE_DEGRADED_THRESHOLD_MS = 750;
const DATABASE_QUERY_TIMEOUT_MS = 5000; // 5 second timeout for database queries
const SERVER_STARTED_AT = Date.now();

export async function GET() {
  const environmentStatus = checkEnvironment();
  const databaseStatus = await checkDatabase();

  const dependencyStatuses = [environmentStatus, databaseStatus];
  const dependencies = mapStatusesByName(dependencyStatuses);
  const overallStatus = calculateOverallStatus(dependencyStatuses);

  return NextResponse.json(
    {
      success: overallStatus === "healthy",
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(process.uptime()),
        startedAt: new Date(SERVER_STARTED_AT).toISOString(),
      },
      dependencies,
      meta: {
        version: process.env.npm_package_version ?? "dev",
        commit: process.env.VERCEL_GIT_COMMIT_SHA,
      },
    },
    { status: overallStatus === "unhealthy" ? 503 : 200 },
  );
}

function checkEnvironment(): DependencyStatus {
  const missingRequired = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const missingOptional = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);

  let status: DependencyState = "healthy";
  if (missingRequired.length > 0) {
    status = "unhealthy";
  } else if (missingOptional.length > 0) {
    status = "degraded";
  }

  return {
    name: "environment",
    status,
    checkedAt: new Date().toISOString(),
    ...(missingRequired.length > 0 && {
      error: `Missing required env vars: ${missingRequired.join(", ")}`,
    }),
    ...(missingOptional.length > 0 &&
      missingRequired.length === 0 && {
        error: `Missing optional env vars: ${missingOptional.join(", ")}`,
      }),
    details: {
      required: REQUIRED_ENV_VARS,
      optional: OPTIONAL_ENV_VARS,
      missingRequired,
      missingOptional,
    },
  };
}

async function checkDatabase(): Promise<DependencyStatus> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const missingSupabaseEnv = REQUIRED_ENV_VARS.filter((env) => !process.env[env]);
  if (missingSupabaseEnv.length > 0) {
    return {
      name: "database",
      status: "unhealthy",
      checkedAt,
      error: `Missing Supabase env vars: ${missingSupabaseEnv.join(", ")}`,
      details: {
        missingEnv: missingSupabaseEnv,
      },
    };
  }

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  // Create a timeout promise that aborts the controller and rejects with AbortError
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const abortError = new Error("Database query timeout");
      abortError.name = "AbortError";
      reject(abortError);
    }, DATABASE_QUERY_TIMEOUT_MS);
  });

  try {
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = supabaseAdmin();
    // Create the query promise
    const queryPromise = supabase.from("students").select("id").limit(1);

    // Always attach a catch handler to consume rejections and prevent unhandled promise rejections
    // This is critical: if the timeout fires first, the query promise will still reject later
    // and we need to consume that rejection to prevent it from becoming unhandled
    queryPromise.catch(() => {
      // Silently consume the rejection if timeout already fired
      // This prevents unhandled promise rejections when timeout wins the race
      if (controller.signal.aborted) {
        // Timeout already occurred, ignore this rejection
        return;
      }
      // If timeout hasn't fired yet, the error will be handled by Promise.race below
    });

    // Race the database query against the timeout
    // Note: Supabase PostgREST client doesn't directly support abortSignal in the query chain,
    // but Promise.race ensures we don't hang, and the timeout is properly cleaned up
    const { error } = await Promise.race([queryPromise, timeoutPromise]);

    // Clear timeout on success
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (error) {
      throw error;
    }

    const latencyMs = Number((performance.now() - started).toFixed(2));
    const status: DependencyState =
      latencyMs > DATABASE_DEGRADED_THRESHOLD_MS ? "degraded" : "healthy";

    return {
      name: "database",
      status,
      checkedAt,
      latencyMs,
      ...(status === "degraded" && {
        error: `High latency detected (${latencyMs}ms, threshold ${DATABASE_DEGRADED_THRESHOLD_MS}ms)`,
      }),
      details: {
        table: "students",
        thresholdMs: DATABASE_DEGRADED_THRESHOLD_MS,
      },
    };
  } catch (error) {
    // Clear timeout in error path to prevent leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const latencyMs = Number((performance.now() - started).toFixed(2));

    // Check if error is due to timeout/abort
    // The timeout promise creates an Error with name "AbortError"
    const isTimeoutError =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.includes("timeout") ||
        error.message.includes("aborted"));

    return {
      name: "database",
      status: "unhealthy",
      checkedAt,
      latencyMs,
      error: isTimeoutError
        ? `Database query timeout after ${DATABASE_QUERY_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "Unknown database error",
      details: {
        code:
          typeof error === "object" && error && "code" in error
            ? (error as { code?: string }).code
            : undefined,
        ...(isTimeoutError && {
          timeoutMs: DATABASE_QUERY_TIMEOUT_MS,
        }),
      },
    };
  }
}
