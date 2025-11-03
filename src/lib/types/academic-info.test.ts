import { describe, it, expect } from "@jest/globals";
import {
  academicInfoSchema,
  academicInfoInsertSchema,
  academicInfoUpdateSchema,
  academicInfoPartialSchema,
} from "./academic-info";

describe("academicInfoSchema", () => {
  const currentYear = new Date().getFullYear();
  const validAcademicInfo = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    highest_education_level: "Bachelor",
    college_name: "Mumbai University",
    university_name: "University of Mumbai",
    major_subject: "Commerce",
    passing_year: 2020,
    stream_12th: "Commerce",
    grades: { "10th": "85%", "12th": "90%" },
    extra_fields: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("should validate a valid academic info object", () => {
    const result = academicInfoSchema.safeParse(validAcademicInfo);
    expect(result.success).toBe(true);
  });

  it("should accept null for optional fields", () => {
    const academicInfoWithNulls = {
      ...validAcademicInfo,
      highest_education_level: null,
      college_name: null,
      university_name: null,
      major_subject: null,
      passing_year: null,
      stream_12th: null,
      grades: null,
    };
    const result = academicInfoSchema.safeParse(academicInfoWithNulls);
    expect(result.success).toBe(true);
  });

  it("should reject passing year before 1950", () => {
    const invalidAcademicInfo = { ...validAcademicInfo, passing_year: 1949 };
    const result = academicInfoSchema.safeParse(invalidAcademicInfo);
    expect(result.success).toBe(false);
  });

  it("should reject passing year more than 5 years in future", () => {
    const invalidAcademicInfo = { ...validAcademicInfo, passing_year: currentYear + 6 };
    const result = academicInfoSchema.safeParse(invalidAcademicInfo);
    expect(result.success).toBe(false);
  });

  it("should accept passing year exactly 5 years in future", () => {
    const validAcademicInfoFuture = { ...validAcademicInfo, passing_year: currentYear + 5 };
    const result = academicInfoSchema.safeParse(validAcademicInfoFuture);
    expect(result.success).toBe(true);
  });

  it("should accept passing year exactly 1950", () => {
    const validAcademicInfoOld = { ...validAcademicInfo, passing_year: 1950 };
    const result = academicInfoSchema.safeParse(validAcademicInfoOld);
    expect(result.success).toBe(true);
  });

  it("should reject non-integer passing year", () => {
    const invalidAcademicInfo = { ...validAcademicInfo, passing_year: 2020.5 };
    const result = academicInfoSchema.safeParse(invalidAcademicInfo);
    expect(result.success).toBe(false);
  });

  it("should trim whitespace from text fields", () => {
    const academicInfoWithSpaces = {
      ...validAcademicInfo,
      college_name: "  Mumbai University  ",
      university_name: "  University of Mumbai  ",
      major_subject: "  Commerce  ",
    };
    const result = academicInfoSchema.safeParse(academicInfoWithSpaces);
    expect(result.success).toBe(true);
  });

  it("should fallback unknown stream_12th to 'Other'", () => {
    const parsed = academicInfoSchema.parse({ ...validAcademicInfo, stream_12th: "Vocational" });
    expect(parsed.stream_12th).toBe("Other");
  });

  it("should normalize stream_12th casing", () => {
    const parsed = academicInfoSchema.parse({ ...validAcademicInfo, stream_12th: "science" });
    expect(parsed.stream_12th).toBe("Science");
  });
});

describe("academicInfoInsertSchema", () => {
  const validInsert = {
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    highest_education_level: "Bachelor",
    college_name: "Mumbai University",
    university_name: "University of Mumbai",
    major_subject: "Commerce",
    passing_year: 2020,
    stream_12th: "Commerce",
    grades: { "10th": "85%", "12th": "90%" },
    extra_fields: {},
  };

  it("should validate a valid insert object", () => {
    const result = academicInfoInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it("should reject object with id field", () => {
    const withId = { ...validInsert, id: "123e4567-e89b-12d3-a456-426614174000" };
    const result = academicInfoInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe("academicInfoUpdateSchema", () => {
  it("should allow partial updates", () => {
    const partialUpdate = { passing_year: 2021 };
    const result = academicInfoUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = academicInfoUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate fields that are provided", () => {
    const currentYear = new Date().getFullYear();
    const invalidUpdate = { passing_year: currentYear + 6 };
    const result = academicInfoUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("academicInfoPartialSchema", () => {
  it("should allow partial academic info object", () => {
    const partial = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      passing_year: 2020,
    };
    const result = academicInfoPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = academicInfoPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
