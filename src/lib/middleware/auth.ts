import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthError {
  error: string;
  code: string;
}

export interface AuthErrorResponse {
  error: string;
  code: string;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  user: User,
  supabase: SupabaseClient,
) => Promise<Response> | Response;

function createAuthErrorResponse(
  message: string,
  code: string = "UNAUTHORIZED",
  status: number = 401,
): NextResponse<AuthErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    { status },
  );
}

/**
 * JWT authentication middleware for API routes.
 *
 * This middleware:
 * - Extracts JWT tokens using Supabase's built-in authentication
 * - Uses createServerClient() and supabase.auth.getUser() for validation
 * - Returns 401 for invalid/missing tokens
 * - Passes authenticated user and user-context Supabase client to handler
 *
 * The Supabase client passed to handlers respects Row Level Security (RLS)
 * and operates in the authenticated user's context.
 *
 * @returns Higher-order function that wraps route handlers with JWT authentication
 *
 * @example
 * ```typescript
 * export const GET = withAuth()(async (req, user, supabase) => {
 *   // user is the authenticated User object
 *   // supabase is a client that respects RLS for this user
 *   const { data } = await supabase.from('students').select('*');
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withAuth() {
  return function (handler: AuthenticatedHandler) {
    return async (req: NextRequest): Promise<Response> => {
      try {
        const supabase = createServerClient();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("JWT authentication error:", error);
          return createAuthErrorResponse(
            "Authentication failed. Invalid or expired token.",
            "INVALID_TOKEN",
            401,
          );
        }

        if (!user) {
          return createAuthErrorResponse(
            "Unauthorized. Valid authentication token required.",
            "MISSING_TOKEN",
            401,
          );
        }

        return await handler(req, user, supabase);
      } catch (error) {
        console.error("Unexpected error in auth middleware:", error);

        if (error instanceof Error) {
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
            message: "An unexpected error occurred during authentication",
          },
          { status: 500 },
        );
      }
    };
  };
}
