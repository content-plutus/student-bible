# JSONB Functions Guide

This guide documents the JSONB helper functions available in the Student Bible database for working with flexible schema fields.

## Overview

The Student Bible uses JSONB columns to support schema flexibility without requiring frequent migrations. The following tables have JSONB columns:

- `students.extra_fields` - Unmapped student-specific fields
- `student_addresses.additional_data` - Extra address information
- `student_certifications.custom_fields` - Certification-specific data
- `academic_info.extra_fields` - Academic information extensions
- `exam_attempts.metadata` - Exam-specific metadata
- `attendance_records.extra_metrics` - Attendance tracking extensions
- `test_scores.analysis_data` - Test score analytics
- `form_submissions.raw_data` - Complete form submission data

## Generic JSONB Functions

### `jsonb_deep_merge(target jsonb, source jsonb) → jsonb`

Recursively merges two JSONB objects. Nested objects are merged recursively, with source values overwriting target values.

**Example:**

```sql
SELECT jsonb_deep_merge(
    '{"a": {"b": 1, "c": 2}, "d": 3}'::jsonb,
    '{"a": {"c": 99, "e": 4}, "f": 5}'::jsonb
);
-- Result: {"a": {"b": 1, "c": 99, "e": 4}, "d": 3, "f": 5}
```

**Use Cases:**

- Updating nested configuration objects
- Merging form data with existing records
- Applying partial updates to complex JSONB structures

## Students Table Functions

### `students_get_extra_field(student_id uuid, field_key text) → jsonb`

Retrieves a specific field from a student's `extra_fields` column.

**Example:**

```sql
SELECT students_get_extra_field(
    '123e4567-e89b-12d3-a456-426614174000',
    'batch_code'
);
-- Returns: "ACCA_2024_Batch_5"
```

### `students_has_extra_field(student_id uuid, field_key text) → boolean`

Checks if a specific field exists in a student's `extra_fields` column.

**Example:**

```sql
SELECT students_has_extra_field(
    '123e4567-e89b-12d3-a456-426614174000',
    'batch_code'
);
-- Returns: true or false
```

### `students_update_extra_fields(student_id uuid, patch jsonb, strip_nulls boolean) → jsonb`

Atomically updates a student's `extra_fields` by merging a patch object. Optionally strips null values.

**Security:** This function uses `SECURITY DEFINER` and is restricted to `service_role` users only.

**Concurrency:** This function uses an atomic single-statement UPDATE to eliminate race conditions. Multiple concurrent updates to different keys will all be preserved. If two updates modify the same key concurrently, last-writer-wins for that specific key.

**Validation:** The patch parameter must be a JSON object (not an array or scalar). Passing null or non-object values will raise an exception.

**Example:**

```sql
SELECT students_update_extra_fields(
    '123e4567-e89b-12d3-a456-426614174000',
    '{"batch_code": "ACCA_2024_Batch_6", "mentor_assigned": true}'::jsonb,
    true  -- strip nulls
);
-- Returns the updated extra_fields object
```

**Use Cases:**

- Adding new fields discovered from form submissions
- Updating certification-specific information
- Storing temporary workflow state

**Concurrency Example:**

```sql
-- Session 1 and Session 2 execute simultaneously:
-- Session 1: UPDATE student SET extra_fields = merge(current, {"key1": "value1"})
-- Session 2: UPDATE student SET extra_fields = merge(current, {"key2": "value2"})
-- Result: Both key1 and key2 are present in final extra_fields (no data loss)

-- If both sessions update the same key:
-- Session 1: UPDATE student SET extra_fields = merge(current, {"key": "value1"})
-- Session 2: UPDATE student SET extra_fields = merge(current, {"key": "value2"})
-- Result: Whichever transaction commits last wins (last-writer-wins for same key)
```

### `search_students_by_extra(field_key text, field_value jsonb) → setof students`

Searches for students where `extra_fields` contains the specified key-value pair. Uses GIN index for performance.

**Example:**

```sql
SELECT id, first_name, last_name, extra_fields
FROM search_students_by_extra('batch_code', '"ACCA_2024_Batch_5"'::jsonb);
```

**Note:** String values must be JSON-encoded (wrapped in quotes).

## Student Addresses Functions

### `addresses_get_additional_field(address_id uuid, field_key text) → jsonb`

Retrieves a specific field from an address's `additional_data` column.

### `addresses_has_additional_field(address_id uuid, field_key text) → boolean`

Checks if a specific field exists in an address's `additional_data` column.

### `addresses_update_additional_data(address_id uuid, patch jsonb, strip_nulls boolean) → jsonb`

Atomically updates an address's `additional_data` by merging a patch object.

**Security:** This function uses `SECURITY DEFINER` and is restricted to `service_role` users only.

**Concurrency:** Uses atomic single-statement UPDATE to prevent lost updates. Same concurrency semantics as `students_update_extra_fields()`.

**Validation:** The patch parameter must be a JSON object.

## Best Practices

### When to Use JSONB vs Table Columns

**Use JSONB for:**

- Fields that vary by certification type
- Temporary or experimental fields
- Data from external sources with unknown schema
- Fields that appear in less than 20% of records

**Use table columns for:**

- Frequently queried fields
- Fields requiring complex constraints
- Core business logic fields
- Fields needed for joins or aggregations

### Performance Considerations

1. **GIN Indexes:** All JSONB columns have GIN indexes using `jsonb_path_ops` operator class, optimized for containment queries (`@>`).

2. **Query Patterns:**
   - Use `@>` for containment: `extra_fields @> '{"key": "value"}'`
   - Use `?` for key existence: `extra_fields ? 'key'`
   - Use `->` for field access: `extra_fields -> 'key'`
   - Use `->>` for text extraction: `extra_fields ->> 'key'`

3. **Avoid:**
   - Full JSONB scans without indexes
   - Frequent updates to large JSONB objects (consider normalization)
   - Storing large binary data in JSONB

### Security Model

**Read Functions (SECURITY INVOKER):**

- Respect Row Level Security (RLS) policies
- Available to `authenticated` role
- Safe for client-side use

**Write Functions (SECURITY DEFINER):**

- Bypass RLS (run as function owner)
- Restricted to `service_role` only
- Should only be called from trusted backend code

## Schema Evolution Workflow

When adding new fields to the system:

1. **Collect Data:** New form fields automatically go into JSONB columns
2. **Analyze Usage:** Monitor which fields are frequently used
3. **Decide:** If a field is used in >20% of records, consider promoting to a table column
4. **Migrate:** Create a migration to add the column and backfill from JSONB
5. **Clean Up:** Optionally remove the field from JSONB after migration

## Examples

### Adding a New Field from Form Submission

```sql
-- Form submission contains a new field "preferred_contact_time"
SELECT students_update_extra_fields(
    student_id,
    jsonb_build_object('preferred_contact_time', 'evening'),
    true
);
```

### Searching for Students with Specific Attributes

```sql
-- Find all students in a specific batch
SELECT * FROM search_students_by_extra('batch_code', '"ACCA_2024_Batch_5"'::jsonb);

-- Find students with a specific mentor
SELECT * FROM search_students_by_extra('mentor_id', '42'::jsonb);
```

### Merging Complex Nested Data

```sql
-- Update nested configuration
SELECT students_update_extra_fields(
    student_id,
    '{"preferences": {"notifications": {"email": true, "sms": false}}}'::jsonb,
    true
);
```

## Migration Reference

- **Task 2.18 (Initial):** `20251102145943_jsonb_helpers.sql` - Basic merge and strip functions
- **Task 2.18 (Enhanced):** `20251102165941_enhanced_jsonb_functions.sql` - Comprehensive query and update functions

## Related Documentation

- [Schema Extension Guide](schema-extension-guide.md) - Decision tree for adding new fields
- [Field Addition Workflow](field-addition-workflow.md) - Step-by-step process for schema changes
- [Database Schema](schema/) - Complete schema documentation
