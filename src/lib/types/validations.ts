import { z } from "zod";

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
  return /^[0-9]{12}$/.test(aadhar);
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
