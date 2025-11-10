import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local",
  );
}

/**
 * Creates a Supabase client for server components and route handlers.
 * This client respects Row Level Security (RLS) and uses the authenticated user's context.
 *
 * @returns SupabaseClient instance with user authentication context
 */
export function createServerClient() {
  return createServerComponentClient({
    cookies,
  });
}

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) and should only be used
 * for trusted server-side operations.
 *
 * WARNING: Use with caution. This client has elevated permissions.
 *
 * @returns SupabaseClient instance with service role privileges
 */
export function createServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This is required for service role operations.",
    );
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Default server-side Supabase client (respects RLS).
 * For most server-side operations, use this client.
 *
 * Note: This is a function that creates a new client instance on each call
 * to properly handle the cookies context in Next.js App Router.
 */
export const supabase = createServerClient;

/**
 * Service role Supabase client (bypasses RLS).
 * Use only for trusted operations that require elevated permissions.
 *
 * Note: This creates a singleton instance since it doesn't depend on request context.
 */
let serviceRoleClientInstance: ReturnType<typeof createServiceRoleClient> | null = null;

export const supabaseAdmin = () => {
  if (!serviceRoleClientInstance) {
    serviceRoleClientInstance = createServiceRoleClient();
  }
  return serviceRoleClientInstance;
};
