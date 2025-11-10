/**
 * @jest-environment node
 */
import { describe, it, expect } from "@jest/globals";
import {
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  ExternalServiceError,
  RateLimitError,
} from "../AppError";
import { ErrorCategory, ErrorCode, ErrorSeverity } from "../types";
import { createErrorResponse } from "../errorHandler";
import { ZodError } from "zod";
import { PostgrestError } from "@supabase/supabase-js";

describe("AppError", () => {
  it("should create an error with default severity and status code", () => {
    const error = new AppError("Test error", ErrorCode.INTERNAL_ERROR, ErrorCategory.INTERNAL);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.category).toBe(ErrorCategory.INTERNAL);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(500);
  });

  it("should create an error with custom severity and status code", () => {
    const error = new AppError("Test error", ErrorCode.INTERNAL_ERROR, ErrorCategory.INTERNAL, {
      severity: ErrorSeverity.CRITICAL,
      statusCode: 503,
    });

    expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    expect(error.statusCode).toBe(503);
  });

  it("should include details and field in error", () => {
    const error = new AppError(
      "Test error",
      ErrorCode.VALIDATION_FAILED,
      ErrorCategory.VALIDATION,
      {
        details: [{ field: "email", message: "Invalid email", code: "INVALID_EMAIL" }],
        field: "email",
      },
    );

    expect(error.details).toHaveLength(1);
    expect(error.field).toBe("email");
  });

  it("should convert to JSON correctly", () => {
    const error = new AppError(
      "Test error",
      ErrorCode.VALIDATION_FAILED,
      ErrorCategory.VALIDATION,
      {
        severity: ErrorSeverity.LOW,
        details: [{ field: "email", message: "Invalid email" }],
        field: "email",
      },
    );

    const json = error.toJSON();
    expect(json).toEqual({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Test error",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      details: [{ field: "email", message: "Invalid email" }],
      field: "email",
    });
  });
});

describe("ValidationError", () => {
  it("should create a validation error with correct defaults", () => {
    const error = new ValidationError("Validation failed", {
      field: "email",
    });

    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.LOW);
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe("email");
  });
});

describe("DatabaseError", () => {
  it("should create a database error with correct defaults", () => {
    const error = new DatabaseError("Database operation failed");

    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(error.category).toBe(ErrorCategory.DATABASE);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.statusCode).toBe(500);
  });
});

describe("AuthenticationError", () => {
  it("should create an authentication error with correct defaults", () => {
    const error = new AuthenticationError("Unauthorized");

    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(401);
  });
});

describe("NotFoundError", () => {
  it("should create a not found error with correct defaults", () => {
    const error = new NotFoundError("Resource not found");

    expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(error.category).toBe(ErrorCategory.NOT_FOUND);
    expect(error.severity).toBe(ErrorSeverity.LOW);
    expect(error.statusCode).toBe(404);
  });
});

describe("ConflictError", () => {
  it("should create a conflict error with correct defaults", () => {
    const error = new ConflictError("Duplicate resource");

    expect(error.code).toBe(ErrorCode.DUPLICATE_RESOURCE);
    expect(error.category).toBe(ErrorCategory.CONFLICT);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(409);
  });
});

describe("BusinessLogicError", () => {
  it("should create a business logic error with correct defaults", () => {
    const error = new BusinessLogicError("Business rule violated");

    expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    expect(error.category).toBe(ErrorCategory.BUSINESS_LOGIC);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(422);
  });
});

describe("ExternalServiceError", () => {
  it("should create an external service error with correct defaults", () => {
    const error = new ExternalServiceError("External service failed");

    expect(error.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    expect(error.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.statusCode).toBe(502);
  });
});

describe("RateLimitError", () => {
  it("should create a rate limit error with correct defaults", () => {
    const error = new RateLimitError("Rate limit exceeded");

    expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(429);
  });
});

describe("createErrorResponse", () => {
  it("should handle AppError instances", async () => {
    const error = new ValidationError("Validation failed", { field: "email" });
    const response = createErrorResponse(error);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(json.error.message).toBe("Validation failed");
    expect(json.error.field).toBe("email");
    expect(json.error.requestId).toBeDefined();
    expect(json.error.timestamp).toBeDefined();
    expect(response.status).toBe(400);
  });

  it("should handle ZodError instances", async () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["email"],
        message: "Expected string, received number",
      },
    ]);

    const response = createErrorResponse(zodError);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(json.error.details).toHaveLength(1);
    expect(json.error.details[0].field).toBe("email");
    expect(response.status).toBe(400);
  });

  it("should handle PostgrestError for unique violations", async () => {
    const dbError: PostgrestError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "students_email_unique"',
      details: "Key (email)=(test@example.com) already exists.",
      hint: null,
    };

    const response = createErrorResponse(dbError);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.UNIQUE_VIOLATION);
    expect(json.error.category).toBe(ErrorCategory.DATABASE);
    expect(response.status).toBe(409);
  });

  it("should handle PostgrestError for not found (PGRST116)", async () => {
    const dbError: PostgrestError = {
      code: "PGRST116",
      message: "The result contains 0 rows",
      details: null,
      hint: null,
    };

    const response = createErrorResponse(dbError);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(json.error.category).toBe(ErrorCategory.DATABASE);
    expect(response.status).toBe(500);
  });

  it("should handle standard Error instances", async () => {
    const error = new Error("Something went wrong");
    const response = createErrorResponse(error);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(json.error.category).toBe(ErrorCategory.INTERNAL);
    expect(response.status).toBe(500);
  });

  it("should handle unknown error types", async () => {
    const response = createErrorResponse("Unknown error");
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.UNEXPECTED_ERROR);
    expect(response.status).toBe(500);
  });

  it("should include requestId in response", async () => {
    const error = new ValidationError("Test error");
    const requestId = "test-request-id";
    const response = createErrorResponse(error, requestId);
    const json = await response.json();

    expect(json.error.requestId).toBe(requestId);
  });
});
