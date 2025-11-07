import {
  jsonbCompatibilityRegistry,
  type CompatibilityRule,
  type CompatibilityResult,
} from "@/lib/jsonb/compatibility";
import "@/lib/jsonb/schemaRegistry";
import { VALID_TABLE_COLUMN_COMBINATIONS } from "@/lib/constants/tableColumns";

export interface TransformationPreview {
  original: Record<string, unknown>;
  transformed: Record<string, unknown>;
  appliedRules: string[];
}

export class TransformationService {
  private seededDefaults: Map<string, CompatibilityRule[]> = new Map();

  constructor() {
    for (const [table, columns] of Object.entries(VALID_TABLE_COLUMN_COMBINATIONS)) {
      for (const column of columns) {
        const key = `${table}.${column}`;
        const currentRules = this.getAvailableMappings(table, column);
        if (currentRules.length > 0) {
          this.seededDefaults.set(key, this.cloneRules(currentRules));
        }
      }
    }
  }

  private cloneRules(rules: CompatibilityRule[]): CompatibilityRule[] {
    return rules.map((rule) => ({
      ...rule,
      rename: rule.rename ? { ...rule.rename } : undefined,
      valueMap: rule.valueMap
        ? Object.fromEntries(Object.entries(rule.valueMap).map(([k, v]) => [k, { ...v }]))
        : undefined,
      defaults: rule.defaults ? { ...rule.defaults } : undefined,
      drop: rule.drop ? [...rule.drop] : undefined,
      transform: rule.transform,
    }));
  }

  registerFieldMapping(
    table: string,
    column: string,
    mappings: CompatibilityRule | CompatibilityRule[],
  ): void {
    jsonbCompatibilityRegistry.register(table, column, mappings);
  }

  transformImportData(
    table: string,
    column: string,
    data: Record<string, unknown>[],
  ): CompatibilityResult<Record<string, unknown>>[] {
    if (!Array.isArray(data)) {
      throw new Error("Data must be an array of objects");
    }

    return data.map((item) => {
      return jsonbCompatibilityRegistry.apply(table, column, item);
    });
  }

  getAvailableMappings(table: string, column: string): CompatibilityRule[] {
    const key = `${table}.${column}` as const;
    const registry = jsonbCompatibilityRegistry as {
      rules: Map<string, CompatibilityRule[]>;
    };
    return registry.rules.get(key) || [];
  }

  previewTransformation(
    table: string,
    column: string,
    data: Record<string, unknown>,
    rules?: CompatibilityRule[],
  ): TransformationPreview {
    const original = JSON.parse(JSON.stringify(data));

    let result: CompatibilityResult<Record<string, unknown>>;

    if (rules && rules.length > 0) {
      const tempRegistry =
        new (jsonbCompatibilityRegistry.constructor as new () => typeof jsonbCompatibilityRegistry)();
      tempRegistry.register(table, column, rules);
      result = tempRegistry.apply(table, column, data);
    } else {
      result = jsonbCompatibilityRegistry.apply(table, column, data);
    }

    return {
      original,
      transformed: result.data,
      appliedRules: result.appliedRules,
    };
  }

  clearMappings(): void {
    jsonbCompatibilityRegistry.clear();
  }

  resetMappingsFor(table: string, column: string): void {
    const key = `${table}.${column}`;
    const registry = jsonbCompatibilityRegistry as {
      rules: Map<string, CompatibilityRule[]>;
    };

    const seededDefaults = this.seededDefaults.get(key);
    if (seededDefaults && seededDefaults.length > 0) {
      registry.rules.set(key, this.cloneRules(seededDefaults));
    } else {
      registry.rules.delete(key);
    }
  }
}

export const transformationService = new TransformationService();
