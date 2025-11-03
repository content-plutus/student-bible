import { z } from "zod";

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  session_date: z.string().date(),
  session_type: z.string().nullable(),
  attendance_status: z.string().min(1, "Attendance status is required"),
  engagement_score: z.number().int().min(0).max(10).nullable(),
  participation_notes: z.string().nullable(),
  extra_metrics: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const attendanceRecordInsertSchema = attendanceRecordSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const attendanceRecordUpdateSchema = attendanceRecordInsertSchema.partial();

export const attendanceRecordPartialSchema = attendanceRecordSchema.partial();

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type AttendanceRecordInsert = z.infer<typeof attendanceRecordInsertSchema>;
export type AttendanceRecordUpdate = z.infer<typeof attendanceRecordUpdateSchema>;
export type AttendanceRecordPartial = z.infer<typeof attendanceRecordPartialSchema>;
