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

export const BATCH_CODE_PATTERNS = {
  "US CMA": {
    pattern:
      /^CMA_(?:P\d+|PART\d+|[A-Z0-9]{1,10})_(?:(?:Sec[A-Z]_)?Batch|Group)_[0-9]{1,2}_[A-Z](?:_[A-Z])?$/,
    message:
      "US CMA batch code must follow format: CMA_{identifier}_{Batch|SecX_Batch|Group}_{number}_{suffix}",
    example: "CMA_PART1_Batch_3_E or CMA_P1_SecA_Batch_7_W_E",
  },
  ACCA: {
    pattern: /^ACCA_\d{4}_Batch_\d+$/,
    message: "ACCA batch code must follow format: ACCA_{year}_Batch_{number}",
    example: "ACCA_2024_Batch_5",
  },
  CFA: {
    pattern: /^CFA_L\d+_Batch_\d+$/,
    message: "CFA batch code must follow format: CFA_L{level}_Batch_{number}",
    example: "CFA_L1_Batch_3",
  },
  "US CPA": {
    pattern: /^CPA_[A-Z]{3}_Batch_\d+$/,
    message: "US CPA batch code must follow format: CPA_{section}_Batch_{number}",
    example: "CPA_AUD_Batch_2",
  },
} as const;

export type CertificationType = keyof typeof BATCH_CODE_PATTERNS;

export type ValidationRules = typeof VALIDATION_RULES;
export type EnumValues = typeof ENUM_VALUES;
export type EnumDefaults = typeof ENUM_DEFAULTS;
