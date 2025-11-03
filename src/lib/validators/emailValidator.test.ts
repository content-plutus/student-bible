import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { isEmailUnique, type SupabaseLike } from "./emailValidator";

type SelectResult = { error: { message: string } | null; count: number | null };

type FilterQueryMock = {
  eq: jest.Mock<FilterQueryMock, [string, unknown]>;
  neq: jest.Mock<FilterQueryMock, [string, unknown]>;
  setResponse: (result: SelectResult) => void;
  then: jest.Mock<ReturnType<FilterQueryMock["then"]>, Parameters<FilterQueryMock["then"]>>;
} & PromiseLike<SelectResult>;

const createFilterQuery = (
  initial: SelectResult = { error: null, count: 0 },
): FilterQueryMock => {
  const state = { result: initial };

  const filterQuery: Partial<FilterQueryMock> = {};

  const thenImpl: FilterQueryMock["then"] = (onFulfilled, onRejected) =>
    Promise.resolve(state.result).then(onFulfilled, onRejected);

  filterQuery.eq = jest.fn().mockImplementation(() => filterQuery as FilterQueryMock);
  filterQuery.neq = jest.fn().mockImplementation(() => filterQuery as FilterQueryMock);
  filterQuery.then = jest.fn(thenImpl);
  filterQuery.setResponse = (result: SelectResult) => {
    state.result = result;
  };

  return filterQuery as FilterQueryMock;
};

const createSupabaseMock = (filterQuery: FilterQueryMock) => {
  const select = jest.fn().mockReturnValue(filterQuery);
  const tableBuilder = { select };
  const from = jest.fn().mockReturnValue(tableBuilder);
  const supabase = { from } as SupabaseLike & {
    from: typeof from;
  };

  return { supabase, select, filterQuery };
};

describe("isEmailUnique", () => {
  let filterQuery: FilterQueryMock;
  let supabaseFactory: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    filterQuery = createFilterQuery();
    supabaseFactory = createSupabaseMock(filterQuery);
  });

  it("returns true when no matching email exists", async () => {
    filterQuery.setResponse({ error: null, count: 0 });

    await expect(isEmailUnique(supabaseFactory.supabase, "Test@Example.com"))
      .resolves.toBe(true);

    expect(supabaseFactory.supabase.from).toHaveBeenCalledWith("students");
    expect(supabaseFactory.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(filterQuery.eq).toHaveBeenCalledWith("email", "test@example.com");
    expect(filterQuery.neq).not.toHaveBeenCalled();
  });

  it("returns false when email already exists", async () => {
    filterQuery.setResponse({ error: null, count: 1 });

    await expect(isEmailUnique(supabaseFactory.supabase, "test@example.com"))
      .resolves.toBe(false);
  });

  it("excludes provided student id from uniqueness check", async () => {
    filterQuery.setResponse({ error: null, count: 0 });

    await isEmailUnique(supabaseFactory.supabase, "test@example.com", {
      excludeStudentId: "123",
    });

    expect(filterQuery.neq).toHaveBeenCalledWith("id", "123");
  });

  it("throws when supabase returns an error", async () => {
    filterQuery.setResponse({ error: { message: "boom" }, count: null });

    await expect(isEmailUnique(supabaseFactory.supabase, "test@example.com"))
      .rejects.toThrow("Failed to verify email uniqueness: boom");
  });
});
