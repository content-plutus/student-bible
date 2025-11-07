import { ErrorCategory, ErrorCode, ErrorSeverity, ErrorDetail, ErrorMetadata } from "./types";

/**
 * Base application error class with classification support
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: ErrorDetail[];
  public readonly field?: string;
  public readonly metadata?: ErrorMetadata;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    options?: {
      severity?: ErrorSeverity;
      statusCode?: number;
      details?: ErrorDetail[];
      field?: string;
      metadata?: ErrorMetadata;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = options?.severity ?? ErrorSeverity.MEDIUM;
    this.statusCode = options?.statusCode ?? this.getDefaultStatusCode(category);
    this.details = options?.details;
    this.field = options?.field;
    this.metadata = options?.metadata;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private getDefaultStatusCode(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.NOT_FOUND:
        return 404;
      case ErrorCategory.CONFLICT:
        return 409;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.NETWORK:
        return 503;
      default:
        return 500;
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): {
    code: ErrorCode;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    details?: ErrorDetail[];
    field?: string;
  } {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      ...(this.details && { details: this.details }),
      ...(this.field && { field: this.field }),
    };
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    options?: {
      details?: ErrorDetail[];
      field?: string;
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, ErrorCategory.VALIDATION, {
      severity: ErrorSeverity.LOW,
      statusCode: 400,
      details: options?.details,
      field: options?.field,
      metadata: options?.metadata,
    });
  }
}

/**
 * Database error for database-related failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DATABASE_ERROR,
    options?: {
      severity?: ErrorSeverity;
      details?: ErrorDetail[];
      metadata?: ErrorMetadata;
      cause?: Error;
    },
  ) {
    super(message, code, ErrorCategory.DATABASE, {
      severity: options?.severity ?? ErrorSeverity.HIGH,
      statusCode: 500,
      details: options?.details,
      metadata: options?.metadata,
      cause: options?.cause,
    });
  }
}

/**
 * Authentication error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    options?: {
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, code, ErrorCategory.AUTHENTICATION, {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 401,
      metadata: options?.metadata,
    });
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string,
    options?: {
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, ErrorCode.FORBIDDEN, ErrorCategory.AUTHORIZATION, {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 403,
      metadata: options?.metadata,
    });
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(
    message: string,
    options?: {
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, ErrorCode.RESOURCE_NOT_FOUND, ErrorCategory.NOT_FOUND, {
      severity: ErrorSeverity.LOW,
      statusCode: 404,
      metadata: options?.metadata,
    });
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DUPLICATE_RESOURCE,
    options?: {
      details?: ErrorDetail[];
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, code, ErrorCategory.CONFLICT, {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 409,
      details: options?.details,
      metadata: options?.metadata,
    });
  }
}

/**
 * Business logic error for business rule violations
 */
export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    options?: {
      details?: ErrorDetail[];
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, ErrorCategory.BUSINESS_LOGIC, {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 422,
      details: options?.details,
      metadata: options?.metadata,
    });
  }
}

/**
 * External service error for third-party service failures
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    options?: {
      severity?: ErrorSeverity;
      metadata?: ErrorMetadata;
      cause?: Error;
    },
  ) {
    super(message, code, ErrorCategory.EXTERNAL_SERVICE, {
      severity: options?.severity ?? ErrorSeverity.HIGH,
      statusCode: 502,
      metadata: options?.metadata,
      cause: options?.cause,
    });
  }
}

/**
 * Rate limit error for rate limiting violations
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    options?: {
      metadata?: ErrorMetadata;
    },
  ) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, ErrorCategory.RATE_LIMIT, {
      severity: ErrorSeverity.MEDIUM,
      statusCode: 429,
      metadata: options?.metadata,
    });
  }
}
