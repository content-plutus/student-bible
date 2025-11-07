# Comprehensive Error Handling System

This module provides a comprehensive error handling system with error classification, standardized error responses, and error handling middleware for API routes.

## Features

- **Error Classification**: Categorize errors by type (validation, database, authentication, etc.)
- **Standardized Responses**: Consistent error response format across all API endpoints
- **Error Codes**: Standardized error codes for easy identification and handling
- **Severity Levels**: Error severity classification (LOW, MEDIUM, HIGH, CRITICAL)
- **Database Error Classification**: Automatic classification of Supabase/PostgreSQL errors
- **Error Logging**: Structured error logging with metadata
- **Type Safety**: Full TypeScript support with type-safe error classes

## Usage

### Basic Usage in API Routes

Wrap your route handler with `withErrorHandling`:

```typescript
import { withErrorHandling, createSuccessResponse, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Your handler code
  // Throw errors as needed - they'll be automatically converted to proper responses
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }
  
  return createSuccessResponse({ data: resource });
});
```

### Using Custom Error Classes

```typescript
import {
  ValidationError,
  DatabaseError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
} from "@/lib/errors";

// Validation error
throw new ValidationError("Invalid input", {
  field: "email",
  details: [{ field: "email", message: "Invalid email format" }],
});

// Database error
throw new DatabaseError("Database operation failed", ErrorCode.CONNECTION_ERROR);

// Authentication error
throw new AuthenticationError("Invalid API key");

// Not found error
throw new NotFoundError(`Student with ID ${id} not found`);

// Conflict error (e.g., duplicate)
throw new ConflictError("Email already exists");

// Business logic error
throw new BusinessLogicError("Cannot delete student with active certifications");
```

### Handling Database Operations

Use `handleDatabaseOperation` to wrap database calls:

```typescript
import { handleDatabaseOperation, DatabaseError } from "@/lib/errors";

const result = await handleDatabaseOperation(
  async () => {
    const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  {
    field: "id",
    metadata: { endpoint: request.nextUrl.pathname },
  },
);
```

### Error Response Format

All errors are returned in a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "category": "VALIDATION",
    "severity": "LOW",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL_FORMAT"
      }
    ],
    "field": "email",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_1234567890_abc123"
  }
}
```

### Success Response Format

Use `createSuccessResponse` for consistent success responses:

```typescript
return createSuccessResponse({ student: studentData });
```

Returns:

```json
{
  "success": true,
  "data": {
    "student": { ... }
  }
}
```

## Error Categories

- **VALIDATION**: Input validation failures (400)
- **DATABASE**: Database operation failures (500)
- **AUTHENTICATION**: Authentication failures (401)
- **AUTHORIZATION**: Permission failures (403)
- **NOT_FOUND**: Resource not found (404)
- **CONFLICT**: Resource conflicts (409)
- **BUSINESS_LOGIC**: Business rule violations (422)
- **EXTERNAL_SERVICE**: Third-party service failures (502)
- **NETWORK**: Network errors (503)
- **RATE_LIMIT**: Rate limiting violations (429)
- **INTERNAL**: Internal server errors (500)

## Error Codes

Common error codes include:

- `VALIDATION_FAILED` - General validation failure
- `INVALID_INPUT` - Invalid input data
- `MISSING_REQUIRED_FIELD` - Required field missing
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Resource not found
- `DUPLICATE_RESOURCE` - Duplicate resource
- `DATABASE_ERROR` - Database operation failed
- `CONSTRAINT_VIOLATION` - Database constraint violation
- `UNIQUE_VIOLATION` - Unique constraint violation
- `BUSINESS_RULE_VIOLATION` - Business rule violation

See `src/lib/errors/types.ts` for the complete list.

## Error Severity

- **LOW**: Non-critical errors (validation failures, not found)
- **MEDIUM**: Moderate errors (authentication, conflicts)
- **HIGH**: Serious errors (database failures, external service errors)
- **CRITICAL**: Critical errors requiring immediate attention

## Database Error Classification

The system automatically classifies Supabase/PostgreSQL errors:

- Unique constraint violations → `UNIQUE_VIOLATION` (409)
- Foreign key violations → `FOREIGN_KEY_VIOLATION` (400)
- Not null violations → `NOT_NULL_VIOLATION` (400)
- Check constraint violations → `CONSTRAINT_VIOLATION` (400)
- Connection errors → `CONNECTION_ERROR` (503)

## Error Logging

Errors are automatically logged with metadata:

```typescript
import { logError, logWarning } from "@/lib/errors/logger";

logError(error, {
  requestId: "req_123",
  endpoint: "/api/students",
  method: "GET",
});
```

## Migration Guide

### Before

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... handler code
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### After

```typescript
import { withErrorHandling, createSuccessResponse } from "@/lib/errors";

export const GET = withErrorHandling(async (request: NextRequest) => {
  // ... handler code
  // Errors are automatically handled
  return createSuccessResponse({ data });
});
```

## Best Practices

1. **Use appropriate error classes**: Choose the right error class for the situation
2. **Include metadata**: Add metadata to errors for better debugging
3. **Handle specific cases**: Check for specific error codes (e.g., PGRST116 for not found)
4. **Use field information**: Include field names in validation errors
5. **Log errors**: Use the logging utilities for production debugging
6. **Don't expose internals**: In production, don't expose stack traces or internal error details

## Examples

See `src/app/api/students/[id]/route.ts` for a complete example of using the error handling system.

