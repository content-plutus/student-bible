import { describe, it, expect } from "@jest/globals";
import {
  studentAddressSchema,
  studentAddressInsertSchema,
  studentAddressUpdateSchema,
  studentAddressPartialSchema,
} from "./address";

describe("studentAddressSchema", () => {
  const validAddress = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    address_type: "residential",
    address_line1: "123 Main Street",
    address_line2: "Apt 4B",
    landmark: "Near Central Park",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400001",
    country: "India",
    additional_data: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("should validate a valid address object", () => {
    const result = studentAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it("should reject invalid postal code format", () => {
    const invalidAddress = { ...validAddress, postal_code: "12345" };
    const result = studentAddressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it("should reject postal code with non-numeric characters", () => {
    const invalidAddress = { ...validAddress, postal_code: "40000A" };
    const result = studentAddressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it("should reject empty address_line1", () => {
    const invalidAddress = { ...validAddress, address_line1: "" };
    const result = studentAddressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it("should reject empty city", () => {
    const invalidAddress = { ...validAddress, city: "" };
    const result = studentAddressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it("should reject empty state", () => {
    const invalidAddress = { ...validAddress, state: "" };
    const result = studentAddressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const addressWithNulls = {
      ...validAddress,
      address_line2: null,
    };
    const result = studentAddressSchema.safeParse(addressWithNulls);
    expect(result.success).toBe(true);
  });

  it("should allow null landmark for non-delivery address", () => {
    const residentialAddress = {
      ...validAddress,
      landmark: null,
    };
    const result = studentAddressSchema.safeParse(residentialAddress);
    expect(result.success).toBe(true);
  });

  it("should require landmark when address type is delivery", () => {
    const deliveryAddress = {
      ...validAddress,
      address_type: "delivery",
      landmark: null,
    };
    const result = studentAddressSchema.safeParse(deliveryAddress);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["landmark"]);
    }
  });

  it("should accept landmark when address type is delivery", () => {
    const deliveryAddress = {
      ...validAddress,
      address_type: "delivery",
      landmark: "Behind City Mall",
    };
    const result = studentAddressSchema.safeParse(deliveryAddress);
    expect(result.success).toBe(true);
  });

  it("should use default value for address_type", () => {
    const addressWithoutType = { ...validAddress };
    delete (addressWithoutType as Partial<typeof validAddress>).address_type;
    const result = studentAddressSchema.safeParse(addressWithoutType);
    expect(result.success).toBe(true);
  });

  it("should use default value for country", () => {
    const addressWithoutCountry = { ...validAddress };
    delete (addressWithoutCountry as Partial<typeof validAddress>).country;
    const result = studentAddressSchema.safeParse(addressWithoutCountry);
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from text fields", () => {
    const addressWithSpaces = {
      ...validAddress,
      address_line1: "  123 Main Street  ",
      city: "  Mumbai  ",
      state: "  Maharashtra  ",
    };
    const result = studentAddressSchema.safeParse(addressWithSpaces);
    expect(result.success).toBe(true);
  });
});

describe("studentAddressInsertSchema", () => {
  const validInsert = {
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    address_type: "residential",
    address_line1: "123 Main Street",
    address_line2: null,
    landmark: null,
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400001",
    country: "India",
    additional_data: {},
  };

  it("should validate a valid insert object", () => {
    const result = studentAddressInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it("should reject object with id field", () => {
    const withId = { ...validInsert, id: "123e4567-e89b-12d3-a456-426614174000" };
    const result = studentAddressInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe("studentAddressUpdateSchema", () => {
  it("should allow partial updates", () => {
    const partialUpdate = { city: "Delhi" };
    const result = studentAddressUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = studentAddressUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate fields that are provided", () => {
    const invalidUpdate = { postal_code: "12345" };
    const result = studentAddressUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("studentAddressPartialSchema", () => {
  it("should allow partial address object", () => {
    const partial = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      city: "Mumbai",
    };
    const result = studentAddressPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = studentAddressPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
