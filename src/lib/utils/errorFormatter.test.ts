import { describe, it, expect } from "@jest/globals";
import { z } from "zod";
import {
  formatValidationErrors,
  formatDatabaseError,
  getFieldError,
  hasFieldError,
  getAllErrorMessages,
  getFirstErrorMessage,
  formatErrorsForDisplay,
  mergeErrors,
  formatCrossFieldError,
  formatAsyncValidationError,
} from "./errorFormatter";

describe("formatValidationErrors", () => {
  it("should format single field error", () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const result = schema.safeParse({ email: "invalid" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.email).toBeDefined();
      expect(errors.email.field).toBe("email");
      expect(errors.email.message).toContain("email");
    }
  });

  it("should format multiple field errors", () => {
    const schema = z.object({
      email: z.string().email(),
      phone: z.string().length(10),
    });

    const result = schema.safeParse({ email: "invalid", phone: "123" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.email).toBeDefined();
      expect(errors.phone).toBeDefined();
      expect(Object.keys(errors).length).toBe(2);
    }
  });

  it("should format nested field errors", () => {
    const schema = z.object({
      address: z.object({
        city: z.string().min(1),
      }),
    });

    const result = schema.safeParse({ address: { city: "" } });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors["address.city"]).toBeDefined();
    }
  });

  it("should handle too_small error for strings", () => {
    const schema = z.object({
      name: z.string().min(5),
    });

    const result = schema.safeParse({ name: "abc" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.name.message).toContain("at least 5 characters");
    }
  });

  it("should handle too_big error for strings", () => {
    const schema = z.object({
      name: z.string().max(5),
    });

    const result = schema.safeParse({ name: "abcdefgh" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.name.message).toContain("at most 5 characters");
    }
  });

  it("should handle invalid_enum_value error", () => {
    const schema = z.object({
      status: z.enum(["active", "inactive"]),
    });

    const result = schema.safeParse({ status: "pending" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.status.message).toContain("active, inactive");
    }
  });

  it("should handle custom error messages", () => {
    const schema = z.object({
      phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must start with 6-9"),
    });

    const result = schema.safeParse({ phone: "1234567890" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.phone.message).toBe("Phone number must start with 6-9");
    }
  });

  it("should include error codes", () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const result = schema.safeParse({ email: "invalid" });
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.email.code).toBeDefined();
    }
  });
});

describe("formatDatabaseError", () => {
  it("should format phone format constraint error", () => {
    const error = new Error('violates check constraint "students_phone_format"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("phone_number");
    expect(formatted.message).toContain("10 digits");
    expect(formatted.code).toBe("constraint_violation");
  });

  it("should format guardian phone format constraint error", () => {
    const error = new Error('violates check constraint "students_guardian_phone_format"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("guardian_phone");
    expect(formatted.message).toContain("10 digits");
  });

  it("should format guardian phone difference constraint error", () => {
    const error = new Error('violates check constraint "students_guardian_diff"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("guardian_phone");
    expect(formatted.message).toContain("different from student phone");
  });

  it("should format email format constraint error", () => {
    const error = new Error('violates check constraint "students_email_format"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("email");
    expect(formatted.message).toContain("valid email");
  });

  it("should format AADHAR format constraint error", () => {
    const error = new Error('violates check constraint "students_aadhar_format"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("aadhar_number");
    expect(formatted.message).toContain("12 digits");
  });

  it("should format PAN format constraint error", () => {
    const error = new Error('violates check constraint "students_pan_format"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("pan_number");
    expect(formatted.message).toContain("5 letters, 4 digits, 1 letter");
  });

  it("should format minimum age constraint error", () => {
    const error = new Error('violates check constraint "students_minimum_age_check"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("date_of_birth");
    expect(formatted.message).toContain("16 years old");
  });

  it("should format date of birth range constraint error", () => {
    const error = new Error('violates check constraint "students_date_of_birth_check"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("date_of_birth");
    expect(formatted.message).toContain("1950 and 2010");
  });

  it("should format gender constraint error", () => {
    const error = new Error('violates check constraint "students_gender_check"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("gender");
    expect(formatted.message).toContain("Male, Female, Others");
  });

  it("should format salutation constraint error", () => {
    const error = new Error('violates check constraint "students_salutation_check"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("salutation");
    expect(formatted.message).toContain("Mr, Ms, Mrs");
  });

  it("should format postal code constraint error", () => {
    const error = new Error('violates check constraint "student_addresses_postal_code_check"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("postal_code");
    expect(formatted.message).toContain("6 digits");
  });

  it("should format email unique constraint error", () => {
    const error = new Error(
      'duplicate key value violates unique constraint "students_email_unique"',
    );
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("email");
    expect(formatted.message).toContain("already registered");
    expect(formatted.code).toBe("unique_violation");
  });

  it("should format phone unique constraint error", () => {
    const error = new Error(
      'duplicate key value violates unique constraint "students_phone_number_key"',
    );
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("phone_number");
    expect(formatted.message).toContain("already registered");
  });

  it("should format AADHAR unique constraint error", () => {
    const error = new Error(
      'duplicate key value violates unique constraint "students_aadhar_unique"',
    );
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("aadhar_number");
    expect(formatted.message).toContain("already registered");
  });

  it("should format PAN unique constraint error", () => {
    const error = new Error('duplicate key value violates unique constraint "students_pan_unique"');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("pan_number");
    expect(formatted.message).toContain("already registered");
  });

  it("should format JSONB patch error", () => {
    const error = new Error("patch must be a JSON object");
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("root");
    expect(formatted.message).toContain("JSON object");
    expect(formatted.code).toBe("invalid_format");
  });

  it("should format foreign key violation error", () => {
    const error = new Error("foreign key violation");
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("root");
    expect(formatted.message).toContain("does not exist");
    expect(formatted.code).toBe("foreign_key_violation");
  });

  it("should format not null violation error", () => {
    const error = new Error('null value in column "email" violates not-null constraint');
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("email");
    expect(formatted.message).toContain("required");
    expect(formatted.code).toBe("not_null_violation");
  });

  it("should handle string error messages", () => {
    const error = 'violates check constraint "students_phone_format"';
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("phone_number");
    expect(formatted.message).toContain("10 digits");
  });

  it("should handle unknown errors", () => {
    const error = new Error("Some unknown database error");
    const formatted = formatDatabaseError(error);
    expect(formatted.field).toBe("root");
    expect(formatted.code).toBe("unknown_error");
  });
});

describe("getFieldError", () => {
  it("should return error message for existing field", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
    };
    expect(getFieldError(errors, "email")).toBe("Invalid email");
  });

  it("should return null for non-existing field", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
    };
    expect(getFieldError(errors, "phone")).toBeNull();
  });
});

describe("hasFieldError", () => {
  it("should return true for existing field error", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
    };
    expect(hasFieldError(errors, "email")).toBe(true);
  });

  it("should return false for non-existing field error", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
    };
    expect(hasFieldError(errors, "phone")).toBe(false);
  });
});

describe("getAllErrorMessages", () => {
  it("should return all error messages", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
      phone: { field: "phone", message: "Invalid phone" },
    };
    const messages = getAllErrorMessages(errors);
    expect(messages).toHaveLength(2);
    expect(messages).toContain("Invalid email");
    expect(messages).toContain("Invalid phone");
  });

  it("should return empty array for no errors", () => {
    const errors = {};
    const messages = getAllErrorMessages(errors);
    expect(messages).toHaveLength(0);
  });
});

describe("getFirstErrorMessage", () => {
  it("should return first error message", () => {
    const errors = {
      email: { field: "email", message: "Invalid email" },
      phone: { field: "phone", message: "Invalid phone" },
    };
    const message = getFirstErrorMessage(errors);
    expect(message).toBeTruthy();
    expect(["Invalid email", "Invalid phone"]).toContain(message);
  });

  it("should return null for no errors", () => {
    const errors = {};
    const message = getFirstErrorMessage(errors);
    expect(message).toBeNull();
  });
});

describe("formatErrorsForDisplay", () => {
  it("should format errors as simple key-value pairs", () => {
    const errors = {
      email: { field: "email", message: "Invalid email", code: "invalid_string" },
      phone: { field: "phone", message: "Invalid phone", code: "invalid_string" },
    };
    const display = formatErrorsForDisplay(errors);
    expect(display).toEqual({
      email: "Invalid email",
      phone: "Invalid phone",
    });
  });
});

describe("mergeErrors", () => {
  it("should merge multiple error objects", () => {
    const errors1 = {
      email: { field: "email", message: "Invalid email" },
    };
    const errors2 = {
      phone: { field: "phone", message: "Invalid phone" },
    };
    const merged = mergeErrors(errors1, errors2);
    expect(merged.email).toBeDefined();
    expect(merged.phone).toBeDefined();
  });

  it("should override errors with same field", () => {
    const errors1 = {
      email: { field: "email", message: "Invalid email" },
    };
    const errors2 = {
      email: { field: "email", message: "Email already exists" },
    };
    const merged = mergeErrors(errors1, errors2);
    expect(merged.email.message).toBe("Email already exists");
  });

  it("should handle empty error objects", () => {
    const merged = mergeErrors({}, {});
    expect(Object.keys(merged)).toHaveLength(0);
  });
});

describe("formatCrossFieldError", () => {
  it("should format cross-field validation error", () => {
    const error = formatCrossFieldError(
      "guardian_phone",
      "Guardian phone must be different from student phone",
    );
    expect(error.guardian_phone).toBeDefined();
    expect(error.guardian_phone.message).toBe(
      "Guardian phone must be different from student phone",
    );
    expect(error.guardian_phone.code).toBe("cross_field_validation");
  });

  it("should allow custom error code", () => {
    const error = formatCrossFieldError(
      "guardian_phone",
      "Guardian phone must be different from student phone",
      "custom_code",
    );
    expect(error.guardian_phone.code).toBe("custom_code");
  });
});

describe("formatAsyncValidationError", () => {
  it("should format async validation error", () => {
    const error = formatAsyncValidationError("email", "Email already exists in database");
    expect(error.email).toBeDefined();
    expect(error.email.message).toBe("Email already exists in database");
    expect(error.email.code).toBe("async_validation");
  });
});
