/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

jest.mock("@/lib/services/transformationService", () => ({
  transformationService: {
    getAvailableMappings: jest.fn(),
    registerFieldMapping: jest.fn(),
    resetMappingsFor: jest.fn(),
    transformImportData: jest.fn(),
    previewTransformation: jest.fn(),
    clearMappings: jest.fn(),
  },
}));

type TransformationServiceModule = typeof import("@/lib/services/transformationService");
const { transformationService } = jest.requireMock("@/lib/services/transformationService") as {
  transformationService: {
    getAvailableMappings: jest.Mock;
    registerFieldMapping: jest.Mock;
    resetMappingsFor: jest.Mock;
  };
};

const API_KEY = "test-api-key";

const createRequest = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  options: {
    params?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) => {
  const url = new URL("http://localhost/api/mappings");
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit = {
    method,
    headers: {
      ...(method !== "GET" ? { "content-type": "application/json" } : {}),
      "X-Internal-API-Key": API_KEY,
      ...options.headers,
    },
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(url, init);
};

describe("/api/mappings", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("rejects requests without the API key header", async () => {
    const { GET } = await import("./route");
    const url = new URL("http://localhost/api/mappings");
    const request = new NextRequest(url);

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Unauthorized");
  });

  it("returns mappings for a specific table and column", async () => {
    const rules = [{ description: "Normalize phone numbers" }];
    transformationService.getAvailableMappings.mockReturnValue(rules);

    const { GET } = await import("./route");
    const response = await GET(
      createRequest("GET", {
        params: { table: "students", column: "extra_fields" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.table).toBe("students");
    expect(payload.column).toBe("extra_fields");
    expect(payload.mappings).toEqual(rules);
    expect(payload.count).toBe(1);
    expect(transformationService.getAvailableMappings).toHaveBeenCalledWith(
      "students",
      "extra_fields",
    );
  });

  it("validates table and column combinations", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("GET", {
        params: { table: "students", column: "unknown_column" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Invalid JSONB column");
    expect(transformationService.getAvailableMappings).not.toHaveBeenCalled();
  });

  it("returns aggregated mappings when no filters are provided", async () => {
    const ruleSet = [{ description: "Rule" }];
    transformationService.getAvailableMappings.mockImplementation((table: string) => {
      return table === "students" ? ruleSet : [];
    });

    const { GET } = await import("./route");
    const response = await GET(createRequest("GET"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.mappings.students.extra_fields).toEqual(ruleSet);
    expect(payload.validCombinations.students).toContain("extra_fields");
  });

  it("registers new mappings via POST", async () => {
    const rules = [{ description: "Map certification", rename: { source: "target" } }];
    transformationService.getAvailableMappings.mockReturnValue(rules);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest("POST", {
        body: {
          table: "students",
          column: "extra_fields",
          rules,
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.addedRules).toBe(rules.length);
    expect(payload.totalRules).toBe(rules.length);
    expect(transformationService.registerFieldMapping).toHaveBeenCalledWith(
      "students",
      "extra_fields",
      rules,
    );
  });

  it("rejects invalid POST payloads", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest("POST", {
        body: {
          table: "students",
          column: "extra_fields",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Validation failed");
  });

  it("supports replacing mappings via PUT", async () => {
    const rules = [{ description: "Rule A" }];
    transformationService.getAvailableMappings.mockReturnValue(rules);

    const { PUT } = await import("./route");
    const response = await PUT(
      createRequest("PUT", {
        body: {
          table: "students",
          column: "extra_fields",
          rules,
          replace: true,
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("Replaced rules");
    expect(transformationService.resetMappingsFor).toHaveBeenCalledWith("students", "extra_fields");
    expect(transformationService.registerFieldMapping).toHaveBeenCalledWith(
      "students",
      "extra_fields",
      rules,
    );
  });

  it("clears mappings via DELETE", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(
      createRequest("DELETE", {
        body: {
          table: "students",
          column: "extra_fields",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("Cleared custom rules");
    expect(transformationService.resetMappingsFor).toHaveBeenCalledWith("students", "extra_fields");
  });
});
