import { ZodError, ZodIssue } from "zod";

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface FormattedErrors {
  [field: string]: FieldError;
}

export function formatValidationErrors(zodError: ZodError): FormattedErrors {
  const formattedErrors: FormattedErrors = {};

  zodError.issues.forEach((issue: ZodIssue) => {
    const fieldPath = issue.path.join(".");
    const field = fieldPath || "root";

    if (!formattedErrors[field]) {
      formattedErrors[field] = {
        field,
        message: formatErrorMessage(issue),
        code: issue.code,
      };
    }
  });

  return formattedErrors;
}

function formatErrorMessage(issue: ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return issue.message || "Invalid type";
    case "too_small":
      if (issue.message && issue.message.includes(">=")) {
        const match = issue.message.match(/>=(\d+) characters/);
        if (match) {
          return `Must be at least ${match[1]} characters`;
        }
      }
      return issue.message || "Value is too small";
    case "too_big":
      if (issue.message && issue.message.includes("<=")) {
        const match = issue.message.match(/<=(\d+) characters/);
        if (match) {
          return `Must be at most ${match[1]} characters`;
        }
      }
      return issue.message || "Value is too large";
    case "unrecognized_keys":
      return issue.message || "Unexpected fields found";
    case "invalid_union":
      return issue.message || "Invalid value";
    case "invalid_value":
      if (issue.message && issue.message.includes("expected one of")) {
        const match = issue.message.match(/expected one of (.+)/);
        if (match) {
          const options = match[1].replace(/"/g, "").replace(/\|/g, ", ");
          return `Must be one of: ${options}`;
        }
      }
      return issue.message || "Invalid value";
    case "custom":
      return issue.message || "Validation failed";
    default:
      return issue.message || "Invalid input";
  }
}

export function formatDatabaseError(error: Error | string): FieldError {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes("students_phone_format")) {
    return {
      field: "phone_number",
      message: "Phone number must be 10 digits starting with 6-9",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_guardian_phone_format")) {
    return {
      field: "guardian_phone",
      message: "Guardian phone number must be 10 digits starting with 6-9",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_guardian_diff")) {
    return {
      field: "guardian_phone",
      message: "Guardian phone number must be different from student phone number",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_email_format")) {
    return {
      field: "email",
      message: "Please enter a valid email address",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_aadhar_format")) {
    return {
      field: "aadhar_number",
      message: "AADHAR number must be exactly 12 digits",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_pan_format")) {
    return {
      field: "pan_number",
      message: "PAN number must follow format: 5 letters, 4 digits, 1 letter",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_minimum_age_check")) {
    return {
      field: "date_of_birth",
      message: "Student must be at least 16 years old",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_date_of_birth_check")) {
    return {
      field: "date_of_birth",
      message: "Date of birth must be between 1950 and 2010",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_gender_check")) {
    return {
      field: "gender",
      message: "Gender must be one of: Male, Female, Others",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("students_salutation_check")) {
    return {
      field: "salutation",
      message: "Salutation must be one of: Mr, Ms, Mrs",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("student_addresses_postal_code_check")) {
    return {
      field: "postal_code",
      message: "PIN code must be exactly 6 digits",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("student_addresses_state_check")) {
    return {
      field: "state",
      message: "State is required",
      code: "constraint_violation",
    };
  }

  if (errorLower.includes("student_addresses_country_check")) {
    return {
      field: "country",
      message: "Country is required",
      code: "constraint_violation",
    };
  }

  if (
    errorLower.includes("students_email_unique") ||
    (errorLower.includes("duplicate key value violates unique constraint") &&
      errorLower.includes("email"))
  ) {
    return {
      field: "email",
      message: "This email address is already registered",
      code: "unique_violation",
    };
  }

  if (
    errorLower.includes("students_phone_number_key") ||
    (errorLower.includes("duplicate key value violates unique constraint") &&
      errorLower.includes("phone"))
  ) {
    return {
      field: "phone_number",
      message: "This phone number is already registered",
      code: "unique_violation",
    };
  }

  if (
    errorLower.includes("students_aadhar_unique") ||
    (errorLower.includes("duplicate key value violates unique constraint") &&
      errorLower.includes("aadhar"))
  ) {
    return {
      field: "aadhar_number",
      message: "This AADHAR number is already registered",
      code: "unique_violation",
    };
  }

  if (
    errorLower.includes("students_pan_unique") ||
    (errorLower.includes("duplicate key value violates unique constraint") &&
      errorLower.includes("pan"))
  ) {
    return {
      field: "pan_number",
      message: "This PAN number is already registered",
      code: "unique_violation",
    };
  }

  if (errorLower.includes("patch must be a json object")) {
    return {
      field: "root",
      message: "Invalid data format: expected a JSON object",
      code: "invalid_format",
    };
  }

  if (errorLower.includes("foreign key violation")) {
    return {
      field: "root",
      message: "Referenced record does not exist",
      code: "foreign_key_violation",
    };
  }

  if (errorLower.includes("not null") || errorLower.includes("not-null")) {
    const match = errorMessage.match(/column "([^"]+)"/i);
    const field = match ? match[1] : "root";
    return {
      field,
      message: "This field is required",
      code: "not_null_violation",
    };
  }

  return {
    field: "root",
    message: "An error occurred while processing your request",
    code: "unknown_error",
  };
}

export function getFieldError(errors: FormattedErrors, field: string): string | null {
  return errors[field]?.message || null;
}

export function hasFieldError(errors: FormattedErrors, field: string): boolean {
  return !!errors[field];
}

export function getAllErrorMessages(errors: FormattedErrors): string[] {
  return Object.values(errors).map((error) => error.message);
}

export function getFirstErrorMessage(errors: FormattedErrors): string | null {
  const firstError = Object.values(errors)[0];
  return firstError?.message || null;
}

export function formatErrorsForDisplay(errors: FormattedErrors): Record<string, string> {
  const displayErrors: Record<string, string> = {};
  Object.entries(errors).forEach(([field, error]) => {
    displayErrors[field] = error.message;
  });
  return displayErrors;
}

export function mergeErrors(...errorObjects: FormattedErrors[]): FormattedErrors {
  return errorObjects.reduce((acc, errors) => {
    return { ...acc, ...errors };
  }, {});
}

export function formatCrossFieldError(
  field: string,
  message: string,
  code?: string,
): FormattedErrors {
  return {
    [field]: {
      field,
      message,
      code: code || "cross_field_validation",
    },
  };
}

export function formatAsyncValidationError(field: string, message: string): FormattedErrors {
  return {
    [field]: {
      field,
      message,
      code: "async_validation",
    },
  };
}
