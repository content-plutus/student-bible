/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

jest.mock("@/lib/services/transformationService", () => ({
  transformationService: {
    transformImportData: jest.fn(),
    previewTransformation: jest.fn(),
    getAvailableMappings: jest.fn(),
    registerFieldMapping: jest.fn(),
    resetMappingsFor: jest.fn(),
  },
}));

const { transformationService } = jest.requireMock("@/lib/services/transformationService") as {
  transformationService: {
    transformImportData: jest.Mock;
    previewTransformation: jest.Mock;
    getAvailableMappings: jest.Mock;
  };
};

const API_KEY = "test-api-key";

const buildRequest = (
  method: "GET" | "POST",
  options: {
    params?: Record<string, string>;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) => {
  const url = new URL("http://localhost/api/transform");
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit = {
    method,
    headers: {
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
      "X-Internal-API-Key": API_KEY,
      ...options.headers,
    },
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(url, init);
};

describe("/api/transform", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("rejects POST requests without the API key", async () => {
    const { POST } = await import("./route");
    const url = new URL("http://localhost/api/transform");
    const request = new NextRequest(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        table: "students",
        column: "extra_fields",
        data: [],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Unauthorized");
  });

  it("transforms batch data using registered rules", async () => {
    transformationService.transformImportData.mockReturnValue([
      { data: { normalized: true }, appliedRules: ["normalize_phone"] },
    ]);

    const { POST } = await import("./route");
    const response = await POST(
      buildRequest("POST", {
        body: {
          table: "students",
          column: "extra_fields",
          data: [{ phone: "9876543210" }],
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.transformedData).toEqual([{ normalized: true }]);
    expect(payload.appliedRules).toEqual([["normalize_phone"]]);
    expect(transformationService.transformImportData).toHaveBeenCalledWith(
      "students",
      "extra_fields",
      [{ phone: "9876543210" }],
    );
  });

  it("previews transformations for single objects and optional rules", async () => {
    transformationService.previewTransformation.mockReturnValue({
      original: { certification_type: "Unknown" },
      transformed: { certification_type: "ACCA" },
      appliedRules: ["normalize_certification"],
    });

    const { POST } = await import("./route");
    const response = await POST(
      buildRequest("POST", {
        body: {
          table: "students",
          column: "extra_fields",
          data: { certification_type: "Unknown" },
          rules: [{ description: "Normalize certification" }],
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.original).toEqual({ certification_type: "Unknown" });
    expect(payload.transformedData).toEqual({ certification_type: "ACCA" });
    expect(payload.appliedRules).toEqual(["normalize_certification"]);
    expect(transformationService.previewTransformation).toHaveBeenCalledWith(
      "students",
      "extra_fields",
      { certification_type: "Unknown" },
      [{ description: "Normalize certification" }],
    );
  });

  it("returns available mappings via GET", async () => {
    const rules = [{ description: "Normalize names" }];
    transformationService.getAvailableMappings.mockReturnValue(rules);

    const { GET } = await import("./route");
    const response = await GET(
      buildRequest("GET", {
        params: { table: "students", column: "extra_fields" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.count).toBe(1);
    expect(payload.mappings).toEqual(rules);
  });

  it("validates table/column combinations for GET", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      buildRequest("GET", {
        params: { table: "students", column: "invalid" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Invalid JSONB column");
  });

  it("validates table/column combinations for POST", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      buildRequest("POST", {
        body: {
          table: "students",
          column: "invalid",
          data: [{ name: "John" }],
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Invalid JSONB column");
    expect(transformationService.transformImportData).not.toHaveBeenCalled();
    expect(transformationService.previewTransformation).not.toHaveBeenCalled();
  });
});
