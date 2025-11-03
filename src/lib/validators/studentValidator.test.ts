import { describe, it, expect } from "@jest/globals";
import {
  phoneNumberSchema,
  guardianPhoneSchema,
  aadharNumberSchema,
  validatePhoneNumber,
  validateGuardianPhone,
  validateAadharNumber,
  parsePhoneNumber,
  safeParsePhoneNumber,
  parseGuardianPhone,
  safeParseGuardianPhone,
  parseAadharNumber,
  safeParseAadharNumber,
  getPhoneValidationError,
  getGuardianPhoneValidationError,
  getAadharValidationError,
} from "./studentValidator";

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

describe("aadharNumberSchema", () => {
  describe("valid AADHAR numbers", () => {
    it("should accept valid AADHAR numbers with correct Verhoeff checksum", () => {
      expect(aadharNumberSchema.safeParse("234123451235").success).toBe(true);
      expect(aadharNumberSchema.safeParse("999999990019").success).toBe(true);
      expect(aadharNumberSchema.safeParse("987654321096").success).toBe(true);
    });

    it("should accept null values", () => {
      expect(aadharNumberSchema.safeParse(null).success).toBe(true);
    });

    it("should accept undefined values", () => {
      expect(aadharNumberSchema.safeParse(undefined).success).toBe(true);
    });

    it("should trim whitespace from valid AADHAR numbers", () => {
      const result = aadharNumberSchema.safeParse("  234123451235  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("234123451235");
      }
    });
  });

  describe("invalid AADHAR numbers", () => {
    it("should reject AADHAR numbers with less than 12 digits", () => {
      expect(aadharNumberSchema.safeParse("12345678901").success).toBe(false);
      expect(aadharNumberSchema.safeParse("1234567890").success).toBe(false);
    });

    it("should reject AADHAR numbers with more than 12 digits", () => {
      expect(aadharNumberSchema.safeParse("1234567890123").success).toBe(false);
      expect(aadharNumberSchema.safeParse("12345678901234").success).toBe(false);
    });

    it("should reject AADHAR numbers with non-numeric characters", () => {
      expect(aadharNumberSchema.safeParse("12345678901a").success).toBe(false);
      expect(aadharNumberSchema.safeParse("1234-5678-9012").success).toBe(false);
      expect(aadharNumberSchema.safeParse("1234 5678 9012").success).toBe(false);
    });

    it("should reject AADHAR numbers with invalid Verhoeff checksum", () => {
      expect(aadharNumberSchema.safeParse("123456789012").success).toBe(false);
      expect(aadharNumberSchema.safeParse("111111111111").success).toBe(false);
      expect(aadharNumberSchema.safeParse("123456789010").success).toBe(false);
    });

    it("should reject empty strings", () => {
      expect(aadharNumberSchema.safeParse("").success).toBe(false);
    });

    it("should reject strings with only whitespace", () => {
      expect(aadharNumberSchema.safeParse("   ").success).toBe(false);
    });
  });
});

describe("validateAadharNumber", () => {
  it("should return true for valid AADHAR numbers with correct checksum", () => {
    expect(validateAadharNumber("234123451235")).toBe(true);
    expect(validateAadharNumber("999999990019")).toBe(true);
    expect(validateAadharNumber("987654321096")).toBe(true);
  });

  it("should return true for null or undefined", () => {
    expect(validateAadharNumber(null)).toBe(true);
    expect(validateAadharNumber(undefined)).toBe(true);
  });

  it("should return false for invalid AADHAR numbers", () => {
    expect(validateAadharNumber("123456789012")).toBe(false);
    expect(validateAadharNumber("12345678901")).toBe(false);
    expect(validateAadharNumber("1234567890123")).toBe(false);
    expect(validateAadharNumber("abcdefghijkl")).toBe(false);
  });

  it("should return false for AADHAR numbers with invalid checksum", () => {
    expect(validateAadharNumber("111111111111")).toBe(false);
    expect(validateAadharNumber("123456789010")).toBe(false);
  });

  it("should return false for empty strings", () => {
    expect(validateAadharNumber("")).toBe(false);
  });

  it("should return false for strings with only whitespace", () => {
    expect(validateAadharNumber("   ")).toBe(false);
  });
});

describe("parseAadharNumber", () => {
  it("should parse valid AADHAR numbers", () => {
    expect(parseAadharNumber("234123451235")).toBe("234123451235");
    expect(parseAadharNumber("  999999990019  ")).toBe("999999990019");
    expect(parseAadharNumber("987654321096")).toBe("987654321096");
  });

  it("should parse null and undefined", () => {
    expect(parseAadharNumber(null)).toBeNull();
    expect(parseAadharNumber(undefined)).toBeUndefined();
  });

  it("should throw error for invalid AADHAR numbers", () => {
    expect(() => parseAadharNumber("123456789012")).toThrow();
    expect(() => parseAadharNumber("12345678901")).toThrow();
    expect(() => parseAadharNumber("abcdefghijkl")).toThrow();
  });

  it("should throw error for AADHAR numbers with invalid checksum", () => {
    expect(() => parseAadharNumber("111111111111")).toThrow();
    expect(() => parseAadharNumber("123456789010")).toThrow();
  });
});

describe("safeParseAadharNumber", () => {
  it("should return success for valid AADHAR numbers", () => {
    const result = safeParseAadharNumber("234123451235");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("234123451235");
    }
  });

  it("should return success for null and undefined", () => {
    expect(safeParseAadharNumber(null).success).toBe(true);
    expect(safeParseAadharNumber(undefined).success).toBe(true);
  });

  it("should return error for invalid AADHAR numbers", () => {
    const result = safeParseAadharNumber("123456789012");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("should return error for AADHAR numbers with invalid checksum", () => {
    const result = safeParseAadharNumber("111111111111");
    expect(result.success).toBe(false);
  });
});

describe("getAadharValidationError", () => {
  it("should return null for valid AADHAR numbers", () => {
    expect(getAadharValidationError("234123451235")).toBeNull();
    expect(getAadharValidationError("999999990019")).toBeNull();
    expect(getAadharValidationError("987654321096")).toBeNull();
  });

  it("should return null for null or undefined", () => {
    expect(getAadharValidationError(null)).toBeNull();
    expect(getAadharValidationError(undefined)).toBeNull();
  });

  it("should return error message for invalid AADHAR numbers", () => {
    const error1 = getAadharValidationError("12345678901");
    expect(error1).toBeTruthy();
    expect(error1).toContain("12");

    const error2 = getAadharValidationError("1234567890123");
    expect(error2).toBeTruthy();
    expect(error2).toContain("12");
  });

  it("should return error message for AADHAR numbers with invalid checksum", () => {
    const error = getAadharValidationError("111111111111");
    expect(error).toBeTruthy();
    expect(error).toContain("checksum");
  });

  it("should return error message for empty strings", () => {
    const error = getAadharValidationError("");
    expect(error).toBeTruthy();
    expect(error).toContain("12");
  });

  it("should return error message for strings with only whitespace", () => {
    const error = getAadharValidationError("   ");
    expect(error).toBeTruthy();
    expect(error).toContain("12");
  });
});
