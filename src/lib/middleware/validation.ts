import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema, ZodError } from "zod";

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  error: string;
  details: ValidationError[];
}

export type ValidatedHandler<T> = (
  req: NextRequest,
  validatedData: T,
) => Promise<Response> | Response;

function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => {
    const field = issue.path.join(".");
    const message = issue.message;

    let code = "VALIDATION_ERROR";

    if (issue.code === "invalid_type") {
      code = "INVALID_TYPE";
    } else if (issue.code === "invalid_string") {
      if (issue.validation === "email") {
        code = "INVALID_EMAIL_FORMAT";
      } else if (issue.validation === "regex") {
        if (message.includes("phone")) {
          code = "INVALID_PHONE_FORMAT";
        } else if (message.includes("AADHAR")) {
          code = "INVALID_AADHAR_FORMAT";
        } else if (message.includes("PAN")) {
          code = "INVALID_PAN_FORMAT";
        } else if (message.includes("PIN")) {
          code = "INVALID_POSTAL_CODE";
        } else {
          code = "INVALID_FORMAT";
        }
      } else {
        code = "INVALID_STRING";
      }
    } else if (issue.code === "too_small") {
      code = "VALUE_TOO_SMALL";
    } else if (issue.code === "too_big") {
      code = "VALUE_TOO_LARGE";
    } else if (issue.code === "custom") {
      if (message.includes("age")) {
        code = "INVALID_AGE";
      } else if (message.includes("checksum")) {
        code = "INVALID_CHECKSUM";
      } else {
        code = "CUSTOM_VALIDATION_FAILED";
      }
    }

    return {
      field: field || "unknown",
      message,
      code,
    };
  });
}

function createErrorResponse(
  message: string,
  details: ValidationError[],
  status: number = 400,
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}

async function parseRequestData(req: NextRequest): Promise<unknown> {
  const method = req.method.toUpperCase();

  if (method === "GET" || method === "HEAD") {
    const searchParams = req.nextUrl.searchParams;
    const data: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      const existing = data[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          data[key] = [existing, value];
        }
      } else {
        data[key] = value;
      }
    });

    return data;
  }

  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        return body;
      } catch {
        throw new Error("Invalid JSON in request body");
      }
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const data: Record<string, string | string[]> = {};

      formData.forEach((value, key) => {
        const stringValue = value.toString();
        const existing = data[key];
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(stringValue);
          } else {
            data[key] = [existing, stringValue];
          }
        } else {
          data[key] = stringValue;
        }
      });

      return data;
    }

    try {
      const body = await req.json();
      return body;
    } catch {
      return {};
    }
  }

  return {};
}

export function withValidation<T>(schema: ZodSchema<T>) {
  return function (handler: ValidatedHandler<T>) {
    return async (req: NextRequest): Promise<Response> => {
      try {
        const rawData = await parseRequestData(req);

        const result = schema.safeParse(rawData);

        if (!result.success) {
          const validationErrors = formatZodError(result.error);
          return createErrorResponse("Validation failed", validationErrors, 400);
        }

        return await handler(req, result.data);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Invalid JSON in request body") {
            return createErrorResponse(
              "Invalid request format",
              [
                {
                  field: "body",
                  message: "Request body contains malformed JSON",
                  code: "MALFORMED_JSON",
                },
              ],
              400,
            );
          }

          return NextResponse.json(
            {
              error: "Internal server error",
              message: error.message,
            },
            { status: 500 },
          );
        }

        return NextResponse.json(
          {
            error: "Internal server error",
            message: "An unexpected error occurred",
          },
          { status: 500 },
        );
      }
    };
  };
}

export function withPartialValidation<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return withValidation(schema.partial());
}

export function createValidationSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

export { z };
