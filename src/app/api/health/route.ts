import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  calculateOverallStatus,
  mapStatusesByName,
  type DependencyStatus,
  type DependencyState,
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
  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

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
    { status: statusCode },
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

  // Create a timeout promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Database query timeout"));
    }, DATABASE_QUERY_TIMEOUT_MS);
  });

  try {
    const supabase = supabaseAdmin();
    // Race the database query against the timeout
    const { error } = await Promise.race([
      supabase.from("students").select("id").limit(1),
      timeoutPromise,
    ]);

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
    const latencyMs = Number((performance.now() - started).toFixed(2));

    // Check if error is due to timeout
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
