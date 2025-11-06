import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_FIELD_THRESHOLDS,
  DEFAULT_MATCHING_CRITERIA,
  MATCHING_PRESETS,
  createCustomMatchingCriteria,
  disableCrossFieldRule,
  disableFieldRule,
  enableFieldRule,
  getEnabledCrossFieldRules,
  getEnabledFieldRules,
  updateFieldRule,
  validateMatchingCriteria,
} from "./matchingRules";

describe("matchingRules helpers", () => {
  it("creates custom criteria while preserving defaults", () => {
    const criteria = createCustomMatchingCriteria({
      overallThreshold: 0.8,
      maxResults: 20,
    });

    expect(criteria.overallThreshold).toBe(0.8);
    expect(criteria.maxResults).toBe(20);
    expect(criteria.fieldRules).toHaveLength(Object.keys(DEFAULT_FIELD_THRESHOLDS).length);
  });

  it("updates and toggles field rules without mutating defaults", () => {
    const updated = updateFieldRule(DEFAULT_MATCHING_CRITERIA, "phone_number", {
      threshold: 0.5,
      weight: 1,
    });

    const originalRule = DEFAULT_MATCHING_CRITERIA.fieldRules.find(
      (rule) => rule.field === "phone_number",
    );
    const updatedRule = updated.fieldRules.find((rule) => rule.field === "phone_number");

    expect(originalRule?.threshold).toBe(1);
    expect(updatedRule?.threshold).toBe(0.5);
    expect(updatedRule?.weight).toBe(1);

    const disabled = disableFieldRule(updated, "phone_number");
    expect(getEnabledFieldRules(disabled).some((rule) => rule.field === "phone_number")).toBe(
      false,
    );

    const reEnabled = enableFieldRule(disabled, "phone_number");
    expect(getEnabledFieldRules(reEnabled).some((rule) => rule.field === "phone_number")).toBe(
      true,
    );
  });

  it("enables and disables cross-field rules", () => {
    const disabled = disableCrossFieldRule(DEFAULT_MATCHING_CRITERIA, "same_name_and_dob");
    const enabledCrossRules = getEnabledCrossFieldRules(disabled);

    expect(enabledCrossRules.some((rule) => rule.name === "same_name_and_dob")).toBe(false);
  });

  it("validates matching criteria and reports errors", () => {
    const invalidCriteria = {
      fieldRules: [
        {
          field: "email",
          threshold: 1.5,
          weight: -1,
          enabled: true,
          matchType: "exact",
        },
      ],
      crossFieldRules: [
        {
          name: "invalid",
          fields: ["email"],
          requiredMatches: 0,
          weight: -2,
          enabled: true,
          description: "invalid rule",
        },
      ],
      overallThreshold: 2,
      maxResults: 0,
    };

    const result = validateMatchingCriteria(invalidCriteria);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Overall threshold must be between 0 and 1",
        "Max results must be at least 1",
        "Field email threshold must be between 0 and 1",
        "Field email weight must be non-negative",
        "Cross-field rule invalid requiredMatches must be between 1 and 1",
        "Cross-field rule invalid weight must be non-negative",
      ]),
    );
  });

  it("exposes preset criteria with expected properties", () => {
    const strict = MATCHING_PRESETS.strict.criteria;

    expect(strict.overallThreshold).toBe(0.9);
    strict.fieldRules.forEach((rule) => {
      expect(rule.threshold).toBeGreaterThanOrEqual(0.95);
    });
  });
});
