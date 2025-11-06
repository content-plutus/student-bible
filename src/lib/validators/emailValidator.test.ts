import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@supabase/auth-helpers-nextjs", () => {
  const createFilterQuery = (initial = { error: null, count: 0 }) => {
    let state = { result: initial };
    const q = {} as any;
    q.eq = jest.fn(() => q);
    q.neq = jest.fn(() => q);
    q.then = jest.fn((onFulfilled, onRejected) =>
      Promise.resolve(state.result).then(onFulfilled, onRejected),
    );
    q.setResponse = (res: any) => {
      state.result = res;
    };
    return q;
  };

  const filterQuery = createFilterQuery();
  const select = jest.fn(() => filterQuery);
  const from = jest.fn(() => ({ select }));

  return {
    createClientComponentClient: jest.fn(() => ({ from })),
    __test: { filterQuery, select, from },
  };
});

const { isEmailUnique } = require("./emailValidator");
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
