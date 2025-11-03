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

export const createPartialSchema = <T extends z.ZodTypeAny>(schema: T) => {
  return schema.partial();
};

export const createInsertSchema = <T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  omitFields: string[] = ["id", "created_at", "updated_at"],
) => {
  const shape = schema.shape;
  const newShape: Record<string, z.ZodTypeAny> = {};

  for (const key in shape) {
    if (!omitFields.includes(key)) {
      newShape[key] = shape[key];
    }
  }

  return z.object(newShape).strict();
};

export const createUpdateSchema = <T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  omitFields: string[] = ["id", "created_at", "updated_at"],
) => {
  return createInsertSchema(schema, omitFields).partial();
};

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
  .string({ required_error: "Phone number is required" })
  .trim()
  .length(10, "Phone number must be exactly 10 digits")
  .regex(/^[6-9]\d{9}$/, "Phone number must start with 6-9");

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .email("Please enter a valid email address")
  .toLowerCase()
  .trim();

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
  .string({ required_error: "PIN code is required" })
  .trim()
  .length(6, "PIN code must be exactly 6 digits")
  .regex(/^[0-9]{6}$/, "PIN code must contain only digits");

export const nameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
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

export const genderSchema = z
  .enum(GENDERS, {
    errorMap: () => ({ message: "Gender must be one of: Male, Female, Others" }),
  })
  .catch(ENUM_DEFAULTS.gender)
  .nullable()
  .optional();

export const salutationSchema = z
  .enum(SALUTATIONS, {
    errorMap: () => ({ message: "Salutation must be one of: Mr, Ms, Mrs" }),
  })
  .catch(ENUM_DEFAULTS.salutation)
  .nullable()
  .optional();

export const educationLevelSchema = z
  .enum(EDUCATION_LEVELS, {
    errorMap: () => ({ message: "Education level must be one of: 10th, 12th, Graduate, Master, Other" }),
  })
  .catch(ENUM_DEFAULTS.educationLevel)
  .nullable()
  .optional();

export const streamSchema = z
  .enum(STREAMS, {
    errorMap: () => ({ message: "Stream must be one of: Commerce, Arts, Science, Other" }),
  })
  .catch(ENUM_DEFAULTS.stream)
  .nullable()
  .optional();

export const certificationTypeSchema = z
  .enum(CERTIFICATION_TYPES, {
    errorMap: () => ({ message: "Certification type must be one of: ACCA, US CMA, CFA, US CPA" }),
  })
  .catch(ENUM_DEFAULTS.certificationType)
  .nullable()
  .optional();

export const stateSchema = z.enum(INDIAN_STATES, {
  errorMap: () => ({ message: "Please select a valid Indian state" }),
});

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
    (data) => {
      const certificationType = data.certification_type;
      if (certificationType === "US CMA") {
        return {
          message:
            "US CMA batch code must follow format: CMA_{identifier}_{Batch|SecX_Batch|Group}_{number}_{suffix} (e.g., CMA_PART1_Batch_3_E or CMA_P1_SecA_Batch_7_W_E)",
          path: ["batch_code"],
        };
      } else if (certificationType === "ACCA") {
        return {
          message:
            "ACCA batch code must follow format: ACCA_{year}_Batch_{number} (e.g., ACCA_2024_Batch_5)",
          path: ["batch_code"],
        };
      } else if (certificationType === "CFA") {
        return {
          message:
            "CFA batch code must follow format: CFA_L{level}_Batch_{number} (e.g., CFA_L1_Batch_3)",
          path: ["batch_code"],
        };
      } else if (certificationType === "US CPA") {
        return {
          message:
            "US CPA batch code must follow format: CPA_{section}_Batch_{number} (e.g., CPA_AUD_Batch_2)",
          path: ["batch_code"],
        };
      }
      return {
        message: "Invalid batch code format for the selected certification type",
        path: ["batch_code"],
      };
    },
  );

export const batchCodePartialSchema = batchCodeWithCertificationSchema.partial();

export type CertificationType = z.infer<typeof certificationTypeSchema>;
export type BatchCodeWithCertification = z.infer<typeof batchCodeWithCertificationSchema>;
