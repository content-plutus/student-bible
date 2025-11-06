import { afterEach, describe, expect, it } from "@jest/globals";
import {
  applyCompatibilityRules,
  registerCompatibilityRule,
  jsonbCompatibilityRegistry,
} from "@/lib/jsonb/compatibility";

afterEach(() => {
  jsonbCompatibilityRegistry.clear();
});

describe("jsonb compatibility registry", () => {
  it("tracks nested mutations performed inside transform callbacks", () => {
    registerCompatibilityRule("test_table", "meta", {
      description: "normalize nested meta flag",
      transform: (payload) => {
        if (!payload.meta || typeof payload.meta !== "object") {
          payload.meta = { flag: true };
          return;
        }
        (payload.meta as Record<string, unknown>).flag = true;
      },
    });

    const originalPayload = { meta: { flag: false } };

    const result = applyCompatibilityRules("test_table", "meta", originalPayload);

    expect(result.data.meta).toEqual({ flag: true });
    expect(result.appliedRules).toContain("normalize nested meta flag");

    // Ensure original object is not mutated
    expect(originalPayload.meta).toEqual({ flag: false });
  });
});
