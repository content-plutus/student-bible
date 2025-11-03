import { describe, it, expect } from "@jest/globals";
import {
  examAttemptSchema,
  examAttemptInsertSchema,
  examAttemptUpdateSchema,
  examAttemptPartialSchema,
} from "./exam-attempt";

describe("examAttemptSchema", () => {
  const validExamAttempt = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    student_certification_id: "123e4567-e89b-12d3-a456-426614174001",
    paper_code: "F1",
    attempt_date: "2024-06-01",
    result: "Pass",
    score: 75.5,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("should validate a valid exam attempt object", () => {
    const result = examAttemptSchema.safeParse(validExamAttempt);
    expect(result.success).toBe(true);
  });

  it("should reject empty paper_code", () => {
    const invalidExamAttempt = { ...validExamAttempt, paper_code: "" };
    const result = examAttemptSchema.safeParse(invalidExamAttempt);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const examAttemptWithNulls = {
      ...validExamAttempt,
      attempt_date: null,
      result: null,
      score: null,
    };
    const result = examAttemptSchema.safeParse(examAttemptWithNulls);
    expect(result.success).toBe(true);
  });

  it("should reject negative score", () => {
    const invalidExamAttempt = { ...validExamAttempt, score: -1 };
    const result = examAttemptSchema.safeParse(invalidExamAttempt);
    expect(result.success).toBe(false);
  });

  it("should reject score greater than 999.99", () => {
    const invalidExamAttempt = { ...validExamAttempt, score: 1000 };
    const result = examAttemptSchema.safeParse(invalidExamAttempt);
    expect(result.success).toBe(false);
  });

  it("should accept score of 0", () => {
    const validExamAttemptZero = { ...validExamAttempt, score: 0 };
    const result = examAttemptSchema.safeParse(validExamAttemptZero);
    expect(result.success).toBe(true);
  });

  it("should accept score of 999.99", () => {
    const validExamAttemptMax = { ...validExamAttempt, score: 999.99 };
    const result = examAttemptSchema.safeParse(validExamAttemptMax);
    expect(result.success).toBe(true);
  });

  it("should accept decimal scores", () => {
    const validExamAttemptDecimal = { ...validExamAttempt, score: 85.75 };
    const result = examAttemptSchema.safeParse(validExamAttemptDecimal);
    expect(result.success).toBe(true);
  });
});

describe("examAttemptInsertSchema", () => {
  const validInsert = {
    student_certification_id: "123e4567-e89b-12d3-a456-426614174001",
    paper_code: "F1",
    attempt_date: "2024-06-01",
    result: "Pass",
    score: 75.5,
    metadata: {},
  };

  it("should validate a valid insert object", () => {
    const result = examAttemptInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it("should reject object with id field", () => {
    const withId = { ...validInsert, id: "123e4567-e89b-12d3-a456-426614174000" };
    const result = examAttemptInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe("examAttemptUpdateSchema", () => {
  it("should allow partial updates", () => {
    const partialUpdate = { result: "Fail" };
    const result = examAttemptUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = examAttemptUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate fields that are provided", () => {
    const invalidUpdate = { score: -1 };
    const result = examAttemptUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("examAttemptPartialSchema", () => {
  it("should allow partial exam attempt object", () => {
    const partial = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      paper_code: "F1",
    };
    const result = examAttemptPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = examAttemptPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
