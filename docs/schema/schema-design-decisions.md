# Schema Design Decisions and JSONB Usage Patterns

## Overview

This document explains the database schema design for Student Bible and the rationale behind key architectural choices. It complements [docs/jsonb-functions-guide.md](../jsonb-functions-guide.md) by describing **why** the schema is organized this way, **where** JSONB is used, and **how** to evolve the schema safely as new fields emerge from forms or external sources.

For concrete DDL definitions, refer to the migration files in `supabase/migrations/`.

## Design Objectives

1. **Single Source of Truth**: Centralize all student data across enrollment, mentorship, exams, attendance, tests, and certification outcomes
2. **Schema Flexibility**: Accommodate new fields without blocking on migrations by defaulting to JSONB extensions
3. **Data Quality**: Enforce constraints for phone numbers, email, identifiers (AADHAR, PAN), and sensible ranges
4. **Query Performance**: Use generated columns, indexes (including GIN for JSONB), and materialized views for fast reads
5. **Security**: Row Level Security (RLS) with careful separation of read vs privileged write operations

## Entity Overview and Design Rationale

### Core Tables

#### `students` (20251102143938_students_table.sql)

**Purpose**: Core student profile with identification and contact information.

**Key Design Decisions**:

- Uses `citext` for email to enable case-insensitive lookups
- `extra_fields JSONB` holds unmapped or emerging attributes without schema changes
- Validation constraints enforce Indian phone format (`^[6-9][0-9]{9}$`), AADHAR (12 digits), PAN format
- Unique indexes on `phone_number`, `email`, and `aadhar_number` (where not null) support fast canonical lookups
- Generated column `full_name` (see 20251102145835_generated_columns.sql) provides uniform display name

**Additional Constraints** (20251102145209_students_constraints.sql):

- Gender: `Male`, `Female`, `Others`
- Minimum age: 16 years (calculated from `date_of_birth`)
- Date of birth range: 1950-01-01 to 2010-12-31

#### `student_addresses` (20251102144418_addresses_table.sql)

**Purpose**: Delivery and correspondence addresses for book shipments and communications.

**Key Design Decisions**:

- `additional_data JSONB` captures miscellaneous address metadata (landmarks, delivery instructions)
- Postal code validation for Indian 6-digit format
- Foreign key to `students` with `ON DELETE CASCADE` for data integrity
- Indexed on `student_id` and `address_type` for efficient queries

#### `certifications` (20251102144554_certifications.sql)

**Purpose**: Master list of certification programs (ACCA, US CMA, CFA, US CPA).

**Key Design Decisions**:

- Relatively stable metadata (low volatility)
- `code` field is unique for canonical program identification
- `metadata JSONB` for certification-specific details (exam sequence, weightage)
- `total_papers` field supports progress calculations

#### `student_certifications` (20251102144616_student_certifications.sql)

**Purpose**: Junction table linking students to certification enrollments with progress tracking.

**Key Design Decisions**:

- Custom enum type `certification_status`: `planned`, `in_progress`, `completed`, `on_hold`, `dropped`
- `custom_fields JSONB` for program-specific attributes (batch codes, milestones)
- Generated column `progress_percentage` (20251102145835_generated_columns.sql) auto-calculates completion: `(progress_papers_completed / total_papers_target) * 100`
- Unique constraint on `(student_id, certification_id)` prevents duplicate enrollments

#### `academic_info` (20251102144637_academic_info.sql)

**Purpose**: Educational background and academic history.

**Key Design Decisions**:

- `extra_fields JSONB` accommodates varying education systems
- `grades JSONB` stores flexible grade structures
- Passing year validation: between 1950 and current year + 5
- Stream validation for 12th standard: `Commerce`, `Arts`, `Science`, `Other`
- Unique index on `student_id` (one academic record per student)

#### `exam_attempts` (20251102144656_exam_attempts.sql)

**Purpose**: Individual exam attempt records with results.

**Key Design Decisions**:

- `metadata JSONB` holds exam-specific context (mock performance, feedback, paper variations)
- Foreign key to `student_certifications` links attempts to specific enrollments
- Indexed on `student_certification_id` and `paper_code` for efficient queries

#### `form_submissions` (20251102144714_form_submissions.sql)

**Purpose**: Raw ingestion table preserving complete Google Form payloads.

**Key Design Decisions**:

- `raw_data JSONB` stores entire form submission for audit trails and reprocessing
- `processed` boolean flag tracks processing status
- Optional foreign key to `students` (can be null for unmatched submissions)
- Enables data reconciliation and recovery without data loss

#### `attendance_records` (20251102144736_attendance_records.sql)

**Purpose**: Class attendance and engagement tracking.

**Key Design Decisions**:

- `engagement_score` integer (0-10 range) quantifies participation
- `extra_metrics JSONB` captures flexible participation signals from LMS or future sources
- Indexed on `student_id` and `session_date` for time-series queries

#### `test_scores` (20251102144856_test_scores.sql)

**Purpose**: Assessment results and performance analytics.

**Key Design Decisions**:

- `analysis_data JSONB` supports enhanced analytics (score breakdowns, topic performance)
- Separate fields for `score`, `max_score`, and `weighted_score` enable flexible grading
- Indexed on `student_id` and `assessment_name`

### Supporting Infrastructure

#### Materialized Views (20251102145643_student_progress_views.sql)

**`student_progress_summary`**: Precomputed certification progress summaries.

**Design Rationale**:

- Joins `student_certifications` with `certifications` to calculate completion percentages
- Unique index on `(student_id, certification_id)` enables fast lookups
- Reduces application-side computation and standardizes progress calculations
- Requires periodic refresh (manual or scheduled) to stay current

#### Indexes (20251102145408_students_indexes.sql)

**GIN Indexes on JSONB**: All JSONB columns use `jsonb_path_ops` operator class, optimized for containment queries (`@>`).

**Full-Text Search**: `pg_trgm` extension enables trigram-based search on student names using `gin_trgm_ops`.

**Performance Considerations**:

- GIN indexes support fast JSONB containment and key existence checks
- Trade-off: larger index size and slower writes for faster reads
- Appropriate for read-heavy workloads with infrequent JSONB updates

#### Constraints and Validation (20251102145209_students_constraints.sql, 20251102145744_unique_constraints.sql)

**Unique Constraints with `NULLS NOT DISTINCT`**: Applied to `email`, `aadhar_number`, and `pan_number`.

**Rationale**: PostgreSQL 15+ feature ensures NULL values are treated as equal for uniqueness, preventing multiple NULL entries while allowing optional fields.

**CHECK Constraints**: Enforce data quality at the database level (phone formats, age ranges, enum values).

#### Timestamps and Triggers (20251102145921_timestamp_triggers.sql)

**`set_updated_at()` Function**: Automatically updates `updated_at` column on every row modification.

**Design Rationale**:

- Ensures accurate write-time bookkeeping without application-side logic
- Applied to all tables via `BEFORE UPDATE` triggers
- Prevents stale timestamps from manual updates

#### Row Level Security (20251102145511_students_rls.sql)

**Current Posture**: Read-only access for all authenticated users.

**Policy**: `"Allow read access to all roles"` with `using (true)` on all tables.

**Future Evolution**: Write policies will be added as user roles and permissions are defined.

#### JSONB Helper Functions (20251102165941_enhanced_jsonb_functions.sql, 20251102191214_fix_jsonb_update_concurrency.sql)

**Security Model**:

- **Read Functions** (`SECURITY INVOKER`): Respect RLS, available to `authenticated` role
  - `students_get_extra_field()`, `students_has_extra_field()`, `search_students_by_extra()`
  - `addresses_get_additional_field()`, `addresses_has_additional_field()`
- **Write Functions** (`SECURITY DEFINER`): Bypass RLS, restricted to `service_role` only
  - `students_update_extra_fields()`, `addresses_update_additional_data()`

**Concurrency Handling**: Atomic single-statement UPDATE eliminates race conditions. Multiple concurrent updates to different keys are preserved; same-key updates follow last-writer-wins semantics.

## JSONB Usage Patterns

### When to Use JSONB vs Table Columns

**Use JSONB for**:

- Fields that vary by certification type or context
- Temporary or experimental fields during feature development
- Data from external sources with unknown or evolving schemas
- Fields appearing in less than 20% of records
- Nested or hierarchical data structures

**Use table columns for**:

- Frequently queried fields (used in WHERE, JOIN, ORDER BY)
- Fields requiring complex constraints or foreign keys
- Core business logic fields central to application functionality
- Fields needed for aggregations or reporting
- Fields with high cardinality requiring specialized indexes

### JSONB Columns in Student Bible

| Table                    | JSONB Column      | Purpose                                                   |
| ------------------------ | ----------------- | --------------------------------------------------------- |
| `students`               | `extra_fields`    | Unmapped student-specific attributes                      |
| `student_addresses`      | `additional_data` | Extra address information (landmarks, delivery notes)     |
| `certifications`         | `metadata`        | Certification-specific details (exam sequence, weightage) |
| `student_certifications` | `custom_fields`   | Program-specific metadata (batch codes, milestones)       |
| `academic_info`          | `extra_fields`    | Academic extensions, `grades` for flexible grading        |
| `exam_attempts`          | `metadata`        | Exam-specific context (mock performance, feedback)        |
| `form_submissions`       | `raw_data`        | Complete form payload preservation                        |
| `attendance_records`     | `extra_metrics`   | Engagement data extensions                                |
| `test_scores`            | `analysis_data`   | Score analytics and breakdowns                            |

### Query Patterns

**Containment** (`@>`): Check if JSONB contains key-value pair

```sql
SELECT * FROM students WHERE extra_fields @> '{"batch_code": "ACCA_2024_Batch_5"}';
```

**Key Existence** (`?`): Check if key exists

```sql
SELECT * FROM students WHERE extra_fields ? 'mentor_assigned';
```

**Field Access** (`->`, `->>`): Extract field value

```sql
SELECT extra_fields -> 'batch_code' FROM students;  -- Returns JSONB
SELECT extra_fields ->> 'batch_code' FROM students; -- Returns text
```

**Helper Functions**: Use provided functions for safe, consistent access

```sql
SELECT students_get_extra_field(student_id, 'batch_code');
SELECT * FROM search_students_by_extra('batch_code', '"ACCA_2024_Batch_5"'::jsonb);
```

### Update Patterns

**Always use helper functions** for JSONB updates to ensure:

- Deep merging of nested objects
- Atomic operations preventing race conditions
- Proper null handling
- Consistent security model

```sql
-- Update via helper function (server-side only, requires service_role)
SELECT students_update_extra_fields(
    student_id,
    '{"batch_code": "ACCA_2024_Batch_6", "mentor_assigned": true}'::jsonb,
    true  -- strip nulls
);
```

## Schema Evolution Workflow

### System-Level Process

1. **Ingest**: New fields arrive via Google Forms or external integrations and land in JSONB columns
   - `form_submissions.raw_data` preserves complete payloads
   - Processing logic extracts known fields to table columns, unknown fields to JSONB

2. **Observe**: Monitor field usage and query patterns
   - Track which JSONB fields are frequently accessed
   - Identify fields used in filtering, sorting, or aggregations
   - Measure query performance on JSONB vs column access

3. **Decide**: Apply promotion criteria
   - Field appears in >20% of records
   - Field is frequently queried or used in business logic
   - Field requires constraints, foreign keys, or specialized indexes
   - Field is central to reporting or analytics

4. **Migrate**: Promote field to table column
   - Create migration adding column (nullable initially for backward compatibility)
   - Backfill from JSONB: `UPDATE students SET new_column = (extra_fields ->> 'field_key') WHERE extra_fields ? 'field_key'`
   - Add indexes and constraints as needed
   - Update application code to use new column

5. **Stabilize**: Transition period
   - Application reads from column first, falls back to JSONB during transition
   - Validation and APIs updated to use promoted column
   - Optionally remove field from JSONB after full migration

### Example: Promoting a Field

```sql
-- Step 1: Add column (nullable for backward compatibility)
ALTER TABLE students ADD COLUMN batch_code TEXT;

-- Step 2: Backfill from JSONB
UPDATE students
SET batch_code = extra_fields ->> 'batch_code'
WHERE extra_fields ? 'batch_code' AND batch_code IS NULL;

-- Step 3: Add index if needed
CREATE INDEX students_batch_code_idx ON students (batch_code);

-- Step 4: Add constraint if needed
ALTER TABLE students ADD CONSTRAINT students_batch_code_format
    CHECK (batch_code IS NULL OR batch_code ~ '^[A-Z]+_[0-9]{4}_Batch_[0-9]+$');

-- Step 5: (Optional) Remove from JSONB after transition
UPDATE students SET extra_fields = extra_fields - 'batch_code';
```

## Performance Considerations

### Generated Columns

- **`students.full_name`**: Computed on write, stored for fast reads
- **`student_certifications.progress_percentage`**: Auto-calculated from progress fields
- **Trade-off**: Slight write overhead for significant read performance gains

### Materialized Views

- **`student_progress_summary`**: Precomputed joins and calculations
- **Refresh Strategy**: Manual refresh or scheduled job (not auto-refreshed)
- **Use Case**: Dashboard summaries, reporting, analytics

### JSONB Indexing

- **GIN indexes** with `jsonb_path_ops`: Optimized for containment queries
- **Index Size**: Larger than B-tree indexes, but essential for JSONB performance
- **Query Planning**: PostgreSQL uses GIN indexes for `@>` and `?` operators

### Avoiding Anti-Patterns

- **Don't**: Perform full JSONB scans without indexes
- **Don't**: Store large binary data in JSONB (use separate blob storage)
- **Don't**: Frequently update large JSONB objects (consider normalization)
- **Do**: Use helper functions for consistent, safe JSONB operations
- **Do**: Monitor query performance and promote heavily-used fields

## Security Model

### Row Level Security (RLS)

- **Current State**: Read-only access for all authenticated users
- **Future**: Write policies will be added based on user roles (admin, mentor, student)

### Function Privileges

- **Read Functions**: `SECURITY INVOKER`, respect RLS, granted to `authenticated`
- **Write Functions**: `SECURITY DEFINER`, bypass RLS, granted to `service_role` only
- **Rationale**: Controlled write path through trusted backend code prevents unauthorized modifications

### Best Practices

- Client-side code should only call read functions
- Write functions must be invoked server-side with `service_role` credentials
- Never expose `service_role` key to client applications

## Operational Considerations

### Data Consistency

- Generated columns reduce application-side logic and ensure uniform calculations
- Triggers maintain accurate timestamps without manual intervention
- Constraints enforce data quality at the database level

### Backward Compatibility

- New columns should be nullable initially to support existing records
- JSONB fields enable gradual schema evolution without breaking changes
- Validation logic should handle both column and JSONB sources during transitions

### Monitoring and Maintenance

- Track JSONB field usage to identify promotion candidates
- Monitor query performance on JSONB operations
- Refresh materialized views on appropriate schedule
- Review and update RLS policies as user roles evolve

## Migration Reference

| Task       | Migration File                                  | Description                           |
| ---------- | ----------------------------------------------- | ------------------------------------- |
| 2.1        | 20251102143938_students_table.sql               | Core students table with JSONB        |
| 2.2        | (included in 2.1)                               | Identification fields and constraints |
| 2.3        | 20251102144418_addresses_table.sql              | Addresses with JSONB                  |
| 2.4        | 20251102144554_certifications.sql               | Certifications master list            |
| 2.5        | 20251102144616_student_certifications.sql       | Junction table with JSONB             |
| 2.6        | 20251102144637_academic_info.sql                | Academic background                   |
| 2.7        | 20251102144656_exam_attempts.sql                | Exam attempts with metadata           |
| 2.8        | 20251102144714_form_submissions.sql             | Raw form data preservation            |
| 2.9        | 20251102144736_attendance_records.sql           | Attendance and engagement             |
| 2.10       | 20251102144856_test_scores.sql                  | Test scores with analytics            |
| 2.11       | 20251102145209_students_constraints.sql         | Validation constraints                |
| 2.12       | 20251102145408_students_indexes.sql             | GIN and full-text indexes             |
| 2.13       | 20251102145511_students_rls.sql                 | Row Level Security policies           |
| 2.14       | 20251102145643_student_progress_views.sql       | Materialized views                    |
| 2.15       | 20251102145744_unique_constraints.sql           | NULLS NOT DISTINCT constraints        |
| 2.16       | 20251102145835_generated_columns.sql            | Generated columns                     |
| 2.17       | 20251102145921_timestamp_triggers.sql           | Timestamp triggers                    |
| 2.18       | 20251102165941_enhanced_jsonb_functions.sql     | JSONB helper functions                |
| 2.18 (fix) | 20251102191214_fix_jsonb_update_concurrency.sql | Concurrency improvements              |

## Related Documentation

- [JSONB Functions Guide](../jsonb-functions-guide.md) - Detailed function usage and examples
- [Supabase Project Setup](../supabase-project-setup.md) - Environment configuration
- Migration files in `supabase/migrations/` - Source of truth for schema definitions
