/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const API_KEY = "test-api-key";

const basePayload = {
  phone_number: "9876543210",
  email: "student@example.com",
  first_name: "John",
  last_name: "Doe",
  gender: "Male",
  date_of_birth: "1995-05-15",
  guardian_phone: "8765432109",
  salutation: "Mr",
  father_name: "Rick Doe",
  mother_name: "Jane Doe",
  aadhar_number: "234123451235",
  pan_number: "ABCDE1234F",
  enrollment_status: "Active",
  education_level: "Graduate",
  stream: "Commerce",
  certification_type: "ACCA",
  extra_fields: {
    cohort: "2024",
  },
};

const createRequest = (body: unknown, headers?: Record<string, string>) => {
  const url = new URL("http://localhost/api/sync");
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Internal-API-Key": API_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

describe("POST /api/sync", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = API_KEY;
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it("rejects requests without the API key header", async () => {
    const { POST } = await import("./route");
    const url = new URL("http://localhost/api/sync");
    const response = await POST(
      new NextRequest(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(basePayload),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Unauthorized");
  });

  it("returns validation errors when payload is incomplete", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        ...basePayload,
        phone_number: undefined,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Validation failed");
    expect(payload.details[0].field).toBe("phone_number");
  });

  it("synchronizes data and preserves unknown enum values", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        ...basePayload,
        gender: "Hero",
        salutation: "Captain",
        education_level: "Space Cadet",
        stream: "Magic",
        certification_type: "Wizardry",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain("synchronized");
    expect(payload.data).toBeDefined();
    expect(payload.unknownEnumValues).toEqual({
      original_gender: "Hero",
      original_salutation: "Captain",
      original_education_level: "Space Cadet",
      original_stream: "Magic",
      original_certification_type: "Wizardry",
    });
  });
});
