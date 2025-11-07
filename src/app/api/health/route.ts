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
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("students").select("id").limit(1);

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

    return {
      name: "database",
      status: "unhealthy",
      checkedAt,
      latencyMs,
      error: error instanceof Error ? error.message : "Unknown database error",
      details: {
        code:
          typeof error === "object" && error && "code" in error
            ? (error as { code?: string }).code
            : undefined,
      },
    };
  }
}
