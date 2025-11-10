import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { ZodRawShape, z } from "zod";
import { applySchemaExtensions, buildZodSchemaForField } from "@/lib/jsonb/schemaExtensionBuilder";
import { getJsonbSchemaDefinition, registerJsonbSchema } from "@/lib/jsonb/schemaRegistry";

describe("schema extension builder", () => {
  let originalDefinition: ReturnType<typeof getJsonbSchemaDefinition> | undefined;

  beforeEach(() => {
    originalDefinition = getJsonbSchemaDefinition("students", "extra_fields");
  });

  afterEach(() => {
    if (originalDefinition) {
      registerJsonbSchema(originalDefinition);
    }
  });

  it("builds optional nullable string schemas with validation", () => {
    const schema = buildZodSchemaForField({
      field_name: "linkedin_url",
      field_type: "url",
      required: false,
      validation_rules: {
        pattern: "linkedin\\.com",
      },
    });

    expect(schema.safeParse("https://linkedin.com/in/test").success).toBe(true);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse("https://example.com").success).toBe(false);
  });

  it("applies schema extensions and bumps version", () => {
    const result = applySchemaExtensions("students", "extra_fields", [
      {
        field_name: "mentorship_tier",
        field_type: "string",
        required: false,
        validation_rules: {
          enum_values: ["basic", "gold"],
        },
      },
    ]);

    expect(result.version).toBeDefined();
    expect(result.addedFields).toContain("mentorship_tier");

    const updatedDefinition = getJsonbSchemaDefinition("students", "extra_fields");
    expect(updatedDefinition?.version).toBe(result.version);
    const schema = updatedDefinition?.schema as z.ZodObject<ZodRawShape>;
    expect(schema.shape.mentorship_tier).toBeDefined();
  });

  it("rejects unsafe regex patterns", () => {
    expect(() =>
      buildZodSchemaForField({
        field_name: "bad_pattern",
        field_type: "string",
        validation_rules: {
          pattern: "(a+)+$",
        },
      }),
    ).toThrow("Unsafe regex pattern");
  });
});
