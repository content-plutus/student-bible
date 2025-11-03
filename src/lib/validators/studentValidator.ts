import { z } from "zod";
import { isValidAadhaar } from "aadhaar-validator-ts";
import {
  VALIDATION_RULES,
  ENUM_VALUES,
  ENUM_DEFAULTS,
  BATCH_CODE_PATTERNS,
  CertificationType,
} from "./rules";
import {
  genderSchema,
  salutationSchema,
  educationLevelSchema,
  streamSchema,
  certificationTypeSchema,
} from "../types/validations";

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

export const validateGender = (gender: string | null | undefined): boolean => {
  return genderSchema.safeParse(gender).success;
};

export const parseGender = (gender: string | null | undefined) => {
  return genderSchema.parse(gender);
};

export const safeParseGender = (gender: string | null | undefined) => {
  return genderSchema.safeParse(gender);
};

export const getGenderValidationError = (gender: string | null | undefined): string | null => {
  const result = genderSchema.safeParse(gender);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid gender";
};

export const validateSalutation = (salutation: string | null | undefined): boolean => {
  return salutationSchema.safeParse(salutation).success;
};

export const parseSalutation = (salutation: string | null | undefined) => {
  return salutationSchema.parse(salutation);
};

export const safeParseSalutation = (salutation: string | null | undefined) => {
  return salutationSchema.safeParse(salutation);
};

export const getSalutationValidationError = (
  salutation: string | null | undefined,
): string | null => {
  const result = salutationSchema.safeParse(salutation);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid salutation";
};

export const validateEducationLevel = (educationLevel: string | null | undefined): boolean => {
  return educationLevelSchema.safeParse(educationLevel).success;
};

export const parseEducationLevel = (educationLevel: string | null | undefined) => {
  return educationLevelSchema.parse(educationLevel);
};

export const safeParseEducationLevel = (educationLevel: string | null | undefined) => {
  return educationLevelSchema.safeParse(educationLevel);
};

export const getEducationLevelValidationError = (
  educationLevel: string | null | undefined,
): string | null => {
  const result = educationLevelSchema.safeParse(educationLevel);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid education level";
};

export const validateStream = (stream: string | null | undefined): boolean => {
  return streamSchema.safeParse(stream).success;
};

export const parseStream = (stream: string | null | undefined) => {
  return streamSchema.parse(stream);
};

export const safeParseStream = (stream: string | null | undefined) => {
  return streamSchema.safeParse(stream);
};

export const getStreamValidationError = (stream: string | null | undefined): string | null => {
  const result = streamSchema.safeParse(stream);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid stream";
};

export const validateCertificationType = (
  certificationType: string | null | undefined,
): boolean => {
  return certificationTypeSchema.safeParse(certificationType).success;
};

export const parseCertificationType = (certificationType: string | null | undefined) => {
  return certificationTypeSchema.parse(certificationType);
};

export const safeParseCertificationType = (certificationType: string | null | undefined) => {
  return certificationTypeSchema.safeParse(certificationType);
};

export const getCertificationTypeValidationError = (
  certificationType: string | null | undefined,
): string | null => {
  const result = certificationTypeSchema.safeParse(certificationType);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Invalid certification type";
};

export const isKnownEnumValue = (
  value: string,
  enumType: keyof typeof ENUM_VALUES,
): boolean => {
  return ENUM_VALUES[enumType].includes(value as never);
};

export const getEnumDefault = (enumType: keyof typeof ENUM_DEFAULTS): string => {
  return ENUM_DEFAULTS[enumType];
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
  if (batchCode == null || certificationType == null) {
    return true;
  }

  const trimmedBatchCode = batchCode.trim();
  if (trimmedBatchCode.length === 0) {
    return false;
  }

  const pattern = BATCH_CODE_PATTERNS[certificationType as CertificationType];
  if (!pattern) {
    return true;
  }

  return pattern.pattern.test(trimmedBatchCode);
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
  if (batchCode == null || certificationType == null) {
    return null;
  }

  const trimmedBatchCode = batchCode.trim();
  if (trimmedBatchCode.length === 0) {
    return "Batch code cannot be empty";
  }

  const pattern = BATCH_CODE_PATTERNS[certificationType as CertificationType];
  if (!pattern) {
    return null;
  }

  if (!pattern.pattern.test(trimmedBatchCode)) {
    return `${pattern.message} (e.g., ${pattern.example})`;
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
