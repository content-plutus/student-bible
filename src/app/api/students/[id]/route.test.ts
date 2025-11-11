/**
 * @jest-environment node
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/types/student", () => ({
  studentUpdateSchema: {
    parse: jest.fn((data) => data),
  },
}));

jest.mock("@/lib/utils/auditContext", () => ({
  buildAuditContext: jest.fn(() => ({
    actor: "test-actor",
    requestId: "test-request-id",
  })),
}));

const { createClient } = jest.requireMock("@supabase/supabase-js") as {
  createClient: jest.Mock;
};
const { studentUpdateSchema } = jest.requireMock("@/lib/types/student") as {
  studentUpdateSchema: { parse: jest.Mock };
};

const API_KEY = "test-internal-key";

const buildRequest = (
  method: "GET" | "PATCH",
  headers?: Record<string, string>,
  body?: unknown,
) => {
  const url = new URL("http://localhost/api/students/abc");
  const init: RequestInit = {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      "X-Internal-API-Key": API_KEY,
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
};

const buildContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const createMockSupabase = (options?: {
  student?: Record<string, unknown>;
  selectError?: { code: string; message: string } | null;
  rpcResult?: { data: Record<string, unknown> | null; error: { message: string } | null };
}) => {
  const studentRecord =
    options?.student ??
    ({
      id: "student-123",
      phone_number: "9876543210",
      email: "student@example.com",
      extra_fields: { lead_source: "Referral" },
    } as Record<string, unknown>);

  const selectSingle = jest.fn().mockResolvedValue({
    data: studentRecord,
    error: options?.selectError ?? null,
  });

  const eq = jest.fn().mockReturnValue({ single: selectSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn(() => ({ select }));

  const rpc = jest.fn().mockResolvedValue(
    options?.rpcResult ?? {
      data: { ...studentRecord, updated: true },
      error: null,
    },
  );

  return {
    from,
    rpc,
    selectSingle,
  };
};

describe("/api/students/[id]", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("returns student details when GET succeeds", async () => {
    const mockSupabase = createMockSupabase();
    createClient.mockReturnValue(mockSupabase);

    const { GET } = await import("./route");
    const response = await GET(buildRequest("GET"), buildContext("student-123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.student.id).toBe("student-123");
    expect(mockSupabase.from).toHaveBeenCalledWith("students");
  });

  it("returns 401 when API key header is missing", async () => {
    const mockSupabase = createMockSupabase();
    createClient.mockReturnValue(mockSupabase);

    const { GET } = await import("./route");
    const url = new URL("http://localhost/api/students/abc");
    const request = new NextRequest(url, { method: "GET" });
    const response = await GET(request, buildContext("student-123"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when the student does not exist", async () => {
    const mockSupabase = createMockSupabase({
      student: null as never,
      selectError: { code: "PGRST116", message: "No rows" },
    });
    createClient.mockReturnValue(mockSupabase);

    const { GET } = await import("./route");
    const response = await GET(buildRequest("GET"), buildContext("missing"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("updates a student profile via PATCH", async () => {
    const mockSupabase = createMockSupabase();
    createClient.mockReturnValue(mockSupabase);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      buildRequest("PATCH", undefined, {
        phone_number: "9876543210",
        extra_fields: { lead_source: "Referral" },
      }),
      buildContext("student-123"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.student.id).toBe("student-123");
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "students_update_profile",
      expect.objectContaining({
        student_id: "student-123",
        core_patch: { phone_number: "9876543210" },
        extra_patch: { lead_source: "Referral" },
        strip_nulls: true,
        p_actor: "test-actor",
        p_request_id: "test-request-id",
      }),
    );
  });

  it("returns validation errors from PATCH requests", async () => {
    studentUpdateSchema.parse.mockImplementationOnce(() => {
      throw new ZodError([]);
    });
    const mockSupabase = createMockSupabase();
    createClient.mockReturnValue(mockSupabase);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      buildRequest("PATCH", undefined, {
        phone_number: "bad",
      }),
      buildContext("student-123"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_FAILED");
  });
});
