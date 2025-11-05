export type MatchableField =
  | "phone_number"
  | "email"
  | "aadhar_number"
  | "first_name"
  | "last_name"
  | "full_name"
  | "date_of_birth"
  | "guardian_phone"
  | "pan_number";

export interface FieldMatchingRule {
  field: MatchableField;
  threshold: number;
  weight: number;
  enabled: boolean;
  matchType: "exact" | "fuzzy" | "normalized";
}

export interface CrossFieldRule {
  name: string;
  fields: MatchableField[];
  requiredMatches: number;
  weight: number;
  enabled: boolean;
  description: string;
}

export interface MatchingCriteria {
  fieldRules: FieldMatchingRule[];
  crossFieldRules: CrossFieldRule[];
  overallThreshold: number;
  maxResults: number;
}

export const DEFAULT_FIELD_THRESHOLDS: Record<MatchableField, number> = {
  phone_number: 1.0,
  email: 1.0,
  aadhar_number: 1.0,
  first_name: 0.85,
  last_name: 0.85,
  full_name: 0.85,
  date_of_birth: 1.0,
  guardian_phone: 1.0,
  pan_number: 1.0,
};

export const DEFAULT_FIELD_WEIGHTS: Record<MatchableField, number> = {
  phone_number: 3.0,
  email: 3.0,
  aadhar_number: 3.0,
  first_name: 1.5,
  last_name: 1.5,
  full_name: 2.0,
  date_of_birth: 2.0,
  guardian_phone: 1.0,
  pan_number: 2.5,
};

export const DEFAULT_FIELD_MATCH_TYPES: Record<MatchableField, "exact" | "fuzzy" | "normalized"> = {
  phone_number: "normalized",
  email: "normalized",
  aadhar_number: "normalized",
  first_name: "fuzzy",
  last_name: "fuzzy",
  full_name: "fuzzy",
  date_of_birth: "exact",
  guardian_phone: "normalized",
  pan_number: "normalized",
};

export const DEFAULT_CROSS_FIELD_RULES: CrossFieldRule[] = [
  {
    name: "same_name_and_dob",
    fields: ["full_name", "date_of_birth"],
    requiredMatches: 2,
    weight: 5.0,
    enabled: true,
    description: "Same full name and date of birth indicates likely duplicate",
  },
  {
    name: "same_name_and_phone",
    fields: ["full_name", "phone_number"],
    requiredMatches: 2,
    weight: 4.5,
    enabled: true,
    description: "Same full name and phone number indicates likely duplicate",
  },
  {
    name: "same_name_and_email",
    fields: ["full_name", "email"],
    requiredMatches: 2,
    weight: 4.5,
    enabled: true,
    description: "Same full name and email indicates likely duplicate",
  },
  {
    name: "same_first_last_dob",
    fields: ["first_name", "last_name", "date_of_birth"],
    requiredMatches: 3,
    weight: 5.0,
    enabled: true,
    description: "Same first name, last name, and DOB indicates likely duplicate",
  },
  {
    name: "same_phone_and_email",
    fields: ["phone_number", "email"],
    requiredMatches: 2,
    weight: 6.0,
    enabled: true,
    description: "Same phone and email indicates very likely duplicate",
  },
  {
    name: "same_aadhar_and_name",
    fields: ["aadhar_number", "full_name"],
    requiredMatches: 2,
    weight: 6.0,
    enabled: true,
    description: "Same AADHAR and name indicates very likely duplicate",
  },
];

export const DEFAULT_MATCHING_CRITERIA: MatchingCriteria = {
  fieldRules: Object.entries(DEFAULT_FIELD_THRESHOLDS).map(([field, threshold]) => ({
    field: field as MatchableField,
    threshold,
    weight: DEFAULT_FIELD_WEIGHTS[field as MatchableField],
    enabled: true,
    matchType: DEFAULT_FIELD_MATCH_TYPES[field as MatchableField],
  })),
  crossFieldRules: DEFAULT_CROSS_FIELD_RULES,
  overallThreshold: 0.7,
  maxResults: 10,
};

export function createCustomMatchingCriteria(
  overrides: Partial<MatchingCriteria> = {},
): MatchingCriteria {
  return {
    ...DEFAULT_MATCHING_CRITERIA,
    ...overrides,
    fieldRules: overrides.fieldRules ?? DEFAULT_MATCHING_CRITERIA.fieldRules,
    crossFieldRules: overrides.crossFieldRules ?? DEFAULT_MATCHING_CRITERIA.crossFieldRules,
  };
}

export function updateFieldRule(
  criteria: MatchingCriteria,
  field: MatchableField,
  updates: Partial<FieldMatchingRule>,
): MatchingCriteria {
  return {
    ...criteria,
    fieldRules: criteria.fieldRules.map((rule) =>
      rule.field === field ? { ...rule, ...updates } : rule,
    ),
  };
}

export function updateCrossFieldRule(
  criteria: MatchingCriteria,
  ruleName: string,
  updates: Partial<CrossFieldRule>,
): MatchingCriteria {
  return {
    ...criteria,
    crossFieldRules: criteria.crossFieldRules.map((rule) =>
      rule.name === ruleName ? { ...rule, ...updates } : rule,
    ),
  };
}

export function disableFieldRule(
  criteria: MatchingCriteria,
  field: MatchableField,
): MatchingCriteria {
  return updateFieldRule(criteria, field, { enabled: false });
}

export function enableFieldRule(
  criteria: MatchingCriteria,
  field: MatchableField,
): MatchingCriteria {
  return updateFieldRule(criteria, field, { enabled: true });
}

export function disableCrossFieldRule(
  criteria: MatchingCriteria,
  ruleName: string,
): MatchingCriteria {
  return updateCrossFieldRule(criteria, ruleName, { enabled: false });
}

export function enableCrossFieldRule(
  criteria: MatchingCriteria,
  ruleName: string,
): MatchingCriteria {
  return updateCrossFieldRule(criteria, ruleName, { enabled: true });
}

export function getEnabledFieldRules(criteria: MatchingCriteria): FieldMatchingRule[] {
  return criteria.fieldRules.filter((rule) => rule.enabled);
}

export function getEnabledCrossFieldRules(criteria: MatchingCriteria): CrossFieldRule[] {
  return criteria.crossFieldRules.filter((rule) => rule.enabled);
}

export function validateMatchingCriteria(criteria: MatchingCriteria): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (criteria.overallThreshold < 0 || criteria.overallThreshold > 1) {
    errors.push("Overall threshold must be between 0 and 1");
  }

  if (criteria.maxResults < 1) {
    errors.push("Max results must be at least 1");
  }

  for (const rule of criteria.fieldRules) {
    if (rule.threshold < 0 || rule.threshold > 1) {
      errors.push(`Field ${rule.field} threshold must be between 0 and 1`);
    }
    if (rule.weight < 0) {
      errors.push(`Field ${rule.field} weight must be non-negative`);
    }
  }

  for (const rule of criteria.crossFieldRules) {
    if (rule.requiredMatches < 1 || rule.requiredMatches > rule.fields.length) {
      errors.push(
        `Cross-field rule ${rule.name} requiredMatches must be between 1 and ${rule.fields.length}`,
      );
    }
    if (rule.weight < 0) {
      errors.push(`Cross-field rule ${rule.name} weight must be non-negative`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface MatchingRulesPreset {
  name: string;
  description: string;
  criteria: MatchingCriteria;
}

export const MATCHING_PRESETS: Record<string, MatchingRulesPreset> = {
  strict: {
    name: "Strict Matching",
    description: "Only matches on exact or near-exact field matches",
    criteria: createCustomMatchingCriteria({
      overallThreshold: 0.9,
      fieldRules: Object.entries(DEFAULT_FIELD_THRESHOLDS).map(([field, threshold]) => ({
        field: field as MatchableField,
        threshold: Math.max(0.95, threshold),
        weight: DEFAULT_FIELD_WEIGHTS[field as MatchableField],
        enabled: true,
        matchType: DEFAULT_FIELD_MATCH_TYPES[field as MatchableField],
      })),
    }),
  },
  moderate: {
    name: "Moderate Matching",
    description: "Balanced approach with reasonable fuzzy matching",
    criteria: DEFAULT_MATCHING_CRITERIA,
  },
  lenient: {
    name: "Lenient Matching",
    description: "More permissive matching to catch potential duplicates with variations",
    criteria: createCustomMatchingCriteria({
      overallThreshold: 0.6,
      fieldRules: Object.entries(DEFAULT_FIELD_THRESHOLDS).map(([field, threshold]) => ({
        field: field as MatchableField,
        threshold: field === "phone_number" || field === "email" || field === "aadhar_number" 
          ? threshold 
          : Math.max(0.7, threshold - 0.15),
        weight: DEFAULT_FIELD_WEIGHTS[field as MatchableField],
        enabled: true,
        matchType: DEFAULT_FIELD_MATCH_TYPES[field as MatchableField],
      })),
    }),
  },
  contact_only: {
    name: "Contact Information Only",
    description: "Only matches on phone, email, and AADHAR",
    criteria: createCustomMatchingCriteria({
      overallThreshold: 0.8,
      fieldRules: Object.entries(DEFAULT_FIELD_THRESHOLDS).map(([field, threshold]) => ({
        field: field as MatchableField,
        threshold,
        weight: DEFAULT_FIELD_WEIGHTS[field as MatchableField],
        enabled: ["phone_number", "email", "aadhar_number", "guardian_phone", "pan_number"].includes(field),
        matchType: DEFAULT_FIELD_MATCH_TYPES[field as MatchableField],
      })),
    }),
  },
  name_and_dob: {
    name: "Name and Date of Birth",
    description: "Focuses on name and DOB matching",
    criteria: createCustomMatchingCriteria({
      overallThreshold: 0.75,
      fieldRules: Object.entries(DEFAULT_FIELD_THRESHOLDS).map(([field, threshold]) => ({
        field: field as MatchableField,
        threshold,
        weight: DEFAULT_FIELD_WEIGHTS[field as MatchableField],
        enabled: ["first_name", "last_name", "full_name", "date_of_birth"].includes(field),
        matchType: DEFAULT_FIELD_MATCH_TYPES[field as MatchableField],
      })),
    }),
  },
};

export function getPreset(presetName: string): MatchingRulesPreset | undefined {
  return MATCHING_PRESETS[presetName];
}

export function listPresets(): MatchingRulesPreset[] {
  return Object.values(MATCHING_PRESETS);
}
