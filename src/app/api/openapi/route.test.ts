/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const API_KEY = "test-api-key";
const mockOpenApiDoc = {
  openapi: "3.0.0",
  paths: {
    "/api/students": {
      post: {},
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey" },
    },
  },
};

jest.mock("@asteasolutions/zod-to-openapi", () => {
  const actual = jest.requireActual("@asteasolutions/zod-to-openapi");
  return {
    ...actual,
    OpenApiGeneratorV3: jest.fn().mockImplementation(() => ({
      generateDocument: jest.fn().mockReturnValue(mockOpenApiDoc),
    })),
  };
});

const createRequest = (headers: Record<string, string> = {}) => {
  const url = new URL("http://localhost/api/openapi");
  return new NextRequest(url, {
    method: "GET",
    headers,
  });
};

describe("GET /api/openapi", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("rejects requests without the internal API key header", async () => {
    const { GET } = await import("./route");
    const response = await GET(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Unauthorized");
  });

  it("returns the OpenAPI document when authenticated", async () => {
    const { GET } = await import("./route");
    const response = await GET(createRequest({ "X-Internal-API-Key": API_KEY }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.openapi).toBe("3.0.0");
    expect(payload.paths["/api/students"]).toBeDefined();
    expect(payload.components.securitySchemes.ApiKeyAuth).toBeDefined();
  });
});
