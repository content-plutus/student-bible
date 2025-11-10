type JsonbKey = `${string}.${string}`;

export interface CompatibilityRule {
  description?: string;
  rename?: Record<string, string>;
  valueMap?: Record<string, Record<string, unknown>>;
  defaults?: Record<string, unknown>;
  drop?: string[];
  transform?: (payload: Record<string, unknown>) => void;
}

export interface CompatibilityResult<T = Record<string, unknown>> {
  data: T;
  appliedRules: string[];
}

class JsonbCompatibilityRegistry {
  private rules = new Map<JsonbKey, CompatibilityRule[]>();

  public register(table: string, column: string, rule: CompatibilityRule | CompatibilityRule[]) {
    const key = this.getKey(table, column);
    const existing = this.rules.get(key) ?? [];
    const normalized = Array.isArray(rule) ? rule : [rule];
    this.rules.set(key, [...existing, ...normalized]);
  }

  public apply<T extends Record<string, unknown>>(
    table: string,
    column: string,
    payload: T,
  ): CompatibilityResult<T> {
    if (!payload || typeof payload !== "object") {
      return {
        data: payload,
        appliedRules: [],
      };
    }

    const key = this.getKey(table, column);
    const rules = this.rules.get(key);

    if (!rules || rules.length === 0) {
      return {
        data: payload,
        appliedRules: [],
      };
    }

    const appliedRules: string[] = [];
    const workingPayload = this.clonePayload(payload) as Record<string, unknown>;

    for (const rule of rules) {
      let changed = false;

      if (rule.rename) {
        for (const [legacyKey, currentKey] of Object.entries(rule.rename)) {
          if (legacyKey in workingPayload) {
            if (!(currentKey in workingPayload)) {
              workingPayload[currentKey] = workingPayload[legacyKey];
            }
            delete workingPayload[legacyKey];
            changed = true;
          }
        }
      }

      if (rule.valueMap) {
        for (const [field, mapping] of Object.entries(rule.valueMap)) {
          const legacyValue = workingPayload[field];
          if (legacyValue !== undefined && legacyValue !== null) {
            const mappedValue = mapping[legacyValue as keyof typeof mapping];
            if (mappedValue !== undefined) {
              workingPayload[field] = mappedValue;
              changed = true;
            }
          }
        }
      }

      if (rule.defaults) {
        for (const [field, value] of Object.entries(rule.defaults)) {
          if (workingPayload[field] === undefined) {
            workingPayload[field] = value;
            changed = true;
          }
        }
      }

      if (rule.drop) {
        for (const field of rule.drop) {
          if (field in workingPayload) {
            delete workingPayload[field];
            changed = true;
          }
        }
      }

      if (rule.transform) {
        const snapshot = this.clonePayload(workingPayload);
        rule.transform(workingPayload);
        if (this.detectDifference(snapshot, workingPayload)) {
          changed = true;
        }
      }

      if (changed) {
        appliedRules.push(rule.description ?? "compatibility_rule_applied");
      }
    }

    return {
      data: workingPayload as T,
      appliedRules,
    };
  }

  private detectDifference(before: Record<string, unknown>, after: Record<string, unknown>) {
    return !this.deepEqual(before, after);
  }

  private getKey(table: string, column: string): JsonbKey {
    return `${table}.${column}`;
  }

  private clonePayload<T>(payload: T): T {
    const globalWithClone = globalThis as {
      structuredClone?: <U>(value: U) => U;
    };

    if (typeof globalWithClone.structuredClone === "function") {
      try {
        return globalWithClone.structuredClone(payload);
      } catch {
        // fall through to JSON clone
      }
    }

    return JSON.parse(JSON.stringify(payload));
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
      return true;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (a === null || b === null) {
      return a === b;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; i += 1) {
        if (!this.deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }

    if (typeof a === "object" && typeof b === "object") {
      const aKeys = Object.keys(a as Record<string, unknown>);
      const bKeys = Object.keys(b as Record<string, unknown>);

      if (aKeys.length !== bKeys.length) {
        return false;
      }

      for (const key of aKeys) {
        if (
          !this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
        ) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  public clear(): void {
    this.rules.clear();
  }

  public getRules(table: string, column: string): CompatibilityRule[] {
    const key = this.getKey(table, column);
    return this.rules.get(key) ?? [];
  }

  public setRules(table: string, column: string, rules: CompatibilityRule[]): void {
    const key = this.getKey(table, column);
    this.rules.set(key, rules);
  }

  public deleteRules(table: string, column: string): void {
    const key = this.getKey(table, column);
    this.rules.delete(key);
  }
}

export const jsonbCompatibilityRegistry = new JsonbCompatibilityRegistry();

export const registerCompatibilityRule = (
  table: string,
  column: string,
  rule: CompatibilityRule | CompatibilityRule[],
) => {
  jsonbCompatibilityRegistry.register(table, column, rule);
};

export const applyCompatibilityRules = <T extends Record<string, unknown>>(
  table: string,
  column: string,
  payload: T,
) => jsonbCompatibilityRegistry.apply(table, column, payload);
