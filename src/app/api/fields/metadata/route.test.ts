/**
 * @jest-environment node
 */

import { describe, it, expect } from "@jest/globals";
import { NextRequest } from "next/server";

const createRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost/api/fields/metadata");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
};

describe("GET /api/fields/metadata", () => {
  it("returns metadata for the requested table", async () => {
    const { GET } = await import("./route");
    const response = await GET(createRequest({ table: "students" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.tables).toHaveLength(1);
    expect(payload.tables[0].name).toBe("students");
    expect(payload.tables[0].coreFields.length).toBeGreaterThan(0);
  });

  it("omits core fields when includeCore=false is passed", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest({
        table: "students",
        includeCore: "false",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.tables[0].coreFields).toHaveLength(0);
    expect(Array.isArray(payload.tables[0].jsonbColumns)).toBe(true);
  });

  it("returns 404 when no metadata matches the provided filters", async () => {
    const { GET } = await import("./route");
    const response = await GET(createRequest({ table: "unknown_table" }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("No metadata found");
  });
});
