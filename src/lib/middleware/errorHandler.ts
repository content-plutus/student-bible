import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { formatDatabaseError } from "@/lib/utils/errorFormatter";
import { withValidation, ValidatedHandler, ValidationError } from "./validation";

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
  success: false;
}

export interface DatabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

const ERROR_CODE_TO_STATUS: Record<string, number> = {
  constraint_violation: 400,
  unique_violation: 409,
  invalid_format: 400,
  foreign_key_violation: 422,
  not_null_violation: 400,
  cross_field_validation: 422,
  async_validation: 422,
  unknown_error: 500,
  MALFORMED_JSON: 400,
  UNSUPPORTED_CONTENT_TYPE: 415,
  INVALID_TYPE: 400,
  INVALID_STRING: 400,
  INVALID_EMAIL_FORMAT: 400,
  VALUE_TOO_SMALL: 400,
  VALUE_TOO_LARGE: 400,
  INVALID_AGE: 400,
  INVALID_CHECKSUM: 400,
  INVALID_CROSS_FIELD_VALIDATION: 422,
  CUSTOM_VALIDATION_FAILED: 400,
  VALIDATION_ERROR: 400,
  PGRST116: 404,
};

function getStatusCodeFromError(error: unknown): number {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("not found")) {
      return 404;
    }

    if (errorMessage.includes("unauthorized") || errorMessage.includes("authentication")) {
      return 401;
    }

    if (errorMessage.includes("forbidden") || errorMessage.includes("permission")) {
      return 403;
    }

    if (errorMessage.includes("conflict") || errorMessage.includes("duplicate")) {
      return 409;
    }

    if (errorMessage.includes("invalid") || errorMessage.includes("validation")) {
      return 400;
    }

    const dbError = error as DatabaseError;
    if (dbError.code) {
      const statusFromCode = ERROR_CODE_TO_STATUS[dbError.code];
      if (statusFromCode) {
        return statusFromCode;
      }
    }
  }

  return 500;
}

function getErrorCode(error: unknown): string {
  if (error instanceof ZodError) {
    return "VALIDATION_ERROR";
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("not found")) {
      return "NOT_FOUND";
    }

    if (errorMessage.includes("unauthorized")) {
      return "UNAUTHORIZED";
    }

    if (errorMessage.includes("forbidden")) {
      return "FORBIDDEN";
    }

    if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
      return "unique_violation";
    }

    if (errorMessage.includes("foreign key")) {
      return "foreign_key_violation";
    }

    if (errorMessage.includes("not null") || errorMessage.includes("not-null")) {
      return "not_null_violation";
    }

    if (errorMessage.includes("check constraint")) {
      return "constraint_violation";
    }

    const dbError = error as DatabaseError;
    if (dbError.code === "PGRST116") {
      return "NOT_FOUND";
    }
  }

  return "unknown_error";
}

export function handleError(error: unknown, req?: NextRequest): NextResponse<ErrorResponse> {
  const requestInfo = req ? { method: req.method, path: new URL(req.url).pathname } : undefined;
  console.error("Error in API handler:", error, requestInfo);

  if (error instanceof ZodError) {
    const details: ValidationError[] = error.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
      code: "VALIDATION_ERROR",
    }));

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details,
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    const errorMessage = error.message;
    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes("invalid json")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: [
            {
              field: "body",
              message: "Request body contains malformed JSON",
              code: "MALFORMED_JSON",
            },
          ],
        },
        { status: 400 },
      );
    }

    if (errorLower.includes("unsupported content type")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported content type",
          details: [
            {
              field: "content-type",
              message: errorMessage,
              code: "UNSUPPORTED_CONTENT_TYPE",
            },
          ],
        },
        { status: 415 },
      );
    }

    const dbError = error as DatabaseError;
    if (
      dbError.code ||
      errorLower.includes("constraint") ||
      errorLower.includes("duplicate") ||
      errorLower.includes("foreign key") ||
      errorLower.includes("not null")
    ) {
      const formattedError = formatDatabaseError(error);
      const statusCode = ERROR_CODE_TO_STATUS[formattedError.code || "unknown_error"] || 500;

      return NextResponse.json(
        {
          success: false,
          error: formattedError.message,
          details: [
            {
              field: formattedError.field,
              message: formattedError.message,
              code: formattedError.code || "unknown_error",
            },
          ],
        },
        { status: statusCode },
      );
    }

    if (dbError.code === "PGRST116") {
      return NextResponse.json(
        {
          success: false,
          error: "Resource not found",
        },
        { status: 404 },
      );
    }

    const statusCode = getStatusCodeFromError(error);
    const errorCode = getErrorCode(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: [
          {
            field: "root",
            message: errorMessage,
            code: errorCode,
          },
        ],
      },
      { status: statusCode },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "An unexpected error occurred",
      details: [
        {
          field: "root",
          message: "An unexpected error occurred",
          code: "unknown_error",
        },
      ],
    },
    { status: 500 },
  );
}

export function withErrorHandling<T>(schema: ZodSchema<T>) {
  return function (handler: ValidatedHandler<T>) {
    return async (req: NextRequest): Promise<Response> => {
      try {
        return await withValidation(schema)(handler)(req);
      } catch (error) {
        return handleError(error, req);
      }
    };
  };
}
