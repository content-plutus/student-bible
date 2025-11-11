/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: jest.fn(),
}));

type SupabaseModule = typeof import("@/lib/supabase/server");
const { supabaseAdmin } = jest.requireMock("@/lib/supabase/server") as {
  supabaseAdmin: jest.MockedFunction<SupabaseModule["supabaseAdmin"]>;
};

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const createMockSupabase = (options?: { error?: Error | null }) => {
  const limit = jest.fn().mockResolvedValue({
    data: [],
    error: options?.error ?? null,
  });

  const select = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ select });

  return {
    from,
  };
};

describe("GET /api/health", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = REQUIRED_ENV.SUPABASE_SERVICE_ROLE_KEY;
    process.env.INTERNAL_API_KEY = "health-check-key";
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("reports healthy status when environment and database checks pass", async () => {
    const mockSupabase = createMockSupabase();
    supabaseAdmin.mockReturnValue(mockSupabase as never);

    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.dependencies.environment.status).toBe("healthy");
    expect(payload.dependencies.database.status).toBe("healthy");
    expect(supabaseAdmin).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith("students");
  });

  it("returns 503 when required environment variables are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.dependencies.environment.status).toBe("unhealthy");
    expect(payload.dependencies.database.status).toBe("unhealthy");
    expect(supabaseAdmin).not.toHaveBeenCalled();
  });

  it("surfaces database errors when the health query fails", async () => {
    const mockSupabase = createMockSupabase({ error: new Error("database unavailable") });
    supabaseAdmin.mockReturnValue(mockSupabase as never);

    const { GET } = await import("./route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.dependencies.database.status).toBe("unhealthy");
    expect(payload.dependencies.database.error).toContain("database unavailable");
  });
});
