/** @jest-environment node */

import { describe, expect, it, jest } from "@jest/globals";
import { z } from "zod";
import { withValidation } from "./withValidation";

const createJsonRequest = (payload: unknown): Request =>
  ({
    clone: () => createJsonRequest(payload),
    json: async () => payload,
    formData: async () => {
      throw new Error("formData not supported in mock");
    },
    text: async () => JSON.stringify(payload),
  }) as unknown as Request;

const createInvalidJsonRequest = (): Request =>
  ({
    clone: () => createInvalidJsonRequest(),
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
    formData: async () => {
      throw new Error("formData not supported in mock");
    },
    text: async () => {
      throw new SyntaxError("Unexpected token");
    },
  }) as unknown as Request;

const createJsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    ...init,
  });

describe("withValidation", () => {
  it("passes validated data to the handler when payload is valid", async () => {
    const schema = z.object({
      name: z.string().transform((value) => value.trim()),
      age: z.number().int().min(0),
    });

    const handler = jest.fn(({ validatedData }) =>
      createJsonResponse({
        success: true,
        data: validatedData,
      }),
    );

    const route = withValidation(schema, handler);

    const request = createJsonRequest({ name: "  Alice  ", age: 21 });

    const response = await route(request);

    expect(handler).toHaveBeenCalledTimes(1);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { name: "Alice", age: 21 },
    });
  });

  it("returns validation errors when schema fails", async () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const route = withValidation(schema, () => createJsonResponse({ success: true }));

    const request = createJsonRequest({ email: "not-an-email" });

    const response = await route(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validation failed");
    expect(body.errors.email.message).toBe("Invalid email address");
  });

  it("returns invalid payload response when JSON parsing fails", async () => {
    const schema = z.object({
      name: z.string(),
    });

    const route = withValidation(schema, () => createJsonResponse({ success: true }));

    const request = createInvalidJsonRequest();

    const response = await route(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      message: "Invalid request payload",
    });
  });

  it("supports asynchronous refinement inside schemas", async () => {
    const schema = z.object({
      token: z
        .string()
        .min(1)
        .refine(async (value) => value === "valid-token", "Token is invalid"),
    });

    const route = withValidation(schema, () => createJsonResponse({ success: true }));

    const successRequest = createJsonRequest({ token: "valid-token" });

    const successResponse = await route(successRequest);
    expect(successResponse.status).toBe(200);

    const errorRequest = createJsonRequest({ token: "invalid-token" });

    const errorResponse = await route(errorRequest);
    const errorBody = await errorResponse.json();

    expect(errorResponse.status).toBe(400);
    expect(errorBody.success).toBe(false);
    expect(errorBody.errors.token.message).toBe("Token is invalid");
  });

  it("allows custom validation error responses with onValidationError", async () => {
    const schema = z.object({
      name: z.string(),
    });

    const route = withValidation(schema, () => createJsonResponse({ success: true }), {
      onValidationError: () =>
        createJsonResponse({ success: false, message: "Custom failure" }, { status: 422 }),
    });

    const request = createJsonRequest({});

    const response = await route(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual({
      success: false,
      message: "Custom failure",
    });
  });
});
