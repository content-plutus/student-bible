import { z } from "zod";
import { VALIDATION_RULES } from "./rules";

export const phoneNumberSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .length(
        VALIDATION_RULES.phone.minLength,
        `Phone number must be exactly ${VALIDATION_RULES.phone.minLength} digits`,
      )
      .regex(VALIDATION_RULES.phone.pattern, VALIDATION_RULES.phone.message),
  );

const guardianPhoneBase = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .length(
        VALIDATION_RULES.guardianPhone.minLength,
        `Guardian phone number must be exactly ${VALIDATION_RULES.guardianPhone.minLength} digits`,
      )
      .regex(VALIDATION_RULES.guardianPhone.pattern, VALIDATION_RULES.guardianPhone.message),
  );

export const guardianPhoneSchema = guardianPhoneBase.nullable();

export const guardianPhoneInputSchema = guardianPhoneSchema.optional();

export const validatePhoneNumber = (phone: string): boolean => {
  return phoneNumberSchema.safeParse(phone).success;
};

export const validateGuardianPhone = (phone: string | null | undefined): boolean => {
  return guardianPhoneInputSchema.safeParse(phone).success;
};

export const parsePhoneNumber = (phone: string) => {
  return phoneNumberSchema.parse(phone);
};

export const safeParsePhoneNumber = (phone: string) => {
  return phoneNumberSchema.safeParse(phone);
};

export const parseGuardianPhone = (phone: string | null | undefined) => {
  return guardianPhoneInputSchema.parse(phone);
};

export const safeParseGuardianPhone = (phone: string | null | undefined) => {
  return guardianPhoneInputSchema.safeParse(phone);
};

export const getPhoneValidationError = (phone: string): string | null => {
  const result = phoneNumberSchema.safeParse(phone);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid phone number";
};

export const getGuardianPhoneValidationError = (
  phone: string | null | undefined,
): string | null => {
  const result = guardianPhoneInputSchema.safeParse(phone);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid guardian phone number";
};

export const emailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(
        VALIDATION_RULES.email.minLength,
        `Email must be at least ${VALIDATION_RULES.email.minLength} characters`,
      )
      .max(
        VALIDATION_RULES.email.maxLength,
        `Email must be at most ${VALIDATION_RULES.email.maxLength} characters`,
      )
      .regex(VALIDATION_RULES.email.pattern, VALIDATION_RULES.email.message)
      .email("Email must be a valid email address"),
  );

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const parseEmail = (email: string) => {
  return emailSchema.parse(email);
};

export const safeParseEmail = (email: string) => {
  return emailSchema.safeParse(email);
};

export const getEmailValidationError = (email: string): string | null => {
  const result = emailSchema.safeParse(email);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid email address";
};

export const checkEmailUniqueness = async (
  email: string,
  excludeStudentId?: string,
): Promise<{ isUnique: boolean; error?: string }> => {
  try {
    const response = await fetch("/api/validate-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, excludeStudentId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        isUnique: false,
        error: data.error || "Unable to verify email uniqueness",
      };
    }

    return {
      isUnique: data.isUnique,
      error: data.isUnique ? undefined : "Email address is already in use",
    };
  } catch (err) {
    return {
      isUnique: false,
      error: `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
};

export const validateEmailWithUniqueness = async (
  email: string,
  excludeStudentId?: string,
): Promise<{ isValid: boolean; error?: string }> => {
  const formatResult = safeParseEmail(email);
  if (!formatResult.success) {
    return {
      isValid: false,
      error: formatResult.error.issues[0]?.message || "Invalid email format",
    };
  }

  const uniquenessResult = await checkEmailUniqueness(email, excludeStudentId);
  if (!uniquenessResult.isUnique) {
    return {
      isValid: false,
      error: uniquenessResult.error || "Email address is already in use",
    };
  }

  return { isValid: true };
};
