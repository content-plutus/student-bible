import { describe, it, expect } from "@jest/globals";
import {
  validatePhoneNumber,
  validateAadharNumber,
  validatePanNumber,
  validatePostalCode,
  validateEmail,
  validateDateRange,
  validateAge,
  normalizePhoneNumber,
  normalizeEmail,
  normalizeName,
  normalizeAadharNumber,
  normalizePanNumber,
} from "./validations";

describe("validatePhoneNumber", () => {
  it("should validate correct Indian phone numbers", () => {
    expect(validatePhoneNumber("9876543210")).toBe(true);
    expect(validatePhoneNumber("8765432109")).toBe(true);
    expect(validatePhoneNumber("7654321098")).toBe(true);
    expect(validatePhoneNumber("6543210987")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(validatePhoneNumber("1234567890")).toBe(false);
    expect(validatePhoneNumber("5876543210")).toBe(false);
    expect(validatePhoneNumber("987654321")).toBe(false);
    expect(validatePhoneNumber("98765432100")).toBe(false);
    expect(validatePhoneNumber("abcdefghij")).toBe(false);
  });
});

describe("validateAadharNumber", () => {
  it("should validate correct AADHAR numbers with valid Verhoeff checksum", () => {
    expect(validateAadharNumber("234123451235")).toBe(true);
    expect(validateAadharNumber("987654321096")).toBe(true);
    expect(validateAadharNumber("999999990019")).toBe(true);
  });

  it("should reject invalid AADHAR numbers", () => {
    expect(validateAadharNumber("12345678901")).toBe(false);
    expect(validateAadharNumber("1234567890123")).toBe(false);
    expect(validateAadharNumber("12345678901A")).toBe(false);
    expect(validateAadharNumber("abcdefghijkl")).toBe(false);
  });

  it("should reject AADHAR numbers with invalid Verhoeff checksum", () => {
    expect(validateAadharNumber("123456789012")).toBe(false);
    expect(validateAadharNumber("111111111111")).toBe(false);
    expect(validateAadharNumber("123456789010")).toBe(false);
  });
});

describe("validatePanNumber", () => {
  it("should validate correct PAN numbers", () => {
    expect(validatePanNumber("ABCDE1234F")).toBe(true);
    expect(validatePanNumber("XYZAB9876C")).toBe(true);
  });

  it("should reject invalid PAN numbers", () => {
    expect(validatePanNumber("abcde1234f")).toBe(false);
    expect(validatePanNumber("ABCD1234F")).toBe(false);
    expect(validatePanNumber("ABCDE12345")).toBe(false);
    expect(validatePanNumber("ABCDE1234")).toBe(false);
    expect(validatePanNumber("12345ABCDE")).toBe(false);
  });
});

describe("validatePostalCode", () => {
  it("should validate correct postal codes", () => {
    expect(validatePostalCode("400001")).toBe(true);
    expect(validatePostalCode("110001")).toBe(true);
  });

  it("should reject invalid postal codes", () => {
    expect(validatePostalCode("40001")).toBe(false);
    expect(validatePostalCode("4000011")).toBe(false);
    expect(validatePostalCode("40000A")).toBe(false);
    expect(validatePostalCode("abcdef")).toBe(false);
  });
});

describe("validateEmail", () => {
  it("should validate correct email addresses", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@domain.co.in")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("test@")).toBe(false);
  });
});

describe("validateDateRange", () => {
  it("should validate dates within range", () => {
    expect(validateDateRange("2000-01-01", 1950, 2030)).toBe(true);
    expect(validateDateRange(new Date("2020-06-15"), 1950, 2030)).toBe(true);
  });

  it("should reject dates outside range", () => {
    expect(validateDateRange("1940-01-01", 1950, 2030)).toBe(false);
    expect(validateDateRange("2040-01-01", 1950, 2030)).toBe(false);
  });
});

describe("validateAge", () => {
  it("should validate age >= 16", () => {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    expect(validateAge(eighteenYearsAgo, 16)).toBe(true);
  });

  it("should reject age < 16", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    expect(validateAge(tenYearsAgo, 16)).toBe(false);
  });
});

describe("normalizePhoneNumber", () => {
  it("should normalize phone numbers", () => {
    expect(normalizePhoneNumber("987-654-3210")).toBe("9876543210");
    expect(normalizePhoneNumber("+91 9876543210")).toBe("9876543210");
    expect(normalizePhoneNumber("(987) 654-3210")).toBe("9876543210");
  });
});

describe("normalizeEmail", () => {
  it("should normalize email addresses", () => {
    expect(normalizeEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
    expect(normalizeEmail("  user@domain.com  ")).toBe("user@domain.com");
  });
});

describe("normalizeName", () => {
  it("should normalize names to title case", () => {
    expect(normalizeName("john doe")).toBe("John Doe");
    expect(normalizeName("JANE SMITH")).toBe("Jane Smith");
    expect(normalizeName("  mary   jane  ")).toBe("Mary Jane");
  });
});

describe("normalizeAadharNumber", () => {
  it("should normalize AADHAR numbers", () => {
    expect(normalizeAadharNumber("1234-5678-9012")).toBe("123456789012");
    expect(normalizeAadharNumber("1234 5678 9012")).toBe("123456789012");
  });
});

describe("normalizePanNumber", () => {
  it("should normalize PAN numbers", () => {
    expect(normalizePanNumber("abcde1234f")).toBe("ABCDE1234F");
    expect(normalizePanNumber("ABCDE 1234 F")).toBe("ABCDE1234F");
  });
});
