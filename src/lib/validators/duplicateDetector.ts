import { normalizeEmail, normalizePhoneNumber } from "../types/validations";

export type DuplicateField = "email" | "phone_number" | "guardian_phone";

export interface DuplicateCandidate {
  email?: string | null;
  phoneNumber?: string | null;
  guardianPhone?: string | null;
}

export interface DuplicateRecord {
  id: string;
  email?: string | null;
  phone_number?: string | null;
  guardian_phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface DuplicateMatch {
  field: DuplicateField;
  value: string;
  records: DuplicateRecord[];
}

export interface DuplicateDetectionResult {
  matches: DuplicateMatch[];
  hasMatches: boolean;
}

type QueryError = { message: string } | null;

type DuplicateQueryResult = {
  data: DuplicateRecord[] | null;
  error: QueryError;
};

type FilterQuery = PromiseLike<DuplicateQueryResult> & {
  eq: (column: string, value: unknown) => FilterQuery;
  neq: (column: string, value: unknown) => FilterQuery;
};

type StudentsTableBuilder = {
  select: (columns?: string) => FilterQuery;
};

export type SupabaseDuplicateClient = {
  from: (table: string) => StudentsTableBuilder;
};

export interface DuplicateDetectionOptions {
  /**
   * Fields to check for duplicates. Defaults to `["email", "phone_number"]`.
   * When omitted, set `includeGuardianPhone` to true to add guardian checks.
   */
  fields?: DuplicateField[];
  /**
   * Append guardian phone to the default field list without overriding it entirely.
   */
  includeGuardianPhone?: boolean;
  /**
   * Exclude an existing student id from duplicate checks (useful when updating).
   */
  excludeStudentId?: string;
}

type FieldConfig = {
  column: DuplicateField;
  getValue: (candidate: DuplicateCandidate) => string | null;
};

const DEFAULT_FIELDS: DuplicateField[] = ["email", "phone_number"];

const FIELD_CONFIG: Record<DuplicateField, FieldConfig> = {
  email: {
    column: "email",
    getValue: (candidate) => normaliseEmail(candidate.email),
  },
  phone_number: {
    column: "phone_number",
    getValue: (candidate) => normalisePhone(candidate.phoneNumber),
  },
  guardian_phone: {
    column: "guardian_phone",
    getValue: (candidate) => normalisePhone(candidate.guardianPhone),
  },
};

const normaliseEmail = (value?: string | null): string | null => {
  if (!value) return null;
  return normalizeEmail(value);
};

const normalisePhone = (value?: string | null): string | null => {
  if (!value) return null;
  const digitsOnly = normalizePhoneNumber(value);
  return digitsOnly.length === 10 ? digitsOnly : null;
};

const buildFieldList = (options: DuplicateDetectionOptions | undefined): DuplicateField[] => {
  if (options?.fields && options.fields.length > 0) {
    return options.fields;
  }

  if (options?.includeGuardianPhone) {
    return [...DEFAULT_FIELDS, "guardian_phone"];
  }

  return DEFAULT_FIELDS;
};

export const detectDuplicateStudents = async (
  supabase: SupabaseDuplicateClient,
  candidate: DuplicateCandidate,
  options?: DuplicateDetectionOptions,
): Promise<DuplicateDetectionResult> => {
  const fieldsToCheck = buildFieldList(options);
  const matches: DuplicateMatch[] = [];

  for (const field of fieldsToCheck) {
    const config = FIELD_CONFIG[field];
    const value = config.getValue(candidate);

    if (!value) {
      continue;
    }

    let query = supabase
      .from("students")
      .select("id,email,phone_number,guardian_phone,first_name,last_name")
      .eq(config.column, value);

    if (options?.excludeStudentId) {
      query = query.neq("id", options.excludeStudentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check duplicates by ${config.column}: ${error.message}`);
    }

    if (data && data.length > 0) {
      matches.push({
        field,
        value,
        records: data,
      });
    }
  }

  return {
    matches,
    hasMatches: matches.length > 0,
  };
};
