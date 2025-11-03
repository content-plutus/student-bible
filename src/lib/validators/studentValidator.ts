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

export const panNumberSchema = z
  .string()
  .transform((val) => val.trim().toUpperCase())
  .pipe(
    z
      .string()
      .length(10, "PAN number must be exactly 10 characters")
      .regex(
        /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        "PAN number must follow format: 5 letters, 4 digits, 1 letter",
      ),
  )
  .optional()
  .nullable();

export const postalCodeSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .length(6, "PIN code must be exactly 6 digits")
      .regex(/^[0-9]{6}$/, "PIN code must contain only digits"),
  );

export const emailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(z.string().email("Please enter a valid email address"));

export const validatePanNumber = (pan: string | null | undefined): boolean => {
  return panNumberSchema.safeParse(pan).success;
};

export const validatePostalCode = (postalCode: string): boolean => {
  return postalCodeSchema.safeParse(postalCode).success;
};

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const parsePanNumber = (pan: string | null | undefined) => {
  return panNumberSchema.parse(pan);
};

export const safeParsePanNumber = (pan: string | null | undefined) => {
  return panNumberSchema.safeParse(pan);
};

export const parsePostalCode = (postalCode: string) => {
  return postalCodeSchema.parse(postalCode);
};

export const safeParsePostalCode = (postalCode: string) => {
  return postalCodeSchema.safeParse(postalCode);
};

export const parseEmail = (email: string) => {
  return emailSchema.parse(email);
};

export const safeParseEmail = (email: string) => {
  return emailSchema.safeParse(email);
};

export const getPanValidationError = (pan: string | null | undefined): string | null => {
  const result = panNumberSchema.safeParse(pan);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid PAN number";
};

export const getPostalCodeValidationError = (postalCode: string): string | null => {
  const result = postalCodeSchema.safeParse(postalCode);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid PIN code";
};

export const getEmailValidationError = (email: string): string | null => {
  const result = emailSchema.safeParse(email);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid email address";
};

export const validateCrossFieldGuardianPhone = (
  studentPhone: string,
  guardianPhone: string | null | undefined,
): string | null => {
  if (!guardianPhone) return null;
  if (studentPhone === guardianPhone) {
    return "Guardian phone number must be different from student phone number";
  }
  return null;
};

export const validateMinimumAge = (
  dateOfBirth: string | Date,
  minAge: number = 16,
): string | null => {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;

  if (actualAge < minAge) {
    return `Student must be at least ${minAge} years old`;
  }
  return null;
};

export const validateDateOfBirthRange = (dateOfBirth: string | Date): string | null => {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const year = dob.getFullYear();

  if (year < 1950 || year > 2010) {
    return "Date of birth must be between 1950 and 2010";
  }
  return null;
};

export const batchCodeSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().min(1, "Batch code cannot be empty"))
  .optional()
  .nullable();

export const validateBatchCode = (
  batchCode: string | null | undefined,
  certificationType: string | null | undefined,
): boolean => {
  if (!batchCode || !certificationType) {
    return true;
  }

  const trimmedBatchCode = batchCode.trim();
  if (trimmedBatchCode.length === 0) {
    return false;
  }

  if (certificationType === "US CMA") {
    return /^CMA_P\d+_Sec[A-Z]_Batch_\d+_[WE]_[E]$/.test(trimmedBatchCode);
  } else if (certificationType === "ACCA") {
    return /^ACCA_\d{4}_Batch_\d+$/.test(trimmedBatchCode);
  } else if (certificationType === "CFA") {
    return /^CFA_L\d+_Batch_\d+$/.test(trimmedBatchCode);
  } else if (certificationType === "US CPA") {
    return /^CPA_[A-Z]{3}_Batch_\d+$/.test(trimmedBatchCode);
  }

  return true;
};

export const parseBatchCode = (batchCode: string | null | undefined) => {
  return batchCodeSchema.parse(batchCode);
};

export const safeParseBatchCode = (batchCode: string | null | undefined) => {
  return batchCodeSchema.safeParse(batchCode);
};

export const getBatchCodeValidationError = (
  batchCode: string | null | undefined,
  certificationType: string | null | undefined,
): string | null => {
  if (!batchCode || !certificationType) {
    return null;
  }

  const trimmedBatchCode = batchCode.trim();
  if (trimmedBatchCode.length === 0) {
    return "Batch code cannot be empty";
  }

  if (certificationType === "US CMA") {
    if (!/^CMA_P\d+_Sec[A-Z]_Batch_\d+_[WE]_[E]$/.test(trimmedBatchCode)) {
      return "US CMA batch code must follow format: CMA_P{paper}_Sec{section}_Batch_{number}_{W|E}_{E} (e.g., CMA_P1_SecA_Batch_7_W_E)";
    }
  } else if (certificationType === "ACCA") {
    if (!/^ACCA_\d{4}_Batch_\d+$/.test(trimmedBatchCode)) {
      return "ACCA batch code must follow format: ACCA_{year}_Batch_{number} (e.g., ACCA_2024_Batch_5)";
    }
  } else if (certificationType === "CFA") {
    if (!/^CFA_L\d+_Batch_\d+$/.test(trimmedBatchCode)) {
      return "CFA batch code must follow format: CFA_L{level}_Batch_{number} (e.g., CFA_L1_Batch_3)";
    }
  } else if (certificationType === "US CPA") {
    if (!/^CPA_[A-Z]{3}_Batch_\d+$/.test(trimmedBatchCode)) {
      return "US CPA batch code must follow format: CPA_{section}_Batch_{number} (e.g., CPA_AUD_Batch_2)";
    }
  }

  return null;
};

export const validateCrossFieldBatchCode = (
  batchCode: string | null | undefined,
  certificationType: string | null | undefined,
): string | null => {
  return getBatchCodeValidationError(batchCode, certificationType);
};

export const validateBatchCodeFromExtraFields = (
  extraFields: Record<string, unknown>,
  certificationType: string | null | undefined,
): string | null => {
  const batchCode = extraFields.batch_code;

  if (batchCode === null || batchCode === undefined) {
    return null;
  }

  if (typeof batchCode !== "string") {
    return "Batch code must be a string";
  }

  return getBatchCodeValidationError(batchCode, certificationType);
};
