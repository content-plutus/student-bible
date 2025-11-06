import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@supabase/auth-helpers-nextjs", () => {
  type SelectResult = { error: { message: string } | null; count: number | null };

  type FilterQueryMock = {
    eq: jest.Mock<FilterQueryMock, [string, unknown]>;
    neq: jest.Mock<FilterQueryMock, [string, unknown]>;
    setResponse: (result: SelectResult) => void;
    then: jest.Mock<ReturnType<FilterQueryMock["then"]>, Parameters<FilterQueryMock["then"]>>;
  } & PromiseLike<SelectResult>;

  const createFilterQuery = (initial = { error: null, count: 0 }): FilterQueryMock => {
    const state = { result: initial };
    const q: Partial<FilterQueryMock> = {};

    const thenImpl: FilterQueryMock["then"] = (onFulfilled, onRejected) =>
      Promise.resolve(state.result).then(onFulfilled, onRejected);

    q.eq = jest.fn(() => q as FilterQueryMock);
    q.neq = jest.fn(() => q as FilterQueryMock);
    q.then = jest.fn(thenImpl);
    q.setResponse = (res: SelectResult) => {
      state.result = res;
    };

    return q as FilterQueryMock;
  };

  const filterQuery = createFilterQuery();
  const select = jest.fn(() => filterQuery);
  const from = jest.fn(() => ({ select }));

  return {
    createClientComponentClient: jest.fn(() => ({ from })),
    __test: { filterQuery, select, from },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isEmailUnique } = require("./emailValidator");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __test } = require("@supabase/auth-helpers-nextjs");
const { filterQuery, select, from } = __test;

describe("isEmailUnique", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    filterQuery.setResponse({ error: null, count: 0 });
  });

  it("returns true when no matching email exists", async () => {
    filterQuery.setResponse({ error: null, count: 0 });

    await expect(isEmailUnique("Test@Example.com")).resolves.toBe(true);

    expect(from).toHaveBeenCalledWith("students");
    expect(select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(filterQuery.eq).toHaveBeenCalledWith("email", "test@example.com");
    expect(filterQuery.neq).not.toHaveBeenCalled();
  });

  it("returns false when email already exists", async () => {
    filterQuery.setResponse({ error: null, count: 1 });

    await expect(isEmailUnique("test@example.com")).resolves.toBe(false);
  });

  it("excludes provided student id from uniqueness check", async () => {
    filterQuery.setResponse({ error: null, count: 0 });

    await isEmailUnique("test@example.com", {
      excludeStudentId: "123",
    });

    expect(filterQuery.neq).toHaveBeenCalledWith("id", "123");
  });

  it("throws when supabase returns an error", async () => {
    filterQuery.setResponse({ error: { message: "boom" }, count: null });

    await expect(isEmailUnique("test@example.com")).rejects.toThrow(
      "Failed to verify email uniqueness: boom",
    );
  });
});
