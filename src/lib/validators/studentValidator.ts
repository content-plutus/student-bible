import { z } from "zod";
import { isValidAadhaar } from "aadhaar-validator-ts";
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

export const guardianPhoneSchema = z
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
  )
  .optional()
  .nullable();

export const aadharNumberSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .length(
        VALIDATION_RULES.aadhar.minLength,
        `AADHAR number must be exactly ${VALIDATION_RULES.aadhar.minLength} digits`,
      )
      .regex(VALIDATION_RULES.aadhar.pattern, VALIDATION_RULES.aadhar.message)
      .refine((val) => isValidAadhaar(val), "Invalid AADHAR number: checksum verification failed"),
  )
  .optional()
  .nullable();

export const validatePhoneNumber = (phone: string): boolean => {
  return phoneNumberSchema.safeParse(phone).success;
};

export const validateGuardianPhone = (phone: string | null | undefined): boolean => {
  return guardianPhoneSchema.safeParse(phone).success;
};

export const parsePhoneNumber = (phone: string) => {
  return phoneNumberSchema.parse(phone);
};

export const safeParsePhoneNumber = (phone: string) => {
  return phoneNumberSchema.safeParse(phone);
};

export const parseGuardianPhone = (phone: string | null | undefined) => {
  return guardianPhoneSchema.parse(phone);
};

export const safeParseGuardianPhone = (phone: string | null | undefined) => {
  return guardianPhoneSchema.safeParse(phone);
};

export const getPhoneValidationError = (phone: string): string | null => {
  const result = phoneNumberSchema.safeParse(phone);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid phone number";
};

export const getGuardianPhoneValidationError = (
  phone: string | null | undefined,
): string | null => {
  const result = guardianPhoneSchema.safeParse(phone);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid guardian phone number";
};

export const validateAadharNumber = (aadhar: string | null | undefined): boolean => {
  return aadharNumberSchema.safeParse(aadhar).success;
};

export const parseAadharNumber = (aadhar: string | null | undefined) => {
  return aadharNumberSchema.parse(aadhar);
};

export const safeParseAadharNumber = (aadhar: string | null | undefined) => {
  return aadharNumberSchema.safeParse(aadhar);
};

export const getAadharValidationError = (aadhar: string | null | undefined): string | null => {
  const result = aadharNumberSchema.safeParse(aadhar);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid AADHAR number";
};
