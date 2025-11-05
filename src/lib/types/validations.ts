import { z } from "zod";
import { isValidAadhaar } from "aadhaar-validator-ts";

import { ENUM_VALUES, ENUM_DEFAULTS } from "../validators/rules";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const GENDERS = ENUM_VALUES.gender;
export const SALUTATIONS = ENUM_VALUES.salutation;
export const STREAMS = ENUM_VALUES.stream;
export const EDUCATION_LEVELS = ENUM_VALUES.educationLevel;
export const CERTIFICATION_TYPES = ENUM_VALUES.certificationType;

export const validatePhoneNumber = (phone: string): boolean => {
  return /^[6-9][0-9]{9}$/.test(phone);
};

export const validateAadharNumber = (aadhar: string): boolean => {
  return /^[0-9]{12}$/.test(aadhar) && isValidAadhaar(aadhar);
};

export const validatePanNumber = (pan: string): boolean => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
};

export const validatePostalCode = (postalCode: string): boolean => {
  return /^[0-9]{6}$/.test(postalCode);
};

export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const validateDateRange = (
  date: string | Date,
  minYear: number = 1950,
  maxYear: number = new Date().getFullYear() + 5,
): boolean => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const year = dateObj.getFullYear();
  return year >= minYear && year <= maxYear;
};

export const validateAge = (dateOfBirth: string | Date, minAge: number = 16): boolean => {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= minAge;
  }

  return age >= minAge;
};

export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, "").slice(-10);
};

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const normalizeName = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const normalizeAadharNumber = (aadhar: string): string => {
  return aadhar.replace(/\D/g, "");
};

export const normalizePanNumber = (pan: string): string => {
  return pan.toUpperCase().replace(/\s/g, "");
};

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .length(10, "Phone number must be exactly 10 digits")
  .regex(/^[6-9]\d{9}$/, "Phone number must start with 6-9");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .toLowerCase();

export const aadharSchema = z
  .string()
  .trim()
  .length(12, "AADHAR number must be exactly 12 digits")
  .regex(/^[0-9]{12}$/, "AADHAR number must contain only digits")
  .refine((val) => isValidAadhaar(val), "Invalid AADHAR number: checksum verification failed")
  .nullable()
  .optional();

export const panSchema = z
  .string()
  .trim()
  .length(10, "PAN number must be exactly 10 characters")
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN number must follow format: 5 letters, 4 digits, 1 letter")
  .nullable()
  .optional();

export const postalCodeSchema = z
  .string()
  .trim()
  .min(1, "PIN code is required")
  .length(6, "PIN code must be exactly 6 digits")
  .regex(/^[0-9]{6}$/, "PIN code must contain only digits");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters");

export const dateOfBirthSchema = z
  .string()
  .refine((val) => {
    const date = new Date(val);
    const year = date.getFullYear();
    return year >= 1950 && year <= 2010;
  }, "Date of birth must be between 1950 and 2010")
  .refine((val) => {
    const dob = new Date(val);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
    return actualAge >= 16;
  }, "Student must be at least 16 years old")
  .nullable()
  .optional();

export const genderSchema = z.enum(GENDERS).nullable().optional().catch(ENUM_DEFAULTS.gender);

export const salutationSchema = z
  .enum(SALUTATIONS)
  .nullable()
  .optional()
  .catch(ENUM_DEFAULTS.salutation);

export const educationLevelSchema = z
  .enum(EDUCATION_LEVELS)
  .nullable()
  .optional()
  .catch(ENUM_DEFAULTS.educationLevel);

export const streamSchema = z.enum(STREAMS).nullable().optional().catch(ENUM_DEFAULTS.stream);

export const certificationTypeSchema = z
  .enum(CERTIFICATION_TYPES)
  .nullable()
  .optional()
  .catch(ENUM_DEFAULTS.certificationType);

export const stateSchema = z.enum(INDIAN_STATES);

export const addressSchema = z.object({
  address_line1: z.string().min(1, "Address line 1 is required").trim(),
  address_line2: z.string().trim().nullable().optional(),
  landmark: z.string().trim().nullable().optional(),
  city: z.string().min(1, "City is required").trim(),
  state: stateSchema,
  postal_code: postalCodeSchema,
  country: z.string().default("India"),
});

export const residentialAddressSchema = addressSchema.extend({
  address_line1: z
    .string()
    .min(20, "Residential address must be at least 20 characters and include landmark details")
    .trim(),
  landmark: z.string().min(1, "Landmark is required for residential address").trim(),
});

export const batchCodeSchema = z
  .string()
  .trim()
  .min(1, "Batch code cannot be empty")
  .nullable()
  .optional();

export const batchCodeWithCertificationSchema = z
  .object({
    certification_type: certificationTypeSchema.nullable().optional(),
    batch_code: batchCodeSchema,
  })
  .refine(
    (data) => {
      if (!data.batch_code || !data.certification_type) {
        return true;
      }

      const batchCode = data.batch_code.trim();
      if (batchCode.length === 0) {
        return true;
      }

      const certificationType = data.certification_type;

      if (certificationType === "US CMA") {
        return /^CMA_(?:P\d+|PART\d+|[A-Z0-9]{1,10})_(?:(?:Sec[A-Z]_)?Batch|Group)_[0-9]{1,2}_[A-Z](?:_[A-Z])?$/.test(
          batchCode,
        );
      } else if (certificationType === "ACCA") {
        return /^ACCA_\d{4}_Batch_\d+$/.test(batchCode);
      } else if (certificationType === "CFA") {
        return /^CFA_L\d+_Batch_\d+$/.test(batchCode);
      } else if (certificationType === "US CPA") {
        return /^CPA_[A-Z]{3}_Batch_\d+$/.test(batchCode);
      }

      return true;
    },
    {
      message: "Invalid batch code format for the selected certification type",
      path: ["batch_code"],
    },
  );

export const batchCodePartialSchema = batchCodeWithCertificationSchema.partial();

export type CertificationType = z.infer<typeof certificationTypeSchema>;
export type BatchCodeWithCertification = z.infer<typeof batchCodeWithCertificationSchema>;

export const mentorIdSchema = z
  .string()
  .trim()
  .min(1, "Mentor ID cannot be empty")
  .nullable()
  .optional();

export const preferredContactTimeSchema = z
  .string()
  .trim()
  .min(1, "Preferred contact time cannot be empty")
  .nullable()
  .optional();

export const deliveryInstructionsSchema = z
  .string()
  .trim()
  .min(1, "Delivery instructions cannot be empty")
  .nullable()
  .optional();

export const landmarkDetailsSchema = z
  .string()
  .trim()
  .min(1, "Landmark details cannot be empty")
  .nullable()
  .optional();

export const mockPerformanceSchema = z
  .object({
    score: z.number().min(0).max(100).nullable().optional(),
    rank: z.number().int().positive().nullable().optional(),
    percentile: z.number().min(0).max(100).nullable().optional(),
    feedback: z.string().trim().nullable().optional(),
  })
  .nullable()
  .optional();

export const examFeedbackSchema = z
  .string()
  .trim()
  .min(1, "Exam feedback cannot be empty")
  .nullable()
  .optional();

export const participationNotesSchema = z
  .string()
  .trim()
  .min(1, "Participation notes cannot be empty")
  .nullable()
  .optional();

export const attentionScoreSchema = z
  .number()
  .int()
  .min(0, "Attention score must be between 0 and 10")
  .max(10, "Attention score must be between 0 and 10")
  .nullable()
  .optional();

export const questionCountSchema = z
  .number()
  .int()
  .min(0, "Question count must be non-negative")
  .nullable()
  .optional();

export const scoreBreakdownSchema = z
  .object({
    theory: z.number().min(0).nullable().optional(),
    practical: z.number().min(0).nullable().optional(),
    total: z.number().min(0).nullable().optional(),
  })
  .nullable()
  .optional();

export const weakAreasSchema = z.array(z.string().trim().min(1)).nullable().optional();

export const strongAreasSchema = z.array(z.string().trim().min(1)).nullable().optional();

export const studentExtraFieldsSchema = z.object({
  batch_code: batchCodeSchema,
  mentor_id: mentorIdSchema,
  preferred_contact_time: preferredContactTimeSchema,
});

export const addressAdditionalDataSchema = z.object({
  delivery_instructions: deliveryInstructionsSchema,
  landmark_details: landmarkDetailsSchema,
});

export const certificationCustomFieldsSchema = z.object({
  batch_code: batchCodeSchema,
  mentor_id: mentorIdSchema,
  projected_completion_date: z.string().nullable().optional(),
  enrollment_notes: z.string().trim().nullable().optional(),
});

export const examAttemptMetadataSchema = z.object({
  mock_performance: mockPerformanceSchema,
  exam_feedback: examFeedbackSchema,
  attempt_number: z.number().int().positive().nullable().optional(),
  exam_center: z.string().trim().nullable().optional(),
});

export const attendanceExtraMetricsSchema = z.object({
  attention_score: attentionScoreSchema,
  question_count: questionCountSchema,
  participation_notes: participationNotesSchema,
  late_by_minutes: z.number().int().min(0).nullable().optional(),
});

export const testScoreAnalysisDataSchema = z.object({
  score_breakdown: scoreBreakdownSchema,
  weak_areas: weakAreasSchema,
  strong_areas: strongAreasSchema,
  percentile: z.number().min(0).max(100).nullable().optional(),
});

export const academicInfoExtraFieldsSchema = z.object({
  scholarship_details: z.string().trim().nullable().optional(),
  extracurricular_activities: z.array(z.string().trim()).nullable().optional(),
  academic_awards: z.array(z.string().trim()).nullable().optional(),
});

export const formSubmissionRawDataSchema = z.record(z.unknown());

export const studentExtraFieldsPartialSchema = studentExtraFieldsSchema.partial();
export const addressAdditionalDataPartialSchema = addressAdditionalDataSchema.partial();
export const certificationCustomFieldsPartialSchema = certificationCustomFieldsSchema.partial();
export const examAttemptMetadataPartialSchema = examAttemptMetadataSchema.partial();
export const attendanceExtraMetricsPartialSchema = attendanceExtraMetricsSchema.partial();
export const testScoreAnalysisDataPartialSchema = testScoreAnalysisDataSchema.partial();
export const academicInfoExtraFieldsPartialSchema = academicInfoExtraFieldsSchema.partial();

export type StudentExtraFields = z.infer<typeof studentExtraFieldsSchema>;
export type AddressAdditionalData = z.infer<typeof addressAdditionalDataSchema>;
export type CertificationCustomFields = z.infer<typeof certificationCustomFieldsSchema>;
export type ExamAttemptMetadata = z.infer<typeof examAttemptMetadataSchema>;
export type AttendanceExtraMetrics = z.infer<typeof attendanceExtraMetricsSchema>;
export type TestScoreAnalysisData = z.infer<typeof testScoreAnalysisDataSchema>;
export type AcademicInfoExtraFields = z.infer<typeof academicInfoExtraFieldsSchema>;
export type FormSubmissionRawData = z.infer<typeof formSubmissionRawDataSchema>;
