import { NextRequest } from "next/server";
import { AppError, ValidationError } from "./AppError";
import { createErrorResponse, createSuccessResponse } from "./errorHandler";
import { ErrorMetadata } from "./types";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Generate request ID from headers or create new one
 */
function getRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );
}

/**
 * Extract metadata from request for error context
 */
function extractRequestMetadata(request: NextRequest): ErrorMetadata {
  return {
    requestId: getRequestId(request),
    endpoint: request.nextUrl.pathname,
    method: request.method,
  };
}

/**
 * Error handling wrapper for API route handlers
 * Catches errors and converts them to standardized error responses
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest, context?: T) => Promise<Response> | Response,
) {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    const metadata = extractRequestMetadata(request);
    const requestId = metadata.requestId!;

    try {
      const response = await handler(request, context);
      return response;
    } catch (error) {
      // Log error for debugging (in non-production, include stack trace)
      if (process.env.NODE_ENV !== "production") {
        console.error("API Error:", {
          requestId,
          endpoint: metadata.endpoint,
          method: metadata.method,
          error: error instanceof Error ? error.stack : error,
        });
      } else {
        // In production, log structured error without stack trace
        console.error("API Error:", {
          requestId,
          endpoint: metadata.endpoint,
          method: metadata.method,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return createErrorResponse(error, requestId, metadata);
    }
  };
}

/**
 * Async error handler that wraps async functions
 */
export function asyncHandler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Extract request from args if available
      const request = args.find((arg): arg is NextRequest => arg instanceof NextRequest) as
        | NextRequest
        | undefined;

      const metadata = request ? extractRequestMetadata(request) : undefined;
      const requestId = metadata?.requestId;

      return createErrorResponse(error, requestId, metadata);
    }
  };
}

/**
 * Wrap database operations with error handling
 */
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  context?: { field?: string; metadata?: ErrorMetadata },
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Re-throw AppError instances as-is
    if (error instanceof AppError) {
      throw error;
    }

    // Propagate Postgrest/Supabase errors so the response formatter can classify them
    if (isPostgrestError(error)) {
      const enrichedError: PostgrestError & { metadata?: ErrorMetadata } = {
        ...error,
        metadata: {
          ...(error as { metadata?: ErrorMetadata }).metadata,
          ...(context?.metadata ?? {}),
        },
      };
      throw enrichedError;
    }

    // Re-throw unknown errors
    throw error;
  }
}

function isPostgrestError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  return typeof maybeError.code === "string" && typeof maybeError.message === "string";
}

/**
 * Validate and throw ValidationError if validation fails
 */
export function validateOrThrow(
  isValid: boolean,
  message: string,
  options?: { field?: string; details?: Array<{ field?: string; message: string }> },
): asserts isValid {
  if (!isValid) {
    throw new ValidationError(message, {
      field: options?.field,
      details: options?.details,
    });
  }
}

export { createSuccessResponse, createErrorResponse };
