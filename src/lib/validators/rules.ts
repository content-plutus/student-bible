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
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Email must be a valid email address",
    minLength: 5,
    maxLength: 255,
  },
} as const;

export type ValidationRules = typeof VALIDATION_RULES;
