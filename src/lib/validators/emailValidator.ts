import { normalizeEmail } from "../types/validations";

type QueryError = { message: string } | null;
type SelectOptions = { head?: boolean; count?: "exact" | "planned" | "estimated" };
type SelectResult = { error: QueryError; count: number | null };

type FilterQuery = PromiseLike<SelectResult> & {
  eq: (column: string, value: unknown) => FilterQuery;
  neq: (column: string, value: unknown) => FilterQuery;
};

type StudentsTableBuilder = {
  select: (columns?: string, options?: SelectOptions) => FilterQuery;
};

export type SupabaseLike = {
  from: (table: string) => StudentsTableBuilder;
};

export type EmailUniquenessOptions = {
  /** Student id to exclude (useful when updating an existing record) */
  excludeStudentId?: string;
};

/**
 * Normalises the email (trim + lowercase) and returns `true` when the
 * address is available (no matching record in `students`). Returns `false`
 * when the email already exists.
 */
export const isEmailUnique = async (
  supabase: SupabaseLike,
  email: string,
  options: EmailUniquenessOptions = {},
): Promise<boolean> => {
  const normalisedEmail = normalizeEmail(email);

  let query = supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("email", normalisedEmail);

  if (options.excludeStudentId) {
    query = query.neq("id", options.excludeStudentId);
  }

  const { error, count } = await query;

  if (error) {
    throw new Error(`Failed to verify email uniqueness: ${error.message}`);
  }

  return (count ?? 0) === 0;
};
