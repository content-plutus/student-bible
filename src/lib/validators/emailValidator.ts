import { normalizeEmail } from "../types/validations";

type QueryError = { message: string } | null;
type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };
type SelectResult = { error: QueryError; count: number | null };

export type StudentsFilterBuilder = {
  eq: (column: string, value: unknown) => StudentsFilterBuilder;
  neq: (column: string, value: unknown) => StudentsFilterBuilder;
  select: (columns?: string, options?: SelectOptions) => Promise<SelectResult>;
};

export type SupabaseLike = {
  from: (table: string) => StudentsFilterBuilder;
};

export type EmailUniquenessOptions = {
  /** Student id to exclude (useful when updating an existing record) */
  excludeStudentId?: string;
};

/**
 * Checks whether an email address already exists in the `students` table.
 * The email is normalised (trimmed + lowercased) before querying.
 */
export const isEmailUnique = async (
  supabase: SupabaseLike,
  email: string,
  options: EmailUniquenessOptions = {},
): Promise<boolean> => {
  const normalisedEmail = normalizeEmail(email);

  let query = supabase.from("students").eq("email", normalisedEmail);

  if (options.excludeStudentId) {
    query = query.neq("id", options.excludeStudentId);
  }

  const { error, count } = await query.select("id", {
    count: "exact",
    head: true,
  });

  if (error) {
    throw new Error(`Failed to verify email uniqueness: ${error.message}`);
  }

  return (count ?? 0) === 0;
};
