import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  phoneNumberSchema,
  guardianPhoneSchema,
  validatePhoneNumber,
  validateGuardianPhone,
  parsePhoneNumber,
  safeParsePhoneNumber,
  parseGuardianPhone,
  safeParseGuardianPhone,
  getPhoneValidationError,
  getGuardianPhoneValidationError,
  emailSchema,
  validateEmail,
  parseEmail,
  safeParseEmail,
  getEmailValidationError,
} from "./studentValidator";

jest.mock("../supabase/client");

describe("phoneNumberSchema", () => {
  describe("valid phone numbers", () => {
    it("should accept phone numbers starting with 6", () => {
      expect(phoneNumberSchema.safeParse("6123456789").success).toBe(true);
      expect(phoneNumberSchema.safeParse("6987654321").success).toBe(true);
    });

    it("should accept phone numbers starting with 7", () => {
      expect(phoneNumberSchema.safeParse("7123456789").success).toBe(true);
      expect(phoneNumberSchema.safeParse("7987654321").success).toBe(true);
    });

    it("should accept phone numbers starting with 8", () => {
      expect(phoneNumberSchema.safeParse("8123456789").success).toBe(true);
      expect(phoneNumberSchema.safeParse("8987654321").success).toBe(true);
    });

    it("should accept phone numbers starting with 9", () => {
      expect(phoneNumberSchema.safeParse("9123456789").success).toBe(true);
      expect(phoneNumberSchema.safeParse("9876543210").success).toBe(true);
    });

    it("should trim whitespace from valid phone numbers", () => {
      const result = phoneNumberSchema.safeParse("  9876543210  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("9876543210");
      }
    });
  });

  describe("invalid phone numbers", () => {
    it("should reject phone numbers starting with 0-5", () => {
      expect(phoneNumberSchema.safeParse("0123456789").success).toBe(false);
      expect(phoneNumberSchema.safeParse("1234567890").success).toBe(false);
      expect(phoneNumberSchema.safeParse("2345678901").success).toBe(false);
      expect(phoneNumberSchema.safeParse("3456789012").success).toBe(false);
      expect(phoneNumberSchema.safeParse("4567890123").success).toBe(false);
      expect(phoneNumberSchema.safeParse("5678901234").success).toBe(false);
    });

    it("should reject phone numbers with less than 10 digits", () => {
      expect(phoneNumberSchema.safeParse("987654321").success).toBe(false);
      expect(phoneNumberSchema.safeParse("98765432").success).toBe(false);
      expect(phoneNumberSchema.safeParse("9876543").success).toBe(false);
    });

    it("should reject phone numbers with more than 10 digits", () => {
      expect(phoneNumberSchema.safeParse("98765432100").success).toBe(false);
      expect(phoneNumberSchema.safeParse("987654321000").success).toBe(false);
    });

    it("should reject phone numbers with non-numeric characters", () => {
      expect(phoneNumberSchema.safeParse("987654321a").success).toBe(false);
      expect(phoneNumberSchema.safeParse("98765-4321").success).toBe(false);
      expect(phoneNumberSchema.safeParse("9876 543210").success).toBe(false);
      expect(phoneNumberSchema.safeParse("+919876543210").success).toBe(false);
      expect(phoneNumberSchema.safeParse("(987)6543210").success).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(phoneNumberSchema.safeParse("").success).toBe(false);
    });

    it("should reject strings with only whitespace", () => {
      expect(phoneNumberSchema.safeParse("   ").success).toBe(false);
    });
  });
});

describe("guardianPhoneSchema", () => {
  describe("valid guardian phone numbers", () => {
    it("should accept valid phone numbers starting with 6-9", () => {
      expect(guardianPhoneSchema.safeParse("6123456789").success).toBe(true);
      expect(guardianPhoneSchema.safeParse("7123456789").success).toBe(true);
      expect(guardianPhoneSchema.safeParse("8123456789").success).toBe(true);
      expect(guardianPhoneSchema.safeParse("9876543210").success).toBe(true);
    });

    it("should accept null values", () => {
      expect(guardianPhoneSchema.safeParse(null).success).toBe(true);
    });

    it("should accept undefined values", () => {
      expect(guardianPhoneSchema.safeParse(undefined).success).toBe(true);
    });

    it("should trim whitespace from valid phone numbers", () => {
      const result = guardianPhoneSchema.safeParse("  9876543210  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("9876543210");
      }
    });
  });

  describe("invalid guardian phone numbers", () => {
    it("should reject invalid phone numbers", () => {
      expect(guardianPhoneSchema.safeParse("0123456789").success).toBe(false);
      expect(guardianPhoneSchema.safeParse("987654321").success).toBe(false);
      expect(guardianPhoneSchema.safeParse("98765432100").success).toBe(false);
      expect(guardianPhoneSchema.safeParse("987654321a").success).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(guardianPhoneSchema.safeParse("").success).toBe(false);
    });

    it("should reject strings with only whitespace", () => {
      expect(guardianPhoneSchema.safeParse("   ").success).toBe(false);
    });
  });
});

describe("validatePhoneNumber", () => {
  it("should return true for valid phone numbers", () => {
    expect(validatePhoneNumber("9876543210")).toBe(true);
    expect(validatePhoneNumber("8765432109")).toBe(true);
    expect(validatePhoneNumber("7654321098")).toBe(true);
    expect(validatePhoneNumber("6543210987")).toBe(true);
  });

  it("should return false for invalid phone numbers", () => {
    expect(validatePhoneNumber("1234567890")).toBe(false);
    expect(validatePhoneNumber("987654321")).toBe(false);
    expect(validatePhoneNumber("98765432100")).toBe(false);
    expect(validatePhoneNumber("abcdefghij")).toBe(false);
  });
});

describe("validateGuardianPhone", () => {
  it("should return true for valid guardian phone numbers", () => {
    expect(validateGuardianPhone("9876543210")).toBe(true);
    expect(validateGuardianPhone("8765432109")).toBe(true);
  });

  it("should return true for null or undefined", () => {
    expect(validateGuardianPhone(null)).toBe(true);
    expect(validateGuardianPhone(undefined)).toBe(true);
  });

  it("should return false for invalid guardian phone numbers", () => {
    expect(validateGuardianPhone("1234567890")).toBe(false);
    expect(validateGuardianPhone("987654321")).toBe(false);
  });

  it("should return false for empty strings", () => {
    expect(validateGuardianPhone("")).toBe(false);
  });

  it("should return false for strings with only whitespace", () => {
    expect(validateGuardianPhone("   ")).toBe(false);
  });
});

describe("parsePhoneNumber", () => {
  it("should parse valid phone numbers", () => {
    expect(parsePhoneNumber("9876543210")).toBe("9876543210");
    expect(parsePhoneNumber("  8765432109  ")).toBe("8765432109");
  });

  it("should throw error for invalid phone numbers", () => {
    expect(() => parsePhoneNumber("1234567890")).toThrow();
    expect(() => parsePhoneNumber("987654321")).toThrow();
    expect(() => parsePhoneNumber("abcdefghij")).toThrow();
  });
});

describe("safeParsePhoneNumber", () => {
  it("should return success for valid phone numbers", () => {
    const result = safeParsePhoneNumber("9876543210");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("9876543210");
    }
  });

  it("should return error for invalid phone numbers", () => {
    const result = safeParsePhoneNumber("1234567890");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe("parseGuardianPhone", () => {
  it("should parse valid guardian phone numbers", () => {
    expect(parseGuardianPhone("9876543210")).toBe("9876543210");
    expect(parseGuardianPhone("  8765432109  ")).toBe("8765432109");
  });

  it("should parse null and undefined", () => {
    expect(parseGuardianPhone(null)).toBeNull();
    expect(parseGuardianPhone(undefined)).toBeUndefined();
  });

  it("should throw error for invalid guardian phone numbers", () => {
    expect(() => parseGuardianPhone("1234567890")).toThrow();
    expect(() => parseGuardianPhone("987654321")).toThrow();
  });
});

describe("safeParseGuardianPhone", () => {
  it("should return success for valid guardian phone numbers", () => {
    const result = safeParseGuardianPhone("9876543210");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("9876543210");
    }
  });

  it("should return success for null and undefined", () => {
    expect(safeParseGuardianPhone(null).success).toBe(true);
    expect(safeParseGuardianPhone(undefined).success).toBe(true);
  });

  it("should return error for invalid guardian phone numbers", () => {
    const result = safeParseGuardianPhone("1234567890");
    expect(result.success).toBe(false);
  });
});

describe("getPhoneValidationError", () => {
  it("should return null for valid phone numbers", () => {
    expect(getPhoneValidationError("9876543210")).toBeNull();
    expect(getPhoneValidationError("8765432109")).toBeNull();
  });

  it("should return error message for invalid phone numbers", () => {
    const error1 = getPhoneValidationError("1234567890");
    expect(error1).toBeTruthy();
    expect(error1).toContain("6-9");

    const error2 = getPhoneValidationError("987654321");
    expect(error2).toBeTruthy();
    expect(error2).toContain("10");

    const error3 = getPhoneValidationError("98765432100");
    expect(error3).toBeTruthy();
    expect(error3).toContain("10");
  });
});

describe("getGuardianPhoneValidationError", () => {
  it("should return null for valid guardian phone numbers", () => {
    expect(getGuardianPhoneValidationError("9876543210")).toBeNull();
    expect(getGuardianPhoneValidationError("8765432109")).toBeNull();
  });

  it("should return null for null or undefined", () => {
    expect(getGuardianPhoneValidationError(null)).toBeNull();
    expect(getGuardianPhoneValidationError(undefined)).toBeNull();
  });

  it("should return error message for invalid guardian phone numbers", () => {
    const error1 = getGuardianPhoneValidationError("1234567890");
    expect(error1).toBeTruthy();
    expect(error1).toContain("6-9");

    const error2 = getGuardianPhoneValidationError("987654321");
    expect(error2).toBeTruthy();
    expect(error2).toContain("10");
  });

  it("should return error message for empty strings", () => {
    const error = getGuardianPhoneValidationError("");
    expect(error).toBeTruthy();
    expect(error).toContain("10");
  });

  it("should return error message for strings with only whitespace", () => {
    const error = getGuardianPhoneValidationError("   ");
    expect(error).toBeTruthy();
    expect(error).toContain("10");
  });
});

describe("emailSchema", () => {
  describe("valid emails", () => {
    it("should accept valid email addresses", () => {
      expect(emailSchema.safeParse("test@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user.name@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user+tag@example.co.uk").success).toBe(true);
      expect(emailSchema.safeParse("test123@test-domain.com").success).toBe(true);
    });

    it("should trim and lowercase email addresses", () => {
      const result = emailSchema.safeParse("  TEST@EXAMPLE.COM  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("should accept emails with numbers", () => {
      expect(emailSchema.safeParse("user123@example.com").success).toBe(true);
      expect(emailSchema.safeParse("123user@example.com").success).toBe(true);
    });

    it("should accept emails with special characters", () => {
      expect(emailSchema.safeParse("user.name@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user_name@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user+tag@example.com").success).toBe(true);
      expect(emailSchema.safeParse("user-name@example.com").success).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("should reject emails without @ symbol", () => {
      expect(emailSchema.safeParse("testexample.com").success).toBe(false);
      expect(emailSchema.safeParse("test.example.com").success).toBe(false);
    });

    it("should reject emails without domain", () => {
      expect(emailSchema.safeParse("test@").success).toBe(false);
      expect(emailSchema.safeParse("test@.com").success).toBe(false);
    });

    it("should reject emails without local part", () => {
      expect(emailSchema.safeParse("@example.com").success).toBe(false);
    });

    it("should reject emails with spaces", () => {
      expect(emailSchema.safeParse("test user@example.com").success).toBe(false);
      expect(emailSchema.safeParse("test@example .com").success).toBe(false);
    });

    it("should reject emails that are too short", () => {
      expect(emailSchema.safeParse("a@b").success).toBe(false);
      expect(emailSchema.safeParse("a@b.").success).toBe(false);
    });

    it("should reject emails that are too long", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(emailSchema.safeParse(longEmail).success).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(emailSchema.safeParse("").success).toBe(false);
    });

    it("should reject strings with only whitespace", () => {
      expect(emailSchema.safeParse("   ").success).toBe(false);
    });

    it("should reject emails with multiple @ symbols", () => {
      expect(emailSchema.safeParse("test@@example.com").success).toBe(false);
      expect(emailSchema.safeParse("test@test@example.com").success).toBe(false);
    });
  });
});

describe("validateEmail", () => {
  it("should return true for valid email addresses", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@example.com")).toBe(true);
    expect(validateEmail("user+tag@example.co.uk")).toBe(true);
  });

  it("should return false for invalid email addresses", () => {
    expect(validateEmail("testexample.com")).toBe(false);
    expect(validateEmail("test@")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("test user@example.com")).toBe(false);
  });
});

describe("parseEmail", () => {
  it("should parse valid email addresses", () => {
    expect(parseEmail("test@example.com")).toBe("test@example.com");
    expect(parseEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
  });

  it("should throw error for invalid email addresses", () => {
    expect(() => parseEmail("testexample.com")).toThrow();
    expect(() => parseEmail("test@")).toThrow();
    expect(() => parseEmail("@example.com")).toThrow();
  });
});

describe("safeParseEmail", () => {
  it("should return success for valid email addresses", () => {
    const result = safeParseEmail("test@example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("should normalize email addresses", () => {
    const result = safeParseEmail("  TEST@EXAMPLE.COM  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("should return error for invalid email addresses", () => {
    const result = safeParseEmail("testexample.com");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe("getEmailValidationError", () => {
  it("should return null for valid email addresses", () => {
    expect(getEmailValidationError("test@example.com")).toBeNull();
    expect(getEmailValidationError("user.name@example.com")).toBeNull();
  });

  it("should return error message for invalid email addresses", () => {
    const error1 = getEmailValidationError("testexample.com");
    expect(error1).toBeTruthy();
    expect(error1).toContain("email");

    const error2 = getEmailValidationError("test@");
    expect(error2).toBeTruthy();
    expect(error2).toContain("email");

    const error3 = getEmailValidationError("@example.com");
    expect(error3).toBeTruthy();
    expect(error3).toContain("email");
  });

  it("should return error message for empty strings", () => {
    const error = getEmailValidationError("");
    expect(error).toBeTruthy();
  });
});
