/**
 * @jest-environment node
 */
import { POST } from "./route";
import { NextRequest } from "next/server";

function createMockRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

async function parseResponse(response: Response) {
  const status = (response as any).status;
  const data = await (response as any).json();
  return { status, data };
}

describe("/api/sync POST handler - JSONB validation integration tests", () => {
  describe("Valid known JSONB fields", () => {
    it("should accept valid extra_fields with batch_code and mentor_id", async () => {
      const request = createMockRequest({
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5",
          mentor_id: "MENTOR_001",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields).toBeDefined();
      expect(data.jsonbFields.extra_fields).toBeDefined();
      expect(data.jsonbFields.extra_fields.batch_code).toBe("ACCA_2024_Batch_5");
      expect(data.jsonbFields.extra_fields.mentor_id).toBe("MENTOR_001");
    });

    it("should accept valid additional_data with delivery_instructions", async () => {
      const request = createMockRequest({
        additional_data: {
          delivery_instructions: "Leave at gate",
          landmark_details: "Near City Mall",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.additional_data).toBeDefined();
      expect(data.jsonbFields.additional_data.delivery_instructions).toBe(
        "Leave at gate",
      );
    });

    it("should accept valid extra_metrics with attention_score", async () => {
      const request = createMockRequest({
        extra_metrics: {
          attention_score: 8,
          question_count: 5,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_metrics).toBeDefined();
      expect(data.jsonbFields.extra_metrics.attention_score).toBe(8);
      expect(data.jsonbFields.extra_metrics.question_count).toBe(5);
    });

    it("should accept valid analysis_data with score_breakdown", async () => {
      const request = createMockRequest({
        analysis_data: {
          score_breakdown: {
            theory: 45,
            practical: 40,
            total: 85,
          },
          weak_areas: ["Financial Accounting"],
          strong_areas: ["Taxation", "Audit"],
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.analysis_data).toBeDefined();
      expect(data.jsonbFields.analysis_data.score_breakdown.total).toBe(85);
    });
  });

  describe("Invalid values for known fields", () => {
    it("should reject attention_score > 10 with 400 error", async () => {
      const request = createMockRequest({
        extra_metrics: {
          attention_score: 15,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Validation failed for extra_metrics");
      expect(data.validationErrors).toBeDefined();
      expect(data.validationErrors.length).toBeGreaterThan(0);
      expect(data.validationErrors[0]).toContain("attention_score");
    });

    it("should reject negative question_count with 400 error", async () => {
      const request = createMockRequest({
        extra_metrics: {
          question_count: -5,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Validation failed for extra_metrics");
      expect(data.validationErrors).toBeDefined();
    });

    it("should accept empty batch_code since field is optional", async () => {
      const request = createMockRequest({
        extra_fields: {
          batch_code: "",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields.batch_code).toBeUndefined();
    });
  });

  describe("Unknown fields with warnings", () => {
    it("should accept unknown field in extra_fields with warning", async () => {
      const request = createMockRequest({
        extra_fields: {
          some_new_field: "test_value",
          another_unknown: 123,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields).toBeDefined();
      expect(data.jsonbFields.extra_fields.some_new_field).toBe("test_value");
      expect(data.validationWarnings).toBeDefined();
      expect(data.validationWarnings.length).toBeGreaterThan(0);
      expect(data.validationWarnings.some((w: string) => w.includes("Unknown field"))).toBe(
        true,
      );
    });

    it("should accept mix of known and unknown fields", async () => {
      const request = createMockRequest({
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5",
          custom_unknown_field: "value",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields.batch_code).toBe("ACCA_2024_Batch_5");
      expect(data.jsonbFields.extra_fields.custom_unknown_field).toBe("value");
      expect(data.validationWarnings).toBeDefined();
      expect(
        data.validationWarnings.some((w: string) => w.includes("custom_unknown_field")),
      ).toBe(true);
    });
  });

  describe("Wrong target column warnings", () => {
    it("should warn when attention_score is in extra_fields instead of extra_metrics", async () => {
      const request = createMockRequest({
        extra_fields: {
          attention_score: 5,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationWarnings).toBeDefined();
      expect(
        data.validationWarnings.some(
          (w: string) =>
            w.includes("attention_score") &&
            (w.includes("belongs to") || w.includes("extra_metrics")),
        ),
      ).toBe(true);
    });

    it("should warn when batch_code is in metadata instead of extra_fields", async () => {
      const request = createMockRequest({
        metadata: {
          batch_code: "ACCA_2024_Batch_5",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationWarnings).toBeDefined();
      expect(
        data.validationWarnings.some(
          (w: string) =>
            w.includes("batch_code") &&
            (w.includes("belongs to") || w.includes("extra_fields")),
        ),
      ).toBe(true);
    });
  });

  describe("Multiple JSONB columns in one request", () => {
    it("should validate multiple JSONB columns successfully", async () => {
      const request = createMockRequest({
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5",
          mentor_id: "MENTOR_001",
        },
        additional_data: {
          delivery_instructions: "Leave at gate",
        },
        extra_metrics: {
          attention_score: 8,
        },
        analysis_data: {
          weak_areas: ["Financial Accounting"],
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields).toBeDefined();
      expect(data.jsonbFields.additional_data).toBeDefined();
      expect(data.jsonbFields.extra_metrics).toBeDefined();
      expect(data.jsonbFields.analysis_data).toBeDefined();
    });

    it("should aggregate warnings from multiple columns", async () => {
      const request = createMockRequest({
        extra_fields: {
          unknown_field_1: "value1",
        },
        additional_data: {
          unknown_field_2: "value2",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validationWarnings).toBeDefined();
      expect(data.validationWarnings.length).toBeGreaterThanOrEqual(2);
    });

    it("should fail on first invalid column and not process remaining", async () => {
      const request = createMockRequest({
        extra_metrics: {
          attention_score: 15, // Invalid
        },
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5", // Valid but won't be processed
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Validation failed for extra_metrics");
    });
  });

  describe("raw_data pass-through", () => {
    it("should accept raw_data with any structure", async () => {
      const request = createMockRequest({
        raw_data: {
          any: "thing",
          even: 123,
          nested: {
            objects: true,
          },
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.raw_data).toBeDefined();
      expect(data.jsonbFields.raw_data.any).toBe("thing");
      expect(data.jsonbFields.raw_data.even).toBe(123);
      expect(data.jsonbFields.raw_data.nested.objects).toBe(true);
      if (data.validationWarnings) {
        expect(
          data.validationWarnings.some((w: string) => w.includes("Unknown field")),
        ).toBe(true);
      }
    });
  });

  describe("Non-object JSONB field handling", () => {
    it("should ignore non-object extra_fields", async () => {
      const request = createMockRequest({
        extra_fields: "not an object",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields).toBeUndefined();
    });

    it("should ignore null JSONB fields", async () => {
      const request = createMockRequest({
        extra_fields: null,
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields).toBeUndefined();
    });

    it("should process valid fields and ignore invalid ones", async () => {
      const request = createMockRequest({
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5",
        },
        additional_data: "not an object",
        extra_metrics: {
          attention_score: 7,
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields).toBeDefined();
      expect(data.jsonbFields.extra_metrics).toBeDefined();
      expect(data.jsonbFields.additional_data).toBeUndefined();
    });
  });

  describe("Empty and edge cases", () => {
    it("should accept empty JSONB objects", async () => {
      const request = createMockRequest({
        extra_fields: {},
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields.extra_fields).toEqual({});
    });

    it("should handle request with no JSONB fields", async () => {
      const request = createMockRequest({
        gender: "Male",
        salutation: "Mr",
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jsonbFields).toBeUndefined();
    });

    it("should handle completely empty request body", async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Enum validation with JSONB fields", () => {
    it("should validate both enum fields and JSONB fields together", async () => {
      const request = createMockRequest({
        gender: "Male",
        certification_type: "ACCA",
        extra_fields: {
          batch_code: "ACCA_2024_Batch_5",
        },
      });

      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.validatedData.gender).toBe("Male");
      expect(data.validatedData.certification_type).toBe("ACCA");
      expect(data.jsonbFields.extra_fields.batch_code).toBe("ACCA_2024_Batch_5");
    });
  });
});
