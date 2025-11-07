/**
 * Error classification system for comprehensive error handling
 */

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  DATABASE = "DATABASE",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  NETWORK = "NETWORK",
  RATE_LIMIT = "RATE_LIMIT",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL = "INTERNAL",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Standard error codes for consistent error identification
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_TYPE = "INVALID_TYPE",
  VALUE_TOO_SMALL = "VALUE_TOO_SMALL",
  VALUE_TOO_LARGE = "VALUE_TOO_LARGE",
  INVALID_ENUM_VALUE = "INVALID_ENUM_VALUE",
  MALFORMED_JSON = "MALFORMED_JSON",
  UNSUPPORTED_CONTENT_TYPE = "UNSUPPORTED_CONTENT_TYPE",

  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_API_KEY = "INVALID_API_KEY",
  MISSING_API_KEY = "MISSING_API_KEY",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Authorization errors (403)
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Not found errors (404)
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  ENDPOINT_NOT_FOUND = "ENDPOINT_NOT_FOUND",

  // Conflict errors (409)
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",

  // Database errors (500)
  DATABASE_ERROR = "DATABASE_ERROR",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  FOREIGN_KEY_VIOLATION = "FOREIGN_KEY_VIOLATION",
  UNIQUE_VIOLATION = "UNIQUE_VIOLATION",
  NOT_NULL_VIOLATION = "NOT_NULL_VIOLATION",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  CONNECTION_ERROR = "CONNECTION_ERROR",

  // Business logic errors (400/422)
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",

  // External service errors (502/503)
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  EXTERNAL_SERVICE_TIMEOUT = "EXTERNAL_SERVICE_TIMEOUT",
  EXTERNAL_SERVICE_UNAVAILABLE = "EXTERNAL_SERVICE_UNAVAILABLE",

  // Network errors (503)
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Internal errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    details?: ErrorDetail[];
    field?: string;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error detail for field-specific or additional context
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Error metadata for logging and debugging
 */
export interface ErrorMetadata {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  stack?: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}
