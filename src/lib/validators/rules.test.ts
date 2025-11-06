import { describe, expect, it } from "@jest/globals";
import { BATCH_CODE_PATTERNS, ENUM_DEFAULTS, ENUM_VALUES, VALIDATION_RULES } from "./rules";

describe("validation rules constants", () => {
  it("validates phone and guardian phone patterns", () => {
    expect(VALIDATION_RULES.phone.pattern.test("9876543210")).toBe(true);
    expect(VALIDATION_RULES.phone.pattern.test("1234567890")).toBe(false);

    expect(VALIDATION_RULES.guardianPhone.pattern.test("9876543211")).toBe(true);
    expect(VALIDATION_RULES.guardianPhone.pattern.test("1111111111")).toBe(false);
  });

  it("matches batch code examples for each certification", () => {
    expect(BATCH_CODE_PATTERNS["US CMA"].pattern.test("CMA_PART1_Batch_3_E")).toBe(true);
    expect(BATCH_CODE_PATTERNS["US CMA"].pattern.test("INVALID")).toBe(false);

    expect(BATCH_CODE_PATTERNS.ACCA.pattern.test("ACCA_2024_Batch_5")).toBe(true);
    expect(BATCH_CODE_PATTERNS.ACCA.pattern.test("ACCA2024Batch5")).toBe(false);

    expect(BATCH_CODE_PATTERNS.CFA.pattern.test("CFA_L1_Batch_3")).toBe(true);
    expect(BATCH_CODE_PATTERNS.CFA.pattern.test("CFA_BATCH_3")).toBe(false);

    expect(BATCH_CODE_PATTERNS["US CPA"].pattern.test("CPA_AUD_Batch_2")).toBe(true);
    expect(BATCH_CODE_PATTERNS["US CPA"].pattern.test("CPA_AUD2")).toBe(false);
  });

  it("provides defaults that belong to the enum value sets", () => {
    expect(ENUM_VALUES.gender).toContain(ENUM_DEFAULTS.gender);
    expect(ENUM_VALUES.salutation).toContain(ENUM_DEFAULTS.salutation);
    expect(ENUM_VALUES.educationLevel).toContain(ENUM_DEFAULTS.educationLevel);
    expect(ENUM_VALUES.stream).toContain(ENUM_DEFAULTS.stream);
    expect(ENUM_VALUES.certificationType).toContain(ENUM_DEFAULTS.certificationType);
  });
});
