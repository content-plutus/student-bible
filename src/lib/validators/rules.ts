export const VALIDATION_RULES = {
  phone: {
    pattern: /^[6-9]\d{9}$/,
    message: "Phone number must be 10 digits starting with 6-9",
    minLength: 10,
    maxLength: 10,
  },
  guardianPhone: {
    pattern: /^[6-9]\d{9}$/,
    message: "Guardian phone number must be 10 digits starting with 6-9",
    minLength: 10,
    maxLength: 10,
  },
  aadhar: {
    pattern: /^[0-9]{12}$/,
    message: "AADHAR number must be exactly 12 digits",
    minLength: 12,
    maxLength: 12,
  },
} as const;

export const ENUM_VALUES = {
  gender: ["Male", "Female", "Others"] as const,
  salutation: ["Mr", "Ms", "Mrs"] as const,
  educationLevel: ["10th", "12th", "Graduate", "Master", "Other"] as const,
  stream: ["Commerce", "Arts", "Science", "Other"] as const,
  certificationType: ["ACCA", "US CMA", "CFA", "US CPA"] as const,
} as const;

export const ENUM_DEFAULTS = {
  gender: "Others" as const,
  salutation: "Mr" as const,
  educationLevel: "Other" as const,
  stream: "Other" as const,
  certificationType: "ACCA" as const,
} as const;

export type ValidationRules = typeof VALIDATION_RULES;
export type EnumValues = typeof ENUM_VALUES;
export type EnumDefaults = typeof ENUM_DEFAULTS;
