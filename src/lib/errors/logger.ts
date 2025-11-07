import { AppError } from "./AppError";
import { ErrorCategory, ErrorSeverity, ErrorMetadata } from "./types";

/**
 * Error logger interface for extensibility
 */
export interface ErrorLogger {
  log(error: AppError | Error, metadata?: ErrorMetadata): void;
  logError(error: AppError | Error, metadata?: ErrorMetadata): void;
  logWarning(error: AppError | Error, metadata?: ErrorMetadata): void;
  logInfo(message: string, metadata?: ErrorMetadata): void;
}

/**
 * Default error logger implementation
 */
class DefaultErrorLogger implements ErrorLogger {
  log(error: AppError | Error, metadata?: ErrorMetadata): void {
    const logData = this.formatLogData(error, metadata);
    
    if (error instanceof AppError) {
      // Use severity to determine log level
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          console.error("Error:", logData);
          break;
        case ErrorSeverity.MEDIUM:
          console.warn("Error:", logData);
          break;
        case ErrorSeverity.LOW:
          console.info("Error:", logData);
          break;
      }
    } else {
      console.error("Error:", logData);
    }
  }

  logError(error: AppError | Error, metadata?: ErrorMetadata): void {
    console.error("Error:", this.formatLogData(error, metadata));
  }

  logWarning(error: AppError | Error, metadata?: ErrorMetadata): void {
    console.warn("Warning:", this.formatLogData(error, metadata));
  }

  logInfo(message: string, metadata?: ErrorMetadata): void {
    console.info("Info:", { message, ...metadata });
  }

  private formatLogData(error: AppError | Error, metadata?: ErrorMetadata) {
    const baseData = {
      message: error.message,
      name: error.name,
      ...(error instanceof AppError && {
        code: error.code,
        category: error.category,
        severity: error.severity,
        statusCode: error.statusCode,
        field: error.field,
        details: error.details,
      }),
      ...metadata,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      return {
        ...baseData,
        stack: error.stack,
      };
    }

    return baseData;
  }
}

/**
 * Singleton error logger instance
 */
let loggerInstance: ErrorLogger | null = null;

/**
 * Get or create the error logger instance
 */
export function getErrorLogger(): ErrorLogger {
  if (!loggerInstance) {
    loggerInstance = new DefaultErrorLogger();
  }
  return loggerInstance;
}

/**
 * Set a custom error logger
 */
export function setErrorLogger(logger: ErrorLogger): void {
  loggerInstance = logger;
}

/**
 * Log an error with metadata
 */
export function logError(error: AppError | Error, metadata?: ErrorMetadata): void {
  getErrorLogger().logError(error, metadata);
}

/**
 * Log a warning with metadata
 */
export function logWarning(error: AppError | Error, metadata?: ErrorMetadata): void {
  getErrorLogger().logWarning(error, metadata);
}

/**
 * Log info message with metadata
 */
export function logInfo(message: string, metadata?: ErrorMetadata): void {
  getErrorLogger().logInfo(message, metadata);
}

/**
 * Log error based on severity
 */
export function log(error: AppError | Error, metadata?: ErrorMetadata): void {
  getErrorLogger().log(error, metadata);
}

