import { describe, it, expect } from "@jest/globals";
import {
  attendanceRecordSchema,
  attendanceRecordInsertSchema,
  attendanceRecordUpdateSchema,
  attendanceRecordPartialSchema,
} from "./attendance-record";

describe("attendanceRecordSchema", () => {
  const validAttendanceRecord = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    session_date: "2024-01-15",
    session_type: "Lecture",
    attendance_status: "Present",
    engagement_score: 8,
    participation_notes: "Active participation in discussions",
    extra_metrics: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("should validate a valid attendance record object", () => {
    const result = attendanceRecordSchema.safeParse(validAttendanceRecord);
    expect(result.success).toBe(true);
  });

  it("should reject empty attendance_status", () => {
    const invalidAttendanceRecord = { ...validAttendanceRecord, attendance_status: "" };
    const result = attendanceRecordSchema.safeParse(invalidAttendanceRecord);
    expect(result.success).toBe(false);
  });

  it("should accept null for optional fields", () => {
    const attendanceRecordWithNulls = {
      ...validAttendanceRecord,
      session_type: null,
      engagement_score: null,
      participation_notes: null,
    };
    const result = attendanceRecordSchema.safeParse(attendanceRecordWithNulls);
    expect(result.success).toBe(true);
  });

  it("should reject engagement_score less than 0", () => {
    const invalidAttendanceRecord = { ...validAttendanceRecord, engagement_score: -1 };
    const result = attendanceRecordSchema.safeParse(invalidAttendanceRecord);
    expect(result.success).toBe(false);
  });

  it("should reject engagement_score greater than 10", () => {
    const invalidAttendanceRecord = { ...validAttendanceRecord, engagement_score: 11 };
    const result = attendanceRecordSchema.safeParse(invalidAttendanceRecord);
    expect(result.success).toBe(false);
  });

  it("should accept engagement_score of 0", () => {
    const validAttendanceRecordZero = { ...validAttendanceRecord, engagement_score: 0 };
    const result = attendanceRecordSchema.safeParse(validAttendanceRecordZero);
    expect(result.success).toBe(true);
  });

  it("should accept engagement_score of 10", () => {
    const validAttendanceRecordMax = { ...validAttendanceRecord, engagement_score: 10 };
    const result = attendanceRecordSchema.safeParse(validAttendanceRecordMax);
    expect(result.success).toBe(true);
  });

  it("should reject non-integer engagement_score", () => {
    const invalidAttendanceRecord = { ...validAttendanceRecord, engagement_score: 8.5 };
    const result = attendanceRecordSchema.safeParse(invalidAttendanceRecord);
    expect(result.success).toBe(false);
  });
});

describe("attendanceRecordInsertSchema", () => {
  const validInsert = {
    student_id: "123e4567-e89b-12d3-a456-426614174001",
    session_date: "2024-01-15",
    session_type: "Lecture",
    attendance_status: "Present",
    engagement_score: 8,
    participation_notes: "Active participation in discussions",
    extra_metrics: {},
  };

  it("should validate a valid insert object", () => {
    const result = attendanceRecordInsertSchema.safeParse(validInsert);
    expect(result.success).toBe(true);
  });

  it("should reject object with id field", () => {
    const withId = { ...validInsert, id: "123e4567-e89b-12d3-a456-426614174000" };
    const result = attendanceRecordInsertSchema.safeParse(withId);
    expect(result.success).toBe(false);
  });
});

describe("attendanceRecordUpdateSchema", () => {
  it("should allow partial updates", () => {
    const partialUpdate = { attendance_status: "Absent" };
    const result = attendanceRecordUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = attendanceRecordUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate fields that are provided", () => {
    const invalidUpdate = { engagement_score: 11 };
    const result = attendanceRecordUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("attendanceRecordPartialSchema", () => {
  it("should allow partial attendance record object", () => {
    const partial = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      attendance_status: "Present",
    };
    const result = attendanceRecordPartialSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it("should allow empty object", () => {
    const result = attendanceRecordPartialSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
