/**
 * @jest-environment node
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.INTERNAL_API_KEY = "test-key";

import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { getJsonbSchemaDefinition, registerJsonbSchema } from "@/lib/jsonb/schemaRegistry";

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: jest.fn(),
}));

type SupabaseAdminFn = (typeof import("@/lib/supabase/server"))["supabaseAdmin"];
const { supabaseAdmin } = jest.requireMock("@/lib/supabase/server") as {
  supabaseAdmin: jest.MockedFunction<SupabaseAdminFn>;
};

const createRequest = (body: unknown, headers?: Record<string, string>) => {
  const url = new URL("http://localhost/api/schema/extend");
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Internal-API-Key": "test-key",
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

type RouteModule = typeof import("@/app/api/schema/extend/route");

describe("POST /api/schema/extend", () => {
  let originalDefinition: ReturnType<typeof getJsonbSchemaDefinition> | undefined;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let postHandler: RouteModule["POST"];

  beforeEach(async () => {
    mockSupabase = createMockSupabase();
    (supabaseAdmin as jest.Mock).mockReturnValue(mockSupabase);
    originalDefinition = getJsonbSchemaDefinition("students", "extra_fields");
    const module = await import("@/app/api/schema/extend/route");
    postHandler = module.POST;
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalDefinition) {
      registerJsonbSchema(originalDefinition);
    }
  });

  it("extends schema and persists definitions", async () => {
    const request = createRequest({
      table_name: "students",
      jsonb_column: "extra_fields",
      migration_strategy: "merge",
      apply_to_existing: true,
      fields: [
        {
          field_name: "preferred_language",
          field_type: "string",
          required: false,
          default_value: "en",
        },
      ],
    });

    const response = await postHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.extension.fields).toContain("preferred_language");
    expect(mockSupabase.from).toHaveBeenCalledWith("jsonb_schema_extensions");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("apply_jsonb_schema_extension", {
      target_table: "students",
      jsonb_column: "extra_fields",
      extension_payload: { preferred_language: "en" },
      field_names: ["preferred_language"],
      strategy: "merge",
    });
  });
});

function createMockSupabase() {
  const mockSelect = jest.fn().mockResolvedValue({ data: [{ id: "ext-1" }], error: null });
  const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
  const mockRpc = jest.fn().mockResolvedValue({ data: 5, error: null });

  return {
    from: jest.fn().mockReturnValue({
      upsert: mockUpsert,
    }),
    rpc: mockRpc,
  };
}
