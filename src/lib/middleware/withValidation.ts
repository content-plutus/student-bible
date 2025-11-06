import { NextResponse } from "next/server";
import type { ZodError, ZodTypeAny, z } from "zod";
import { formatValidationErrors } from "@/lib/utils/errorFormatter";

type BodyParser =
  | "json"
  | "formData"
  | "text"
  | ((request: Request) => Promise<unknown>);

export interface WithValidationOptions {
  /**
   * Configure how the request body is parsed before validation.
   * Defaults to `"json"`, which calls `request.json()`.
   */
  parser?: BodyParser;
  /**
   * Customise the message returned when the payload cannot be parsed.
   */
  invalidPayloadMessage?: string;
  /**
   * Customise the message returned when validation fails.
   */
  validationErrorMessage?: string;
  /**
   * Hook for producing a bespoke response when validation fails.
   * When provided the default 400 response is skipped.
   */
  onValidationError?: (error: ZodError) => Response | Promise<Response>;
}

export interface WithValidationHandlerArgs<TSchema extends ZodTypeAny, TContext> {
  request: Request;
  context: TContext;
  validatedData: z.infer<TSchema>;
  rawInput: unknown;
}

export type WithValidationHandler<TSchema extends ZodTypeAny, TContext> = (
  args: WithValidationHandlerArgs<TSchema, TContext>,
) => Response | Promise<Response>;

const DEFAULT_INVALID_PAYLOAD_MESSAGE = "Invalid request payload";
const DEFAULT_VALIDATION_ERROR_MESSAGE = "Validation failed";

const parseRequestBody = async (request: Request, parser: BodyParser): Promise<unknown> => {
  const target = request.clone();

  if (typeof parser === "function") {
    return parser(target);
  }

  switch (parser) {
    case "formData": {
      const formData = await target.formData();
      return Object.fromEntries(formData.entries());
    }
    case "text":
      return target.text();
    case "json":
    default:
      return target.json();
  }
};

export function withValidation<TSchema extends ZodTypeAny, TContext = unknown>(
  schema: TSchema,
  handler: WithValidationHandler<TSchema, TContext>,
  options?: WithValidationOptions,
) {
  return async (request: Request, context?: TContext): Promise<Response> => {
    let rawInput: unknown;

    try {
      rawInput = await parseRequestBody(request, options?.parser ?? "json");
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: options?.invalidPayloadMessage ?? DEFAULT_INVALID_PAYLOAD_MESSAGE,
        },
        { status: 400 },
      );
    }

    const validationResult = await schema.safeParseAsync(rawInput);

    if (!validationResult.success) {
      if (options?.onValidationError) {
        return options.onValidationError(validationResult.error);
      }

      return NextResponse.json(
        {
          success: false,
          message: options?.validationErrorMessage ?? DEFAULT_VALIDATION_ERROR_MESSAGE,
          errors: formatValidationErrors(validationResult.error),
        },
        { status: 400 },
      );
    }

    return handler({
      request,
      context: (context ?? ({} as TContext)),
      validatedData: validationResult.data,
      rawInput,
    });
  };
}
