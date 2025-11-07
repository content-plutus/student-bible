import type { PostgrestFilterBuilder, PostgrestQueryBuilder } from "@supabase/supabase-js";

/**
 * JSONB query operators supported by the query builder
 */
export type JsonbOperator =
  | "eq" // equals
  | "neq" // not equals
  | "gt" // greater than
  | "gte" // greater than or equal
  | "lt" // less than
  | "lte" // less than or equal
  | "contains" // JSONB contains (uses @>)
  | "contained" // JSONB is contained by (<@)
  | "exists" // key exists (?)
  | "not_exists" // key does not exist
  | "like" // text pattern match (->> 'key' LIKE pattern)
  | "ilike" // case-insensitive pattern match
  | "in" // value is in array
  | "not_in"; // value is not in array

/**
 * JSONB value type for queries
 */
export type JsonbValue =
  | string
  | number
  | boolean
  | null
  | JsonbValue[]
  | Record<string, JsonbValue>;

/**
 * Single JSONB condition specification
 */
export interface JsonbCondition {
  /**
   * Path to the JSONB field (e.g., "batch_code" or "nested.field")
   * For root-level fields, use the field name directly
   * For nested fields, use dot notation (e.g., "address.city")
   */
  path: string;
  /**
   * Operator to use for comparison
   */
  operator: JsonbOperator;
  /**
   * Value to compare against
   * For 'exists' and 'not_exists' operators, this is ignored
   */
  value?: JsonbValue;
  /**
   * Whether to use case-insensitive comparison (for text operators)
   * Default: false
   */
  caseInsensitive?: boolean;
}

/**
 * Group of conditions with a logical operator
 */
export interface JsonbConditionGroup {
  /**
   * Conditions in this group
   */
  conditions: (JsonbCondition | JsonbConditionGroup)[];
  /**
   * Logical operator to combine conditions
   */
  operator: "AND" | "OR";
}

/**
 * Complete JSONB query specification
 */
export type JsonbQuery = JsonbCondition | JsonbConditionGroup;

/**
 * Options for building JSONB queries
 */
export interface JsonbQueryOptions {
  /**
   * Name of the JSONB column to query
   * Default: "extra_fields"
   */
  column?: string;
  /**
   * Whether to use PostgreSQL JSONB path operators for nested fields
   * Default: true
   */
  usePathOperators?: boolean;
}

/**
 * JSONB Query Builder for dynamic field searches
 *
 * Provides a fluent API for building complex JSONB queries that integrate
 * seamlessly with Supabase PostgREST queries.
 *
 * @example
 * ```typescript
 * const supabase = createServiceRoleClient();
 * const queryBuilder = new JsonbQueryBuilder(supabase.from("students"));
 *
 * // Simple equality check
 * queryBuilder.where("batch_code", "eq", "ACCA_2024_Batch_5");
 * const { data, error } = await queryBuilder.execute();
 *
 * // Multiple conditions with AND
 * queryBuilder
 *   .where("certification_type", "eq", "ACCA")
 *   .where("mentor_assigned", "eq", true);
 *
 * // Nested field access
 * queryBuilder.where("address.city", "eq", "Mumbai");
 *
 * // Complex conditions with groups
 * queryBuilder.whereGroup("OR", [
 *   { path: "lead_source", operator: "eq", value: "event" },
 *   { path: "lead_source", operator: "eq", value: "referral" }
 * ]);
 * ```
 */
export class JsonbQueryBuilder<T> {
  private query: PostgrestFilterBuilder<unknown, unknown, T>;
  private column: string;
  private usePathOperators: boolean;

  /**
   * Creates a new JSONB query builder
   *
   * @param queryBuilder - Supabase PostgREST query builder instance
   * @param options - Query builder options
   */
  constructor(
    queryBuilder: PostgrestQueryBuilder<unknown, unknown, T>,
    options: JsonbQueryOptions = {},
  ) {
    this.query = queryBuilder.select("*");
    this.column = options.column || "extra_fields";
    this.usePathOperators = options.usePathOperators ?? true;
  }

  /**
   * Adds a single condition to the query
   *
   * @param path - JSONB field path
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns This builder instance for method chaining
   */
  where(path: string, operator: JsonbOperator, value?: JsonbValue): this {
    this.applyCondition({ path, operator, value });
    return this;
  }

  /**
   * Adds multiple conditions with AND logic
   *
   * @param conditions - Array of conditions to apply
   * @returns This builder instance for method chaining
   */
  whereAll(conditions: JsonbCondition[]): this {
    for (const condition of conditions) {
      this.applyCondition(condition);
    }
    return this;
  }

  /**
   * Adds a group of conditions with specified logical operator
   *
   * @param operator - Logical operator (AND or OR)
   * @param conditions - Array of conditions or condition groups
   * @returns This builder instance for method chaining
   */
  whereGroup(operator: "AND" | "OR", conditions: (JsonbCondition | JsonbConditionGroup)[]): this {
    if (operator === "AND") {
      // For AND, we can chain conditions directly
      for (const condition of conditions) {
        if ("conditions" in condition) {
          // Nested group - recursively apply
          this.whereGroup(condition.operator, condition.conditions);
        } else {
          this.applyCondition(condition);
        }
      }
    } else {
      // For OR, collect conditions and apply them together
      const orFilters: string[] = [];
      for (const condition of conditions) {
        if ("conditions" in condition) {
          // Nested group - build filter string for the entire group
          if (condition.operator === "OR") {
            // Nested OR group - build OR filter string
            const nestedOrs: string[] = [];
            for (const nestedCondition of condition.conditions) {
              if ("conditions" in nestedCondition) {
                // Recursively build nested group filter string
                const nestedGroupStr = this.buildGroupFilterString(nestedCondition);
                if (nestedGroupStr) {
                  nestedOrs.push(nestedGroupStr);
                }
              } else {
                const filterStr = this.buildFilterString(nestedCondition);
                if (filterStr) {
                  nestedOrs.push(filterStr);
                }
              }
            }
            if (nestedOrs.length > 0) {
              orFilters.push(`(${nestedOrs.join(",")})`);
            }
          } else {
            // AND group inside OR: build a composite filter so it stays inside the OR branch
            // Use buildGroupFilterString which wraps AND groups in and(...) syntax
            const andFilterStr = this.buildGroupFilterString(condition);
            if (andFilterStr) {
              orFilters.push(andFilterStr);
            }
          }
        } else {
          const filterStr = this.buildFilterString(condition);
          if (filterStr) {
            orFilters.push(filterStr);
          }
        }
      }
      if (orFilters.length > 0) {
        this.query = this.query.or(orFilters.join(","));
      }
    }
    return this;
  }

  /**
   * Applies a JSONB condition to the query using Supabase PostgREST API
   */
  private applyCondition(condition: JsonbCondition): void {
    const { path, operator, value } = condition;
    const columnPath = this.buildColumnPath(path);

    switch (operator) {
      case "eq":
        this.query = this.query.eq(columnPath, value as string | number | boolean);
        break;
      case "neq":
        this.query = this.query.neq(columnPath, value as string | number | boolean);
        break;
      case "gt":
        this.query = this.query.gt(columnPath, value as string | number);
        break;
      case "gte":
        this.query = this.query.gte(columnPath, value as string | number);
        break;
      case "lt":
        this.query = this.query.lt(columnPath, value as string | number);
        break;
      case "lte":
        this.query = this.query.lte(columnPath, value as string | number);
        break;
      case "contains":
        // Use Supabase's contains method for JSONB containment
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          this.query = this.query.contains(this.column, value as Record<string, JsonbValue>);
        } else {
          // Single key-value containment
          // If path contains dots, build nested object structure
          if (path.includes(".")) {
            const nestedObject = this.buildNestedObject(path, value);
            this.query = this.query.contains(this.column, nestedObject);
          } else {
            this.query = this.query.contains(this.column, { [path]: value });
          }
        }
        break;
      case "contained":
        // Use Supabase's contained method
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          this.query = this.query.contained(this.column, value as Record<string, JsonbValue>);
        }
        break;
      case "exists":
        // Check if key exists using contains with null value
        // If path contains dots, build nested object structure
        if (path.includes(".")) {
          const nestedObject = this.buildNestedObject(path, null);
          this.query = this.query.contains(this.column, nestedObject);
        } else {
          this.query = this.query.contains(this.column, { [path]: null });
        }
        break;
      case "not_exists":
        // Negate key existence - check that the key doesn't exist
        // We use a filter that checks the key is null or doesn't exist
        // Note: This is a limitation - Supabase doesn't directly support ? operator negation
        // We'll use a workaround by checking if the field is null
        this.query = this.query.is(columnPath, null);
        break;
      case "like":
        this.query = this.query.like(columnPath, `%${value}%`);
        break;
      case "ilike":
        this.query = this.query.ilike(columnPath, `%${value}%`);
        break;
      case "in":
        if (Array.isArray(value)) {
          this.query = this.query.in(columnPath, value.map(String));
        }
        break;
      case "not_in":
        if (Array.isArray(value)) {
          // Use not.in filter
          const values = value.map(String);
          this.query = this.query.not(columnPath, "in", `(${values.join(",")})`);
        }
        break;
    }
  }

  /**
   * Builds a filter string for a condition group (AND or OR)
   * Used when nesting groups inside OR queries
   */
  private buildGroupFilterString(group: JsonbConditionGroup): string | null {
    const filterStrings: string[] = [];

    for (const condition of group.conditions) {
      if ("conditions" in condition) {
        // Recursively build nested group filter string
        const nestedGroupStr = this.buildGroupFilterString(condition);
        if (nestedGroupStr) {
          filterStrings.push(nestedGroupStr);
        }
      } else {
        const filterStr = this.buildFilterString(condition);
        if (filterStr) {
          filterStrings.push(filterStr);
        }
      }
    }

    if (filterStrings.length === 0) {
      return null;
    }

    if (group.operator === "AND") {
      // For AND groups inside OR, use explicit and(...) syntax
      // PostgREST treats commas inside or= as OR operators, so we need and(...) to preserve AND semantics
      return `and(${filterStrings.join(",")})`;
    } else {
      // For OR groups, wrap in parentheses
      return `(${filterStrings.join(",")})`;
    }
  }

  /**
   * Builds a filter string for OR conditions
   */
  private buildFilterString(condition: JsonbCondition): string | null {
    const { path, operator, value } = condition;
    const columnPath = this.buildColumnPath(path);

    switch (operator) {
      case "eq":
        return `${columnPath}.eq.${this.serializeValue(value)}`;
      case "neq":
        return `${columnPath}.neq.${this.serializeValue(value)}`;
      case "gt":
        return `${columnPath}.gt.${this.serializeValue(value)}`;
      case "gte":
        return `${columnPath}.gte.${this.serializeValue(value)}`;
      case "lt":
        return `${columnPath}.lt.${this.serializeValue(value)}`;
      case "lte":
        return `${columnPath}.lte.${this.serializeValue(value)}`;
      case "like":
        return `${columnPath}.like.%${value}%`;
      case "ilike":
        return `${columnPath}.ilike.%${value}%`;
      case "in":
        if (Array.isArray(value)) {
          return `${columnPath}.in.(${value.map(String).join(",")})`;
        }
        return null;
      case "contains":
        return `${this.column}.cs.${JSON.stringify(value)}`;
      default:
        return null;
    }
  }

  /**
   * Builds a nested object from a dot-separated path
   * Example: "address.city" -> { address: { city: value } }
   */
  private buildNestedObject(path: string, value: JsonbValue): Record<string, JsonbValue> {
    const parts = path.split(".");
    const result: Record<string, JsonbValue> = {};
    let current = result;

    // Build nested structure up to the second-to-last part
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]] as Record<string, JsonbValue>;
    }

    // Set the final value
    current[parts[parts.length - 1]] = value;

    return result;
  }

  /**
   * Builds the column path for JSONB field access
   * Supports nested paths using dot notation
   */
  private buildColumnPath(path: string): string {
    if (!this.usePathOperators || !path.includes(".")) {
      // Simple path: extra_fields->>'batch_code'
      return `${this.column}->>'${path}'`;
    }

    // Nested path: extra_fields->'nested'->>'field'
    const parts = path.split(".");
    let columnPath = this.column;
    for (let i = 0; i < parts.length - 1; i++) {
      columnPath += `->'${parts[i]}'`;
    }
    columnPath += `->>'${parts[parts.length - 1]}'`;
    return columnPath;
  }

  /**
   * Serializes a value for use in Supabase queries
   */
  private serializeValue(value?: JsonbValue): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "boolean" || typeof value === "number") {
      return String(value);
    }

    if (Array.isArray(value)) {
      return `(${value.map((v) => this.serializeValue(v)).join(",")})`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Gets the underlying Supabase query builder
   * Use this to add additional non-JSONB filters or execute the query
   */
  getQuery(): PostgrestFilterBuilder<unknown, unknown, T> {
    return this.query;
  }

  /**
   * Executes the query and returns results
   */
  async execute(): Promise<{ data: T[] | null; error: unknown }> {
    return await this.query;
  }
}

/**
 * Helper function to create a JSONB query builder
 *
 * @param queryBuilder - Supabase PostgREST query builder
 * @param options - Query builder options
 * @returns New JsonbQueryBuilder instance
 */
export function createJsonbQueryBuilder<T>(
  queryBuilder: PostgrestQueryBuilder<unknown, unknown, T>,
  options?: JsonbQueryOptions,
): JsonbQueryBuilder<T> {
  return new JsonbQueryBuilder(queryBuilder, options);
}

/**
 * Helper function to build a JSONB containment query
 * This is a common pattern for checking if JSONB contains specific key-value pairs
 *
 * @param queryBuilder - Supabase PostgREST query builder
 * @param column - JSONB column name
 * @param fields - Object with key-value pairs to check for containment
 * @returns Modified query builder
 */
export function jsonbContains<T>(
  queryBuilder: PostgrestQueryBuilder<unknown, unknown, T>,
  column: string,
  fields: Record<string, JsonbValue>,
): PostgrestFilterBuilder<unknown, unknown, T> {
  return queryBuilder.contains(column, fields);
}

/**
 * Helper function to check if a JSONB field exists
 *
 * @param queryBuilder - Supabase PostgREST query builder
 * @param column - JSONB column name
 * @param key - Key to check for existence
 * @returns Modified query builder
 */
export function jsonbKeyExists<T>(
  queryBuilder: PostgrestQueryBuilder<unknown, unknown, T>,
  column: string,
  key: string,
): PostgrestFilterBuilder<unknown, unknown, T> {
  // Use the ? operator via contains with a minimal object
  return queryBuilder.contains(column, { [key]: null });
}
