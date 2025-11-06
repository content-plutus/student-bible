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
    const workingPayload = { ...payload };

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
        const snapshot = { ...workingPayload };
        rule.transform(workingPayload);
        changed = changed || this.detectDifference(snapshot, workingPayload);
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
    const beforeKeys = Object.keys(before);
    const afterKeys = Object.keys(after);

    if (beforeKeys.length !== afterKeys.length) {
      return true;
    }

    return beforeKeys.some((key) => before[key] !== after[key]);
  }

  private getKey(table: string, column: string): JsonbKey {
    return `${table}.${column}`;
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
