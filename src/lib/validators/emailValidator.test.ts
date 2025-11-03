import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { isEmailUnique, type StudentsFilterBuilder, type SupabaseLike } from "./emailValidator";

type SelectArgs = Parameters<StudentsFilterBuilder["select"]>;
type SelectReturn = ReturnType<StudentsFilterBuilder["select"]>;

type MockBuilder = StudentsFilterBuilder & {
  eq: jest.Mock<StudentsFilterBuilder, Parameters<StudentsFilterBuilder["eq"]>>;
  neq: jest.Mock<StudentsFilterBuilder, Parameters<StudentsFilterBuilder["neq"]>>;
  select: jest.Mock<Promise<Awaited<SelectReturn>>, SelectArgs>;
};

const createQueryBuilder = (): MockBuilder => {
  const builder = {
    eq: jest.fn(),
    neq: jest.fn(),
    select: jest.fn(),
  } as unknown as MockBuilder;

  builder.eq.mockImplementation(() => builder);
  builder.neq.mockImplementation(() => builder);
  builder.select.mockResolvedValue({ error: null, count: 0 });

  return builder;
};

const createSupabaseMock = (
  builder: MockBuilder,
): SupabaseLike & {
  from: jest.Mock<StudentsFilterBuilder, [string]>;
} => ({
  from: jest.fn().mockReturnValue(builder),
});

describe("isEmailUnique", () => {
  let builder: MockBuilder;
  let supabase: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    builder = createQueryBuilder();
    supabase = createSupabaseMock(builder);
  });

  it("returns true when no matching email exists", async () => {
    builder.select.mockResolvedValueOnce({ error: null, count: 0 });

    await expect(isEmailUnique(supabase, "Test@Example.com")).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith("students");
    expect(builder.eq).toHaveBeenCalledWith("email", "test@example.com");
    expect(builder.neq).not.toHaveBeenCalled();
  });

  it("returns false when email already exists", async () => {
    builder.select.mockResolvedValueOnce({ error: null, count: 1 });

    await expect(isEmailUnique(supabase, "test@example.com")).resolves.toBe(false);
  });

  it("excludes provided student id from uniqueness check", async () => {
    builder.select.mockResolvedValueOnce({ error: null, count: 0 });

    await isEmailUnique(supabase, "test@example.com", {
      excludeStudentId: "123",
    });

    expect(builder.neq).toHaveBeenCalledWith("id", "123");
  });

  it("throws when supabase returns an error", async () => {
    builder.select.mockResolvedValueOnce({
      error: { message: "boom" },
      count: null,
    });

    await expect(isEmailUnique(supabase, "test@example.com")).rejects.toThrow(
      "Failed to verify email uniqueness: boom",
    );
  });
});
