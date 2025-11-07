import {
  JsonbQueryBuilder,
  createJsonbQueryBuilder,
  jsonbContains,
  jsonbKeyExists,
} from "./jsonbQueryBuilder";
import type { PostgrestQueryBuilder } from "@supabase/supabase-js";

// Test-only type alias to avoid explicit any
type MockDatabase = {
  public: {
    Tables: {
      students: {
        Row: Record<string, unknown>;
        Relationships: Record<string, never>;
      };
    };
  };
};

type MockQueryBuilder = PostgrestQueryBuilder<
  MockDatabase["public"],
  "students",
  MockDatabase["public"]["Tables"]["students"]["Row"]
>;

// Mock Supabase query builder
const createMockQueryBuilder = () => {
  const defaultResult = { data: [], error: null };

  // Create a thenable object that resolves to defaultResult
  const mockFilterMethods = Object.assign(Promise.resolve(defaultResult), {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    contained: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
  });

  const mockFrom = jest.fn().mockReturnValue(mockFilterMethods);

  return {
    from: mockFrom,
    mockFilterMethods,
    defaultResult,
  };
};

describe("JsonbQueryBuilder", () => {
  let mockQuery: ReturnType<typeof createMockQueryBuilder>;
  let queryBuilder: MockQueryBuilder;

  beforeEach(() => {
    mockQuery = createMockQueryBuilder();
    queryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a query builder with default options", () => {
      new JsonbQueryBuilder(queryBuilder);
      expect(mockQuery.mockFilterMethods.select).toHaveBeenCalledWith("*");
    });

    it("should create a query builder with custom column name", () => {
      const builder = new JsonbQueryBuilder(queryBuilder, { column: "custom_fields" });
      expect(builder).toBeDefined();
    });

    it("should create a query builder with path operators disabled", () => {
      const builder = new JsonbQueryBuilder(queryBuilder, { usePathOperators: false });
      expect(builder).toBeDefined();
    });
  });

  describe("where", () => {
    it("should add an equality condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("batch_code", "eq", "ACCA_2024_Batch_5");

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledWith(
        "extra_fields->>'batch_code'",
        "ACCA_2024_Batch_5",
      );
    });

    it("should add a not-equals condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("certification_type", "neq", "ACCA");

      expect(mockQuery.mockFilterMethods.neq).toHaveBeenCalledWith(
        "extra_fields->>'certification_type'",
        "ACCA",
      );
    });

    it("should add a greater-than condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("score", "gt", 80);

      expect(mockQuery.mockFilterMethods.gt).toHaveBeenCalledWith("extra_fields->>'score'", 80);
    });

    it("should add a less-than condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("age", "lt", 30);

      expect(mockQuery.mockFilterMethods.lt).toHaveBeenCalledWith("extra_fields->>'age'", 30);
    });

    it("should add a boolean equality condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("mentor_assigned", "eq", true);

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledWith(
        "extra_fields->>'mentor_assigned'",
        true,
      );
    });
  });

  describe("nested paths", () => {
    it("should handle nested field paths", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("address.city", "eq", "Mumbai");

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledWith(
        "extra_fields->'address'->>'city'",
        "Mumbai",
      );
    });

    it("should handle deeply nested paths", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("metadata.user.preferences.theme", "eq", "dark");

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledWith(
        "extra_fields->'metadata'->'user'->'preferences'->>'theme'",
        "dark",
      );
    });

    it("should not use path operators when disabled", () => {
      const builder = new JsonbQueryBuilder(queryBuilder, { usePathOperators: false });
      builder.where("address.city", "eq", "Mumbai");

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledWith(
        "extra_fields->>'address.city'",
        "Mumbai",
      );
    });
  });

  describe("contains", () => {
    it("should add a contains condition with object", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("", "contains", { batch_code: "ACCA_2024_Batch_5" });

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        batch_code: "ACCA_2024_Batch_5",
      });
    });

    it("should add a contains condition with single key-value", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("batch_code", "contains", "ACCA_2024_Batch_5");

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        batch_code: "ACCA_2024_Batch_5",
      });
    });

    it("should handle nested paths in contains by building nested objects", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("address.city", "contains", "Mumbai");

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        address: { city: "Mumbai" },
      });
    });

    it("should handle deeply nested paths in contains", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("metadata.user.preferences.theme", "contains", "dark");

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        metadata: { user: { preferences: { theme: "dark" } } },
      });
    });
  });

  describe("exists", () => {
    it("should check if a key exists", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("mentor_assigned", "exists");

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        mentor_assigned: null,
      });
    });

    it("should handle nested paths in exists by building nested objects", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("address.city", "exists");

      expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
        address: { city: null },
      });
    });
  });

  describe("not_exists", () => {
    it("should check if a key does not exist", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("mentor_assigned", "not_exists");

      expect(mockQuery.mockFilterMethods.is).toHaveBeenCalledWith(
        "extra_fields->>'mentor_assigned'",
        null,
      );
    });
  });

  describe("like and ilike", () => {
    it("should add a like condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("batch_code", "like", "ACCA");

      expect(mockQuery.mockFilterMethods.like).toHaveBeenCalledWith(
        "extra_fields->>'batch_code'",
        "%ACCA%",
      );
    });

    it("should add an ilike condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("batch_code", "ilike", "acca");

      expect(mockQuery.mockFilterMethods.ilike).toHaveBeenCalledWith(
        "extra_fields->>'batch_code'",
        "%acca%",
      );
    });
  });

  describe("in and not_in", () => {
    it("should add an in condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("lead_source", "in", ["event", "referral", "organic"]);

      expect(mockQuery.mockFilterMethods.in).toHaveBeenCalledWith("extra_fields->>'lead_source'", [
        "event",
        "referral",
        "organic",
      ]);
    });

    it("should add a not_in condition", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.where("lead_source", "not_in", ["event", "referral"]);

      expect(mockQuery.mockFilterMethods.not).toHaveBeenCalledWith(
        "extra_fields->>'lead_source'",
        "in",
        "(event,referral)",
      );
    });
  });

  describe("whereAll", () => {
    it("should add multiple conditions with AND logic", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.whereAll([
        { path: "certification_type", operator: "eq", value: "ACCA" },
        { path: "mentor_assigned", operator: "eq", value: true },
      ]);

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledTimes(2);
      expect(mockQuery.mockFilterMethods.eq).toHaveBeenNthCalledWith(
        1,
        "extra_fields->>'certification_type'",
        "ACCA",
      );
      expect(mockQuery.mockFilterMethods.eq).toHaveBeenNthCalledWith(
        2,
        "extra_fields->>'mentor_assigned'",
        true,
      );
    });
  });

  describe("whereGroup", () => {
    it("should handle AND groups", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.whereGroup("AND", [
        { path: "certification_type", operator: "eq", value: "ACCA" },
        { path: "mentor_assigned", operator: "eq", value: true },
      ]);

      expect(mockQuery.mockFilterMethods.eq).toHaveBeenCalledTimes(2);
    });

    it("should handle OR groups", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.whereGroup("OR", [
        { path: "lead_source", operator: "eq", value: "event" },
        { path: "lead_source", operator: "eq", value: "referral" },
      ]);

      expect(mockQuery.mockFilterMethods.or).toHaveBeenCalled();
    });

    it("should preserve nested AND groups inside OR queries", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.whereGroup("OR", [
        { path: "lead_source", operator: "eq", value: "event" },
        {
          operator: "AND",
          conditions: [
            { path: "certification_type", operator: "eq", value: "ACCA" },
            { path: "mentor_assigned", operator: "eq", value: true },
          ],
        },
      ]);

      // Should call or() with a filter string that includes the AND group wrapped in and(...)
      expect(mockQuery.mockFilterMethods.or).toHaveBeenCalled();
      const orCall = mockQuery.mockFilterMethods.or.mock.calls[0][0];
      expect(orCall).toContain("lead_source");
      expect(orCall).toContain("certification_type");
      expect(orCall).toContain("mentor_assigned");
      // The AND conditions should be wrapped in and(...) syntax
      expect(orCall).toMatch(/and\(.*certification_type.*mentor_assigned.*\)/);
    });

    it("should handle deeply nested groups", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      builder.whereGroup("OR", [
        {
          operator: "AND",
          conditions: [
            { path: "a", operator: "eq", value: "1" },
            {
              operator: "OR",
              conditions: [
                { path: "b", operator: "eq", value: "2" },
                { path: "c", operator: "eq", value: "3" },
              ],
            },
          ],
        },
      ]);

      expect(mockQuery.mockFilterMethods.or).toHaveBeenCalled();
    });
  });

  describe("getQuery", () => {
    it("should return the underlying query builder", () => {
      const builder = new JsonbQueryBuilder(queryBuilder);
      const query = builder.getQuery();

      expect(query).toBe(mockQuery.mockFilterMethods);
    });
  });

  describe("execute", () => {
    it("should execute the query", async () => {
      const mockData = [{ id: "1", name: "Test" }];
      const mockResult = { data: mockData, error: null };

      // Create a new promise that resolves to our mock result
      const mockPromise = Promise.resolve(mockResult);
      // Create a new thenable object with the mocked result
      const thenableMock = Object.assign(mockPromise, {
        select: mockQuery.mockFilterMethods.select,
        eq: mockQuery.mockFilterMethods.eq,
        neq: mockQuery.mockFilterMethods.neq,
        gt: mockQuery.mockFilterMethods.gt,
        gte: mockQuery.mockFilterMethods.gte,
        lt: mockQuery.mockFilterMethods.lt,
        lte: mockQuery.mockFilterMethods.lte,
        contains: mockQuery.mockFilterMethods.contains,
        contained: mockQuery.mockFilterMethods.contained,
        is: mockQuery.mockFilterMethods.is,
        like: mockQuery.mockFilterMethods.like,
        ilike: mockQuery.mockFilterMethods.ilike,
        in: mockQuery.mockFilterMethods.in,
        not: mockQuery.mockFilterMethods.not,
        or: mockQuery.mockFilterMethods.or,
        filter: mockQuery.mockFilterMethods.filter,
      });

      // Replace the query builder's return value
      mockQuery.from.mockReturnValue(thenableMock);
      const testQueryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;

      const builder = new JsonbQueryBuilder(testQueryBuilder);
      const result = await builder.execute();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });
  });
});

describe("createJsonbQueryBuilder", () => {
  it("should create a JsonbQueryBuilder instance", () => {
    const mockQuery = createMockQueryBuilder();
    const queryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;
    const builder = createJsonbQueryBuilder(queryBuilder);

    expect(builder).toBeInstanceOf(JsonbQueryBuilder);
  });

  it("should create a JsonbQueryBuilder with options", () => {
    const mockQuery = createMockQueryBuilder();
    const queryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;
    const builder = createJsonbQueryBuilder(queryBuilder, { column: "custom_fields" });

    expect(builder).toBeInstanceOf(JsonbQueryBuilder);
  });
});

describe("jsonbContains", () => {
  it("should add a contains filter", () => {
    const mockQuery = createMockQueryBuilder();
    const queryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;
    const fields = { batch_code: "ACCA_2024_Batch_5" };

    jsonbContains(queryBuilder, "extra_fields", fields);

    expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", fields);
  });
});

describe("jsonbKeyExists", () => {
  it("should check if a key exists", () => {
    const mockQuery = createMockQueryBuilder();
    const queryBuilder = mockQuery.from("students") as unknown as MockQueryBuilder;

    jsonbKeyExists(queryBuilder, "extra_fields", "batch_code");

    expect(mockQuery.mockFilterMethods.contains).toHaveBeenCalledWith("extra_fields", {
      batch_code: null,
    });
  });
});
