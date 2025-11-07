export const VALID_TABLE_COLUMN_COMBINATIONS: Record<string, string[]> = {
  students: ["extra_fields"],
  student_addresses: ["additional_data"],
  student_certifications: ["custom_fields"],
  exam_attempts: ["metadata"],
  form_submissions: ["raw_data"],
  attendance_records: ["extra_metrics"],
  test_scores: ["analysis_data"],
  academic_info: ["extra_fields"],
};

export const VALID_TABLES = Object.keys(VALID_TABLE_COLUMN_COMBINATIONS);
