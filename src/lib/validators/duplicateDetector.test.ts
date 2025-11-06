import { describe, expect, it, jest } from "@jest/globals";
import { detectDuplicates } from "./duplicateDetector";
import type { Student } from "@/lib/types/student";
import type { MatchingCriteria } from "./matchingRules";

type FilterType = "eq" | "neq" | "ilike";

interface Filter {
  type: FilterType;
  column: string;
  value: unknown;
}

interface ResolverResult {
  data: Student[] | null;
  error: { message: string } | null;
}

type Resolver = (args: { table: string; filters: Filter[]; limit?: number }) => ResolverResult;

class MockQuery {
  private filters: Filter[] = [];
  private limitValue?: number;

  constructor(
    private readonly table: string,
    private readonly resolver: Resolver,
  ) {}

  public eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  public neq(column: string, value: unknown) {
    this.filters.push({ type: "neq", column, value });
    return this;
  }

  public ilike(column: string, value: unknown) {
    this.filters.push({ type: "ilike", column, value });
    return this;
  }

  public limit(value: number) {
    this.limitValue = value;
    return this;
  }

  public then<TResult1 = ResolverResult, TResult2 = never>(
    onFulfilled?: ((value: ResolverResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ) {
    if (typeof onFulfilled !== "function") {
      return Promise.resolve(null) as unknown as Promise<TResult1 | TResult2>;
    }

    try {
      const result = this.resolver({
        table: this.table,
        filters: [...this.filters],
        limit: this.limitValue,
      });
      return Promise.resolve(result).then(onFulfilled, onRejected ?? undefined);
    } catch (error) {
      return Promise.reject(error).then(onFulfilled, onRejected ?? undefined);
    }
  }
}

const createSupabaseMock = (resolver: Resolver) => {
  const from = jest.fn((table: string) => ({
    select: jest.fn(() => new MockQuery(table, resolver)),
  }));

  return { from } as unknown as import("@supabase/supabase-js").SupabaseClient & {
    from: jest.Mock;
  };
};

const createStudent = (overrides: Partial<Student> = {}): Student => ({
  id: "student-1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  phone_number: "9876543210",
  email: "test@example.com",
  first_name: "John",
  last_name: "Doe",
  full_name: "John Doe",
  gender: null,
  date_of_birth: "2000-01-01",
  guardian_phone: "9876543211",
  salutation: null,
  father_name: null,
  mother_name: null,
  aadhar_number: null,
  pan_number: null,
  enrollment_status: null,
  extra_fields: {},
  ...overrides,
});

const emptyResolver: Resolver = () => {
  throw new Error("Supabase should not be queried");
};

const buildResolver =
  (responses: Record<string, Record<string, Student[]>>) =>
  ({ filters }: { filters: Filter[] }): ResolverResult => {
    const eqFilter = filters.find((filter) => filter.type === "eq");
    const ilikeFilter = filters.find((filter) => filter.type === "ilike");
    const neqFilter = filters.find((filter) => filter.type === "neq");

    if (ilikeFilter) {
      const value = String(ilikeFilter.value).replace(/%/g, "").toLowerCase();
      const matches = responses.full_name?.[value] ?? [];
      return { data: matches, error: null };
    }

    if (!eqFilter) {
      return { data: [], error: null };
    }

    const columnMatches = responses[eqFilter.column];
    let data = columnMatches?.[String(eqFilter.value)] ?? [];

    if (neqFilter) {
      data = data.filter((record) => record.id !== String(neqFilter.value));
    }

    return { data, error: null };
  };

const DEFAULT_CRITERIA: MatchingCriteria = {
  fieldRules: [
    {
      field: "phone_number",
      threshold: 1,
      weight: 3,
      enabled: true,
      matchType: "normalized",
    },
    {
      field: "email",
      threshold: 1,
      weight: 3,
      enabled: true,
      matchType: "normalized",
    },
  ],
  crossFieldRules: [],
  overallThreshold: 0.7,
  maxResults: 5,
};

describe("detectDuplicates", () => {
  it("returns no matches when no identifiers are provided", async () => {
    const supabase = createSupabaseMock(emptyResolver);

    const result = await detectDuplicates(supabase, {});

    expect(result.hasPotentialDuplicates).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("detects duplicate candidate when phone and email match", async () => {
    const duplicate = createStudent({ id: "dup-1" });

    const resolver = buildResolver({
      phone_number: {
        "9876543210": [duplicate],
      },
      email: {
        "test@example.com": [duplicate],
      },
      full_name: {},
    });

    const supabase = createSupabaseMock(resolver);

    const result = await detectDuplicates(
      supabase,
      {
        phone_number: "+91 9876543210",
        email: "Test@Example.com",
      },
      DEFAULT_CRITERIA,
    );

    expect(result.hasPotentialDuplicates).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].student.id).toBe("dup-1");
    expect(result.matches[0].overallScore).toBeGreaterThanOrEqual(0.7);
  });

  it("honors excludeStudentId option", async () => {
    const duplicate = createStudent({ id: "student-2" });

    const resolver = buildResolver({
      email: {
        "update@example.com": [duplicate],
      },
      phone_number: {},
      full_name: {},
    });

    const supabase = createSupabaseMock(resolver);

    const result = await detectDuplicates(
      supabase,
      { email: "update@example.com" },
      DEFAULT_CRITERIA,
      { excludeStudentId: "student-2" },
    );

    expect(result.hasPotentialDuplicates).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it("throws when Supabase returns an error", async () => {
    const supabase = createSupabaseMock(() => ({
      data: null,
      error: { message: "database unreachable" },
    }));

    await expect(
      detectDuplicates(supabase, { email: "error@example.com" }, DEFAULT_CRITERIA),
    ).rejects.toThrow("Database error fetching by email: database unreachable");
  });
});
