import { describe, it, expect } from "@jest/globals";
import {
  certificationStatusEnum,
  studentCertificationSchema,
  studentCertificationInsertSchema,
  studentCertificationUpdateSchema,
  studentCertificationPartialSchema,
} from "./student-certification";

describe("certificationStatusEnum", () => {
  it("should accept valid status values", () => {
    expect(certificationStatusEnum.safeParse("planned").success).toBe(true);
    expect(certificationStatusEnum.safeParse("in_progress").success).toBe(true);
    expect(certificationStatusEnum.safeParse("completed").success).toBe(true);
    expect(certificationStatusEnum.safeParse("on_hold").success).toBe(true);
    expect(certificationStatusEnum.safeParse("dropped").success).toBe(true);
  });

  it("should reject invalid status values", () => {
    expect(certificationStatusEnum.safeParse("invalid").success).toBe(false);
    expect(certificationStatusEnum.safeParse("pending").success).toBe(false);
  });
});

describe("studentCertificationSchema", () => {
  const validStudentCertification = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    certification_id: "123e4567-e89b-12d3-a456-426614174002",
    enrollment_date: "2024-01-01",
    status: "in_progress" as const,
    progress_papers_completed: 5,
    total_papers_target: 13,
    batch_code: "ACCA_FND_SecA_1_M",
    projected_exam: "2025-06-01",
    custom_fields: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("should validate a valid student certification object", () => {
    const result = studentCertificationSchema.safeParse(validStudentCertification);
    expect(result.success).toBe(true);
  });

  it("should accept null for optional fields", () => {
    const certificationWithNulls = {
      ...validStudentCertification,
      enrollment_date: null,
      total_papers_target: null,
      projected_exam: null,
    };
    const result = studentCertificationSchema.safeParse(certificationWithNulls);
    expect(result.success).toBe(true);
  });

  it("should reject negative progress_papers_completed", () => {
    const invalidCertification = { ...validStudentCertification, progress_papers_completed: -1 };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should reject negative total_papers_target", () => {
    const invalidCertification = { ...validStudentCertification, total_papers_target: -1 };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should reject non-integer progress_papers_completed", () => {
    const invalidCertification = { ...validStudentCertification, progress_papers_completed: 5.5 };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should reject non-integer total_papers_target", () => {
    const invalidCertification = { ...validStudentCertification, total_papers_target: 13.5 };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should allow missing batch code", () => {
    const certification = { ...validStudentCertification };
    delete certification.batch_code;
    const result = studentCertificationSchema.safeParse(certification);
    expect(result.success).toBe(true);
  });

  it("should reject batch code that is blank after trim", () => {
    const invalidCertification = { ...validStudentCertification, batch_code: "   " };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should reject batch code that does not match expected pattern", () => {
    const invalidCertification = { ...validStudentCertification, batch_code: "INVALID" };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });

  it("should enforce expected prefix when provided", () => {
    const certification = {
      ...validStudentCertification,
      batch_code: "CMA_PART1_Batch_3_E",
      custom_fields: { batch_prefix: "CMA" },
    };
    const result = studentCertificationSchema.safeParse(certification);
    expect(result.success).toBe(true);

    const mismatched = {
      ...certification,
      batch_code: "ACCA_PART1_Batch_3_E",
    };
    const mismatchResult = studentCertificationSchema.safeParse(mismatched);
    expect(mismatchResult.success).toBe(false);
  });

  it("should enforce expected identifier when provided", () => {
    const certification = {
      ...validStudentCertification,
      batch_code: "CMA_PART1_Batch_3_E",
      custom_fields: { batch_identifier: "PART1" },
    };
    const result = studentCertificationSchema.safeParse(certification);
    expect(result.success).toBe(true);

    const mismatched = {
      ...certification,
      batch_code: "CMA_PART2_Batch_3_E",
    };
    const mismatchResult = studentCertificationSchema.safeParse(mismatched);
    expect(mismatchResult.success).toBe(false);
  });

  it("should use default value for status", () => {
    const certificationWithoutStatus = { ...validStudentCertification };
    delete (certificationWithoutStatus as Partial<typeof validStudentCertification>).status;
    const result = studentCertificationSchema.safeParse(certificationWithoutStatus);
    expect(result.success).toBe(true);
  });

  it("should use default value for progress_papers_completed", () => {
    const certificationWithoutProgress = { ...validStudentCertification };
    delete (certificationWithoutProgress as Partial<typeof validStudentCertification>)
      .progress_papers_completed;
    const result = studentCertificationSchema.safeParse(certificationWithoutProgress);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const invalidCertification = { ...validStudentCertification, status: "invalid" };
    const result = studentCertificationSchema.safeParse(invalidCertification);
    expect(result.success).toBe(false);
  });
});

describe("studentCertificationInsertSchema", () => {
  const validInsert = {
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    certification_id: "123e4567-e89b-12d3-a456-426614174002",
    enrollment_date: "2024-01-01",
    status: "in_progress" as const,
    progress_papers_completed: 5,
    total_papers_target: 13,
    projected_exam: "2025-06-01",
    custom_fields: {},
  };

  it("should validate a valid insert object", () => {
    const result = studentCertificationInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it("should reject object with id field", () => {
    const withId = { ...validInsert, id: "123e4567-e89b-12d3-a456-426614174000" };
    const result = studentCertificationInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe("studentCertificationUpdateSchema", () => {
  it("should allow partial updates", () => {
    const partialUpdate = { progress_papers_completed: 6 };
    const result = studentCertificationUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = studentCertificationUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate fields that are provided", () => {
    const invalidUpdate = { progress_papers_completed: -1 };
    const result = studentCertificationUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("studentCertificationPartialSchema", () => {
  it("should allow partial student certification object", () => {
    const partial = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      progress_papers_completed: 5,
    };
    const result = studentCertificationPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = studentCertificationPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
