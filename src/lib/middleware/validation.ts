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
  rawData: unknown,
) => Promise<Response> | Response;

const FIELD_ERROR_CODE_MAP: Record<string, string> = {
  phone_number: "INVALID_PHONE_FORMAT",
  guardian_phone: "INVALID_PHONE_FORMAT",
  aadhar_number: "INVALID_AADHAR_FORMAT",
  pan_number: "INVALID_PAN_FORMAT",
  postal_code: "INVALID_POSTAL_CODE",
  email: "INVALID_EMAIL_FORMAT",
  date_of_birth: "INVALID_DATE_OF_BIRTH",
};

function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => {
    const field = issue.path.join(".");
    const message = issue.message;
    const fieldName = issue.path[issue.path.length - 1] as string;

    let code = "VALIDATION_ERROR";

    if (issue.code === "invalid_type") {
      code = "INVALID_TYPE";
    } else if (issue.code === "invalid_format") {
      const format = (issue as { format?: string }).format;
      if (format === "email") {
        code = "INVALID_EMAIL_FORMAT";
      } else if (format === "regex") {
        code = FIELD_ERROR_CODE_MAP[fieldName] || "INVALID_FORMAT";
      } else {
        code = "INVALID_FORMAT";
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
      } else if (message.includes("Guardian phone")) {
        code = "INVALID_CROSS_FIELD_VALIDATION";
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

    if (contentType && !contentType.includes("application/json")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    try {
      const body = await req.json();
      return body;
    } catch {
      throw new Error("Invalid JSON in request body");
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

        return await handler(req, result.data, rawData);
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

          if (error.message.startsWith("Unsupported content type:")) {
            return createErrorResponse(
              "Unsupported content type",
              [
                {
                  field: "content-type",
                  message: error.message,
                  code: "UNSUPPORTED_CONTENT_TYPE",
                },
              ],
              415,
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
