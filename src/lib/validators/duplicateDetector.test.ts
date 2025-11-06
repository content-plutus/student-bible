import { describe, expect, it, jest } from "@jest/globals";
import {
  detectDuplicateStudents,
  type SupabaseDuplicateClient,
  type DuplicateRecord,
  type DuplicateField,
} from "./duplicateDetector";

type FilterType = "eq" | "neq";

type Filter = {
  type: FilterType;
  column: string;
  value: unknown;
};

type ResolverResult = {
  data: DuplicateRecord[] | null;
  error: { message: string } | null;
};

type Resolver = (args: { table: string; filters: Filter[] }) => ResolverResult;

type FilterQuery = {
  eq: jest.Mock<FilterQuery, [string, unknown]>;
  neq: jest.Mock<FilterQuery, [string, unknown]>;
  then: jest.Mock<
    Promise<unknown>,
    [
      (value: ResolverResult) => unknown,
      ((reason: unknown) => unknown) | undefined
    ]
  >;
};

const createFilterQuery = (table: string, resolver: Resolver) => {
  const filters: Filter[] = [];

  const filterQuery = {} as FilterQuery;

  filterQuery.eq = jest.fn<FilterQuery, [string, unknown]>((column, value) => {
    filters.push({ type: "eq", column, value });
    return filterQuery;
  });

  filterQuery.neq = jest.fn<FilterQuery, [string, unknown]>((column, value) => {
    filters.push({ type: "neq", column, value });
    return filterQuery;
  });

  filterQuery.then = jest.fn<
    Promise<unknown>,
    [
      (value: ResolverResult) => unknown,
      ((reason: unknown) => unknown) | undefined
    ]
  >((onFulfilled, onRejected) => {
    try {
      const result = resolver({ table, filters });
      return Promise.resolve(result).then(onFulfilled, onRejected);
    } catch (error) {
      return Promise.reject(error).then(onFulfilled, onRejected);
    }
  });

  return filterQuery;
};

const createSupabaseMock = (resolver: Resolver): SupabaseDuplicateClient & { from: jest.Mock } => {
  const from = jest.fn((table: string) => ({
    select: jest.fn(() => createFilterQuery(table, resolver)),
  }));

  return { from } as SupabaseDuplicateClient & { from: jest.Mock };
};

const buildResolver =
  (responses: Record<DuplicateField, Record<string, DuplicateRecord[]>>) =>
  ({ filters }: { filters: Filter[] }) => {
    const eqFilter = filters.find((filter) => filter.type === "eq");
    const neqFilter = filters.find((filter) => filter.type === "neq");

    if (!eqFilter) {
      return { data: [], error: null };
    }

    const column = eqFilter.column as DuplicateField;
    const value = String(eqFilter.value);
    const matches = responses[column]?.[value] ?? [];

    if (neqFilter) {
      const excludedId = String(neqFilter.value);
      return {
        data: matches.filter((record) => record.id !== excludedId),
        error: null,
      };
    }

    return { data: matches, error: null };
  };

describe("detectDuplicateStudents", () => {
  it("returns empty result when no identifiers are provided", async () => {
    const supabase = createSupabaseMock(() => ({ data: [], error: null }));

    const result = await detectDuplicateStudents(
      supabase,
      { email: null, phoneNumber: undefined, guardianPhone: "" },
    );

    expect(result.hasMatches).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("detects duplicates for email and phone by default", async () => {
    const resolver = buildResolver({
      email: {
        "test@example.com": [{ id: "student-1", email: "test@example.com" }],
      },
      phone_number: {
        "9876543210": [{ id: "student-2", phone_number: "9876543210" }],
      },
      guardian_phone: {},
    });

    const supabase = createSupabaseMock(resolver);

    const result = await detectDuplicateStudents(supabase, {
      email: "Test@Example.com ",
      phoneNumber: "+91 9876543210",
    });

    expect(result.hasMatches).toBe(true);
    expect(result.matches).toHaveLength(2);
    const emailMatch = result.matches.find((match) => match.field === "email");
    expect(emailMatch?.value).toBe("test@example.com");
    expect(emailMatch?.records[0].id).toBe("student-1");

    const phoneMatch = result.matches.find((match) => match.field === "phone_number");
    expect(phoneMatch?.value).toBe("9876543210");
    expect(phoneMatch?.records[0].id).toBe("student-2");
  });

  it("includes guardian phone when requested", async () => {
    const resolver = buildResolver({
      email: {},
      phone_number: {},
      guardian_phone: {
        "8765432109": [{ id: "student-3", guardian_phone: "8765432109" }],
      },
    });

    const supabase = createSupabaseMock(resolver);

    const result = await detectDuplicateStudents(
      supabase,
      { guardianPhone: " 8765432109 " },
      { includeGuardianPhone: true },
    );

    expect(result.hasMatches).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].field).toBe("guardian_phone");
    expect(result.matches[0].records[0].id).toBe("student-3");
  });

  it("applies excludeStudentId filter when provided", async () => {
    const resolver = buildResolver({
      email: {
        "update@example.com": [
          { id: "student-4", email: "update@example.com" },
          { id: "student-5", email: "update@example.com" },
        ],
      },
      phone_number: {},
      guardian_phone: {},
    });

    const supabase = createSupabaseMock(resolver);

    const result = await detectDuplicateStudents(
      supabase,
      { email: "update@example.com" },
      { excludeStudentId: "student-4" },
    );

    expect(result.hasMatches).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].records).toHaveLength(1);
    expect(result.matches[0].records[0].id).toBe("student-5");
  });

  it("throws when supabase returns an error", async () => {
    const supabase = createSupabaseMock(() => ({
      data: null,
      error: { message: "database unreachable" },
    }));

    await expect(
      detectDuplicateStudents(supabase, { email: "error@example.com" }),
    ).rejects.toThrow("Failed to check duplicates by email: database unreachable");
  });
});
