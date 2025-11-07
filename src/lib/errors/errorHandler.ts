import { NextResponse } from "next/server";
import { AppError } from "./AppError";
import { ErrorResponse, ErrorCode, ErrorCategory, ErrorSeverity, ErrorMetadata } from "./types";
import { ZodError } from "zod";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert an error to a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string,
  metadata?: ErrorMetadata,
): NextResponse<ErrorResponse> {
  const reqId = requestId ?? generateRequestId();

  // Handle AppError instances
  if (error instanceof AppError) {
    const errorData = error.toJSON();
    return NextResponse.json(
      {
        success: false,
        error: {
          ...errorData,
          timestamp: new Date().toISOString(),
          requestId: reqId,
          metadata: metadata ?? error.metadata,
        },
      },
      { status: error.statusCode },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join(".") || undefined,
      message: issue.message,
      code: issue.code,
      value: issue.path.length > 0 ? undefined : issue.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: "Validation failed",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          details,
          timestamp: new Date().toISOString(),
          requestId: reqId,
          metadata,
        },
      },
      { status: 400 },
    );
  }

  // Handle Supabase PostgrestError
  if (error && typeof error === "object" && "code" in error) {
    const dbError = error as PostgrestError;
    const classified = classifyDatabaseError(dbError);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: classified.code,
          message: classified.message,
          category: ErrorCategory.DATABASE,
          severity: classified.severity,
          details: classified.details,
          timestamp: new Date().toISOString(),
          requestId: reqId,
          metadata: metadata ?? (error as PostgrestError & { metadata?: ErrorMetadata }).metadata,
        },
      },
      { status: classified.statusCode },
    );
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message:
            process.env.NODE_ENV === "production" ? "An internal error occurred" : error.message,
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date().toISOString(),
          requestId: reqId,
          metadata,
        },
      },
      { status: 500 },
    );
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorCode.UNEXPECTED_ERROR,
        message: "An unexpected error occurred",
        category: ErrorCategory.INTERNAL,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        requestId: reqId,
        metadata,
      },
    },
    { status: 500 },
  );
}

/**
 * Classify Supabase database errors into standardized error codes
 */
function classifyDatabaseError(error: PostgrestError): {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  statusCode: number;
  details?: Array<{ field?: string; message: string; code?: string }>;
} {
  const errorMessage = error.message.toLowerCase();
  const errorCode = error.code?.toLowerCase() || "";

  // Unique constraint violations
  if (
    errorCode === "23505" ||
    errorMessage.includes("duplicate key") ||
    errorMessage.includes("unique constraint")
  ) {
    const field = extractFieldFromError(errorMessage, ["email", "phone", "aadhar", "pan"]);

    return {
      code: ErrorCode.UNIQUE_VIOLATION,
      message: field
        ? `This ${field} is already registered`
        : "A record with this value already exists",
      severity: ErrorSeverity.MEDIUM,
      statusCode: 409,
      details: field
        ? [
            {
              field,
              message: `This ${field} is already registered`,
              code: "UNIQUE_VIOLATION",
            },
          ]
        : undefined,
    };
  }

  // Foreign key violations
  if (errorCode === "23503" || errorMessage.includes("foreign key")) {
    return {
      code: ErrorCode.FOREIGN_KEY_VIOLATION,
      message: "Referenced record does not exist",
      severity: ErrorSeverity.MEDIUM,
      statusCode: 400,
    };
  }

  // Not null violations
  if (errorCode === "23502" || errorMessage.includes("not null")) {
    const field = extractFieldFromError(errorMessage, ["column", "field"]);
    return {
      code: ErrorCode.NOT_NULL_VIOLATION,
      message: field ? `${field} is required` : "Required field is missing",
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      details: field
        ? [
            {
              field,
              message: `${field} is required`,
              code: "NOT_NULL_VIOLATION",
            },
          ]
        : undefined,
    };
  }

  // Check constraint violations
  if (errorCode === "23514" || errorMessage.includes("check constraint")) {
    const field = extractFieldFromError(errorMessage, [
      "phone",
      "email",
      "aadhar",
      "pan",
      "date_of_birth",
      "gender",
      "postal_code",
    ]);

    return {
      code: ErrorCode.CONSTRAINT_VIOLATION,
      message: field ? `Invalid ${field} format or value` : "Data validation failed",
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      details: field
        ? [
            {
              field,
              message: `Invalid ${field} format or value`,
              code: "CONSTRAINT_VIOLATION",
            },
          ]
        : undefined,
    };
  }

  // Connection errors
  if (
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("network")
  ) {
    return {
      code: ErrorCode.CONNECTION_ERROR,
      message: "Database connection error",
      severity: ErrorSeverity.HIGH,
      statusCode: 503,
    };
  }

  // Default database error
  return {
    code: ErrorCode.DATABASE_ERROR,
    message: "A database error occurred",
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
  };
}

/**
 * Extract field name from error message
 */
function extractFieldFromError(errorMessage: string, possibleFields: string[]): string | undefined {
  for (const field of possibleFields) {
    if (errorMessage.includes(field)) {
      return field;
    }
  }

  // Try to extract from column name pattern
  const columnMatch = errorMessage.match(/column "([^"]+)"/i);
  if (columnMatch) {
    return columnMatch[1];
  }

  return undefined;
}

/**
 * Create a success response wrapper for consistency
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  metadata?: Record<string, unknown>,
): NextResponse<{ success: true; data: T; metadata?: Record<string, unknown> }> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(metadata && { metadata }),
    },
    { status },
  );
}
