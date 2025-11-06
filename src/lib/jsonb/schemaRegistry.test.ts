import { describe, expect, it } from "@jest/globals";
import {
  validateJsonbPayload,
  studentExtraFieldsSchema,
  jsonbSchemaRegistry,
} from "@/lib/jsonb/schemaRegistry";

describe("jsonb schema registry", () => {
  it("validates registered schemas successfully", () => {
    const payload = {
      batch_code: "ACCA_2024_Batch_1",
      certification_type: "ACCA",
      guardian_email: "guardian@example.com",
    };

    const result = validateJsonbPayload("students", "extra_fields", payload);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it("reports validation errors for invalid data", () => {
    const payload = {
      guardian_email: "not-an-email",
    };

    const result = validateJsonbPayload("students", "extra_fields", payload);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.path).toBe("guardian_email");
  });

  it("returns unknown keys when payload includes fields outside the registry", () => {
    const payload = {
      custom_field: "value",
    };

    const result = validateJsonbPayload("students", "extra_fields", payload);

    expect(result.success).toBe(true);
    expect(result.unknownKeys).toEqual(["custom_field"]);
  });

  it("allows partial validation when requested", () => {
    const result = validateJsonbPayload(
      "students",
      "extra_fields",
      {
        notes: "Partial payload",
      },
      { allowPartial: true },
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ notes: "Partial payload" });
  });

  it("applies compatibility rules for legacy extra fields", () => {
    const result = validateJsonbPayload(
      "students",
      "extra_fields",
      {
        mentorName: "Riya Sharma",
        certificationType: "USCMA",
      },
      { allowPartial: true },
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      mentor_name: "Riya Sharma",
      certification_type: "US CMA",
    });
    expect(result.appliedCompatibilityRules).toContain(
      "Rename legacy camelCase keys to snake_case equivalents",
    );
  });

  it("returns an error when schema is not registered", () => {
    const result = validateJsonbPayload("unknown", "column", {});

    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.code).toBe("schema_not_found");
  });

  it("exposes raw schemas for direct usage in models", () => {
    const result = studentExtraFieldsSchema.safeParse({
      alternate_phone: "9876543210",
    });

    expect(result.success).toBe(true);
    expect(jsonbSchemaRegistry.get("students", "extra_fields")?.schema).toBeDefined();
  });
});
