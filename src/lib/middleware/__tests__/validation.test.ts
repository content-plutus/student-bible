/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "../validation";

describe("Validation Middleware", () => {
  describe("formatZodError - error code mapping", () => {
    it("should map phone_number field with regex validation to INVALID_PHONE_FORMAT", async () => {
      const schema = z.object({
        phone_number: z.string().regex(/^[6-9][0-9]{9}$/, "Invalid phone format"),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone_number: "123" }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].code).toBe("INVALID_PHONE_FORMAT");
      expect(body.details[0].field).toBe("phone_number");
    });

    it("should map aadhar_number field with regex validation to INVALID_AADHAR_FORMAT", async () => {
      const schema = z.object({
        aadhar_number: z.string().regex(/^[0-9]{12}$/, "Invalid AADHAR format"),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aadhar_number: "123" }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].code).toBe("INVALID_AADHAR_FORMAT");
    });

    it("should map email validation to INVALID_EMAIL_FORMAT", async () => {
      const schema = z.object({
        email: z.string().email("Invalid email"),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "notanemail" }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].code).toBe("INVALID_EMAIL_FORMAT");
    });

    it("should map unknown regex field to INVALID_FORMAT", async () => {
      const schema = z.object({
        unknown_field: z.string().regex(/^[A-Z]+$/, "Must be uppercase"),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unknown_field: "lowercase" }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].code).toBe("INVALID_FORMAT");
    });
  });

  describe("Cross-field validation", () => {
    it("should validate guardian_phone != phone_number", async () => {
      const schema = z
        .object({
          phone_number: z.string().regex(/^[6-9][0-9]{9}$/),
          guardian_phone: z
            .string()
            .regex(/^[6-9][0-9]{9}$/)
            .optional()
            .nullable(),
        })
        .refine((data) => !data.guardian_phone || data.guardian_phone !== data.phone_number, {
          message: "Guardian phone number must be different from student's phone number",
          path: ["guardian_phone"],
        });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone_number: "9876543210",
          guardian_phone: "9876543210",
        }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].field).toBe("guardian_phone");
      expect(body.details[0].message).toContain("Guardian phone number must be different");
      expect(body.details[0].code).toBe("INVALID_CROSS_FIELD_VALIDATION");
    });

    it("should pass when guardian_phone is different from phone_number", async () => {
      const schema = z
        .object({
          phone_number: z.string().regex(/^[6-9][0-9]{9}$/),
          guardian_phone: z
            .string()
            .regex(/^[6-9][0-9]{9}$/)
            .optional()
            .nullable(),
        })
        .refine((data) => !data.guardian_phone || data.guardian_phone !== data.phone_number, {
          message: "Guardian phone number must be different from student's phone number",
          path: ["guardian_phone"],
        });

      const handler = withValidation(schema)(async (_req, data) => {
        return new Response(JSON.stringify({ success: true, data }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone_number: "9876543210",
          guardian_phone: "9876543211",
        }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe("Malformed JSON handling", () => {
    it("should return 400 with MALFORMED_JSON code for invalid JSON", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid json",
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details[0].code).toBe("MALFORMED_JSON");
      expect(body.details[0].message).toContain("malformed JSON");
    });

    it("should return 415 for unsupported content type", async () => {
      const schema = z.object({
        name: z.string(),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/xml" },
        body: "<xml>test</xml>",
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(415);
      expect(body.details[0].code).toBe("UNSUPPORTED_CONTENT_TYPE");
    });
  });

  describe("GET query parameter parsing", () => {
    it("should parse and validate query parameters", async () => {
      const schema = z.object({
        format: z.enum(["csv", "json", "xlsx"]),
        limit: z
          .string()
          .transform((val) => parseInt(val, 10))
          .pipe(z.number().int().min(1)),
      });

      const handler = withValidation(schema)(async (_req, data) => {
        return new Response(JSON.stringify({ success: true, data }));
      });

      const request = new NextRequest("http://localhost:3000/api/test?format=csv&limit=100", {
        method: "GET",
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.format).toBe("csv");
      expect(body.data.limit).toBe(100);
    });

    it("should return validation error for invalid query parameter type", async () => {
      const schema = z.object({
        limit: z
          .string()
          .transform((val) => parseInt(val, 10))
          .pipe(z.number().int().min(1)),
      });

      const handler = withValidation(schema)(async () => {
        return new Response(JSON.stringify({ success: true }));
      });

      const request = new NextRequest("http://localhost:3000/api/test?limit=notanumber", {
        method: "GET",
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
    });
  });

  describe("rawData parameter", () => {
    it("should pass rawData to handler for comparison with validated data", async () => {
      const schema = z.object({
        value: z.string().transform((val) => val.toUpperCase()),
      });

      let capturedRawData: unknown;
      const handler = withValidation(schema)(async (_req, data, rawData) => {
        capturedRawData = rawData;
        return new Response(JSON.stringify({ success: true, data }));
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "lowercase" }),
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.value).toBe("LOWERCASE");
      expect((capturedRawData as Record<string, unknown>).value).toBe("lowercase");
    });
  });
});
