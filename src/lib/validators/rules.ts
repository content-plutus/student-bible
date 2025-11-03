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

export type ValidationRules = typeof VALIDATION_RULES;
