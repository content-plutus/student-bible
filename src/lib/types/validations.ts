import { z } from "zod";
import { isValidAadhaar } from "aadhaar-validator-ts";

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

export const GENDERS = ["Male", "Female", "Others"] as const;
export const SALUTATIONS = ["Mr", "Ms", "Mrs"] as const;
export const STREAMS = ["Commerce", "Arts", "Science", "Other"] as const;

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
  .nullable()
  .optional();

export const salutationSchema = z
  .enum(SALUTATIONS, {
    errorMap: () => ({ message: "Salutation must be one of: Mr, Ms, Mrs" }),
  })
  .nullable()
  .optional();

export const stateSchema = z.enum(INDIAN_STATES, {
  errorMap: () => ({ message: "Please select a valid Indian state" }),
});

export const streamSchema = z
  .enum(STREAMS, {
    errorMap: () => ({ message: "Stream must be one of: Commerce, Arts, Science, Other" }),
  })
  .nullable()
  .optional();

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
