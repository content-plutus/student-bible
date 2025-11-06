import { normalizeEmail } from "../types/validations";
import { supabase } from "../supabase/client";

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
