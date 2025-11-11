/**
 * @jest-environment node
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import {
  getJsonbSchemaDefinition,
  registerJsonbSchema,
  studentExtraFieldsSchema,
} from "@/lib/jsonb/schemaRegistry";
import {
  ensureJsonbSchemaExtensionsLoaded,
  resetJsonbSchemaRehydrationStateForTests,
} from "@/lib/jsonb/schemaRehydrator";

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: jest.fn(),
}));

const { supabaseAdmin } = jest.requireMock("@/lib/supabase/server") as {
  supabaseAdmin: jest.MockedFunction<
    () => {
      from: jest.Mock;
    }
  >;
};

describe("schema rehydrator", () => {
  const originalEnv = { ...process.env };
  let originalDefinition: ReturnType<typeof getJsonbSchemaDefinition> | undefined;
  let baseFieldKeys: Set<string>;
  let selectMock: jest.Mock;
  let firstOrderMock: jest.Mock;
  let secondOrderMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.JSONB_SCHEMA_REHYDRATE_IN_TESTS = "true";

    originalDefinition = getJsonbSchemaDefinition("students", "extra_fields");
    baseFieldKeys = new Set(Object.keys(studentExtraFieldsSchema.shape));
    secondOrderMock = jest.fn();
    firstOrderMock = jest.fn().mockReturnValue({
      order: secondOrderMock,
    });
    selectMock = jest.fn().mockReturnValue({
      order: firstOrderMock,
    });
    supabaseAdmin.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: selectMock,
      }),
    });
    resetJsonbSchemaRehydrationStateForTests();
  });

  afterEach(() => {
    restoreBaseStudentSchema();
    resetJsonbSchemaRehydrationStateForTests();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it("registers persisted extensions from Supabase", async () => {
    const response = Promise.resolve({
      data: [
        {
          table_name: "students",
          jsonb_column: "extra_fields",
          field_name: "rehydrated_field",
          field_type: "string",
          required: false,
          description: "Persisted field",
          default_value: "rehydrated",
          validation_rules: null,
          schema_version: 3,
        },
      ],
      error: null,
    });
    secondOrderMock.mockReturnValue(response);

    await ensureJsonbSchemaExtensionsLoaded();

    const updatedDefinition = getJsonbSchemaDefinition("students", "extra_fields");
    expect(updatedDefinition?.schema.shape).toHaveProperty("rehydrated_field");
    expect(studentExtraFieldsSchema.shape).toHaveProperty("rehydrated_field");
    expect(updatedDefinition?.version).toBeGreaterThanOrEqual(3);
  });

  it("does nothing when Supabase returns no rows", async () => {
    const response = Promise.resolve({
      data: [],
      error: null,
    });
    secondOrderMock.mockReturnValue(response);

    await ensureJsonbSchemaExtensionsLoaded();

    const updatedDefinition = getJsonbSchemaDefinition("students", "extra_fields");
    expect(updatedDefinition).toEqual(originalDefinition);
  });

  it("propagates rehydration errors to callers", async () => {
    secondOrderMock.mockReturnValue(
      Promise.resolve({
        data: null,
        error: new Error("database unavailable"),
      }),
    );

    await expect(ensureJsonbSchemaExtensionsLoaded()).rejects.toThrow("database unavailable");
  });
  function restoreBaseStudentSchema() {
    const definition = getJsonbSchemaDefinition("students", "extra_fields");
    if (!definition) {
      return;
    }

    const shape = definition.schema.shape as Record<string, unknown>;
    for (const key of Object.keys(shape)) {
      if (!baseFieldKeys.has(key)) {
        delete shape[key];
      }
    }

    if (originalDefinition) {
      registerJsonbSchema({
        ...definition,
        schema: definition.schema,
        version: originalDefinition.version,
      });
    }
  }
});
