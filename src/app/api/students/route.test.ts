/**
 * @jest-environment node
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/validators/duplicateDetector", () => ({
  detectDuplicates: jest.fn(),
}));

jest.mock("@/lib/jsonb/schemaRegistry", () => {
  const actual = jest.requireActual("@/lib/jsonb/schemaRegistry");
  return {
    ...actual,
    validateJsonbPayload: jest.fn(),
  };
});

jest.mock("@/lib/validators/schemaEvolution", () => ({
  validateBatchCodeFromExtraFields: jest.fn().mockReturnValue({ success: true }),
  stripNullValuesFromExtraFields: jest.fn((fields) => fields),
}));

jest.mock("@/lib/types/student", () => ({
  studentInsertSchema: {
    parse: jest.fn((data) => data),
  },
}));

const { createClient } = jest.requireMock("@supabase/supabase-js") as {
  createClient: jest.Mock;
};
const { detectDuplicates } = jest.requireMock("@/lib/validators/duplicateDetector") as {
  detectDuplicates: jest.Mock;
};
const { validateJsonbPayload } = jest.requireMock("@/lib/jsonb/schemaRegistry") as {
  validateJsonbPayload: jest.Mock;
};
const {
  validateBatchCodeFromExtraFields,
  stripNullValuesFromExtraFields,
} = jest.requireMock("@/lib/validators/schemaEvolution") as {
  validateBatchCodeFromExtraFields: jest.Mock;
  stripNullValuesFromExtraFields: jest.Mock;
};
const { studentInsertSchema } = jest.requireMock("@/lib/types/student") as {
  studentInsertSchema: { parse: jest.Mock };
};

const API_KEY = "test-internal-key";

const createRequest = (
  method: "POST" | "PUT",
  body: unknown,
  headers?: Record<string, string>,
) => {
  const url = new URL("http://localhost/api/students");
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
      "X-Internal-API-Key": API_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const createGetRequest = (params?: Record<string, string>, headers?: Record<string, string>) => {
  const url = new URL("http://localhost/api/students");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url, {
    method: "GET",
    headers: {
      "X-Internal-API-Key": API_KEY,
      ...headers,
    },
  });
};

const createMockSupabase = () => {
  const insertSingle = jest.fn().mockResolvedValue({
    data: {
      id: "student-123",
      phone_number: "9876543210",
      email: "student@example.com",
      extra_fields: { lead_source: "Referral" },
    },
    error: null,
  });
  const selectAfterInsert = jest.fn().mockReturnValue({ single: insertSingle });
  const insert = jest.fn().mockReturnValue({ select: selectAfterInsert });

  const contains = jest.fn().mockResolvedValue({ data: [], error: null });
  const select = jest.fn().mockReturnValue({
    contains,
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  const from = jest.fn(() => ({
    insert,
    select,
  }));

  return {
    from,
    insert,
    select,
    insertSingle,
    contains,
  };
};

const mockDuplicateResult = {
  hasPotentialDuplicates: false,
  matches: [],
  totalMatches: 0,
  criteria: { overallThreshold: 0.8 },
};

describe("/api/students", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
    jest.clearAllMocks();
    createClient.mockReturnValue(createMockSupabase());
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("rejects POST requests without the internal API key", async () => {
    const { POST } = await import("./route");
    const url = new URL("http://localhost/api/students");
    const response = await POST(
      new NextRequest(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentData: { phone_number: "9876543210" } }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Unauthorized");
  });

  it("returns duplicate detection results via POST", async () => {
    detectDuplicates.mockResolvedValue({
      ...mockDuplicateResult,
      hasPotentialDuplicates: true,
      matches: [
        {
          student: { id: "s1", phone_number: "9876543210" },
          overallScore: 0.91,
          fieldScores: [],
          matchedCrossFieldRules: [],
          confidence: "high",
        },
      ],
    });

    const { POST } = await import("./route");
    const response = await POST(
      createRequest("POST", {
        studentData: {
          phone_number: "9876543210",
          email: "student@example.com",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.result.hasPotentialDuplicates).toBe(true);
    expect(payload.result.matches).toHaveLength(1);
    expect(detectDuplicates).toHaveBeenCalledTimes(1);
  });

  it("creates a student when PUT is called with createIfNoDuplicates", async () => {
    detectDuplicates.mockResolvedValue(mockDuplicateResult);
    validateJsonbPayload.mockReturnValue({
      success: true,
      data: { lead_source: "Referral", certification_type: "ACCA" },
    });
    stripNullValuesFromExtraFields.mockReturnValue({
      lead_source: "Referral",
      certification_type: "ACCA",
    });
    validateBatchCodeFromExtraFields.mockReturnValue({ success: true });

    const { PUT } = await import("./route");
    const response = await PUT(
      createRequest("PUT", {
        createIfNoDuplicates: true,
        studentData: {
          phone_number: "9876543210",
          email: "student@example.com",
          first_name: "John",
          last_name: "Doe",
          extra_fields: {
            lead_source: "Referral",
            certification_type: "ACCA",
          },
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.created).toBe(true);
    expect(payload.student.id).toBe("student-123");
    expect(studentInsertSchema.parse).toHaveBeenCalled();
    expect(validateJsonbPayload).toHaveBeenCalled();
    expect(validateBatchCodeFromExtraFields).toHaveBeenCalled();
  });

  it("requires at least one search parameter for GET requests", async () => {
    const { GET } = await import("./route");
    const response = await GET(createGetRequest());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("At least one search parameter");
  });

  it("returns duplicate results for GET search queries", async () => {
    detectDuplicates.mockResolvedValue({
      ...mockDuplicateResult,
      hasPotentialDuplicates: true,
      totalMatches: 1,
      matches: [
        {
          student: { id: "s1", phone_number: "9876543210" },
          overallScore: 0.93,
          fieldScores: [],
          matchedCrossFieldRules: [],
          confidence: "high",
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(
      createGetRequest({
        phone: "9876543210",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.result.totalMatches).toBe(1);
    expect(detectDuplicates).toHaveBeenCalled();
  });
});
