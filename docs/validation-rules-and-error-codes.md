# Validation Rules and Error Codes

## Table of Contents

1. [Overview](#overview)
2. [Field Validation Rules](#field-validation-rules)
3. [Cross-Field Validation Rules](#cross-field-validation-rules)
4. [Database Constraints](#database-constraints)
5. [Error Code System](#error-code-system)
6. [Validation Helper Functions](#validation-helper-functions)
7. [Usage Examples](#usage-examples)
8. [Testing Reference](#testing-reference)

---

## Overview

The Student Bible system implements a comprehensive three-layer validation architecture to ensure data integrity and consistency across all student records.

### Three-Layer Validation Architecture

The validation system operates at three distinct levels, each serving a specific purpose:

#### 1. Application-Level Validation (Zod Schemas)

This is the first line of defense, implemented using Zod schemas with custom validation rules. Application-level validation occurs before data reaches the database and provides immediate feedback to users.

**Location**: `src/lib/validators/`, `src/lib/types/`

**Purpose**:

- Validate data format and structure
- Transform and normalize input data (e.g., trim whitespace, convert to uppercase)
- Provide user-friendly error messages
- Support partial validation for flexible form submissions

**When Used**:

- Form submissions
- API request validation
- Data import/sync operations
- Client-side validation

#### 2. Cross-Field Validation

This layer validates relationships and dependencies between multiple fields. Cross-field validation ensures that field combinations make logical sense together.

**Location**: `src/lib/validators/studentValidator.ts`, `src/lib/types/address.ts`, `src/lib/types/student-certification.ts`

**Purpose**:

- Validate field dependencies
- Ensure logical consistency across related fields
- Enforce business rules that span multiple fields

**When Used**:

- After individual field validation passes
- During form submission
- Before database insertion

#### 3. Database-Level Validation (PostgreSQL CHECK Constraints)

This is the final enforcement layer, implemented as PostgreSQL CHECK constraints. Database-level validation acts as a safety net to prevent invalid data from being persisted.

**Location**: `supabase/migrations/20251102143938_students_table.sql`

**Purpose**:

- Enforce data integrity at the storage layer
- Prevent invalid data even if application validation is bypassed
- Provide database-level guarantees

**When Used**:

- During INSERT operations
- During UPDATE operations
- As a fallback if application validation fails

### Error Code Taxonomy

The system uses a structured error code taxonomy to categorize validation failures:

| Error Code               | Description                         | Layer       |
| ------------------------ | ----------------------------------- | ----------- |
| `constraint_violation`   | Database CHECK constraint violation | Database    |
| `unique_violation`       | Unique constraint violation         | Database    |
| `invalid_format`         | Data format error                   | Application |
| `foreign_key_violation`  | Referenced record doesn't exist     | Database    |
| `not_null_violation`     | Required field missing              | Database    |
| `cross_field_validation` | Cross-field validation failure      | Application |
| `async_validation`       | Asynchronous validation error       | Application |
| `unknown_error`          | Unhandled error                     | System      |

---

## Field Validation Rules

This section documents all field-level validation rules implemented in the Student Bible system.

### Phone Number

**Field**: `phone_number`

**Validation Pattern**: `/^[6-9]\d{9}$/`

**Rules**:

- Must be exactly 10 digits
- Must start with 6, 7, 8, or 9 (Indian mobile format)
- No spaces, hyphens, or special characters allowed

**Error Message**: "Phone number must be 10 digits starting with 6-9"

**Code Reference**: `src/lib/validators/studentValidator.ts:18-29`, `src/lib/validators/rules.ts:2-7`

**Valid Examples**:

- `9876543210`
- `8123456789`
- `7654321098`
- `6543210987`

**Invalid Examples**:

- `1234567890` (starts with 1)
- `5876543210` (starts with 5)
- `987654321` (only 9 digits)
- `98765432100` (11 digits)
- `abcdefghij` (contains letters)

**Transformations**:

- Whitespace is trimmed before validation

**Database Constraint**: `students_phone_format`

---

### Guardian Phone Number

**Field**: `guardian_phone`

**Validation Pattern**: `/^[6-9]\d{9}$/`

**Rules**:

- Same pattern as phone number
- Optional field (can be null)
- Must be different from student phone number (cross-field validation)

**Error Messages**:

- "Guardian phone number must be 10 digits starting with 6-9"
- "Guardian phone number must be different from student phone number" (cross-field)

**Code Reference**: `src/lib/validators/studentValidator.ts:31-44`, `src/lib/validators/rules.ts:8-13`

**Valid Examples**:

- `9876543210` (if student phone is different)
- `null` (optional)

**Invalid Examples**:

- Same as student phone number
- Invalid format (same rules as phone number)

**Transformations**:

- Whitespace is trimmed before validation

**Database Constraints**:

- `students_guardian_phone_format`
- `students_guardian_diff`

---

### AADHAR Number

**Field**: `aadhar_number`

**Validation Pattern**: `/^[0-9]{12}$/` with Verhoeff checksum verification

**Rules**:

- Must be exactly 12 digits
- Must pass Verhoeff checksum algorithm validation
- Optional field (can be null)
- Must be unique across all students

**Error Messages**:

- "AADHAR number must be exactly 12 digits"
- "Invalid AADHAR number: checksum verification failed"
- "This AADHAR number is already registered" (unique violation)

**Code Reference**: `src/lib/validators/studentValidator.ts:46-60`, `src/lib/validators/rules.ts:14-19`

**Valid Examples** (with valid checksums):

- `234123451235`
- `987654321096`
- `999999990019`

**Invalid Examples**:

- `12345678901` (only 11 digits)
- `1234567890123` (13 digits)
- `12345678901A` (contains letter)
- `123456789012` (invalid checksum)
- `111111111111` (invalid checksum)

**Transformations**:

- Whitespace is trimmed before validation

**Checksum Validation**:
The system uses the `aadhaar-validator-ts` library to verify the Verhoeff checksum algorithm, which is the official AADHAR validation algorithm used by the Government of India.

**Database Constraints**:

- `students_aadhar_format`
- `students_aadhar_number_key` (unique index)

---

### PAN Number

**Field**: `pan_number`

**Validation Pattern**: `/^[A-Z]{5}[0-9]{4}[A-Z]$/`

**Rules**:

- Must be exactly 10 characters
- Format: 5 uppercase letters, 4 digits, 1 uppercase letter
- Optional field (can be null)
- Must be unique across all students

**Error Messages**:

- "PAN number must be exactly 10 characters"
- "PAN number must follow format: 5 letters, 4 digits, 1 letter"
- "This PAN number is already registered" (unique violation)

**Code Reference**: `src/lib/validators/studentValidator.ts:118-131`

**Valid Examples**:

- `ABCDE1234F`
- `XYZAB9876C`

**Invalid Examples**:

- `abcde1234f` (lowercase letters)
- `ABCD1234F` (only 4 letters at start)
- `ABCDE12345` (5 digits instead of 4)
- `ABCDE1234` (missing final letter)
- `12345ABCDE` (digits before letters)

**Transformations**:

- Whitespace is trimmed before validation
- Automatically converted to uppercase

**Database Constraints**:

- `students_pan_format`
- Unique index on `pan_number`

---

### Email

**Field**: `email`

**Validation**: Zod email format validation

**Rules**:

- Must be a valid email format
- Must contain '@' symbol with text before and after
- Must be unique across all students
- Stored as case-insensitive text (citext)

**Error Messages**:

- "Please enter a valid email address"
- "This email address is already registered" (unique violation)

**Code Reference**: `src/lib/validators/studentValidator.ts:143-146`

**Valid Examples**:

- `test@example.com`
- `user.name@domain.co.in`
- `student123@university.edu`

**Invalid Examples**:

- `invalid-email` (no @ symbol)
- `@example.com` (no local part)
- `test@` (no domain)

**Transformations**:

- Whitespace is trimmed before validation
- Automatically converted to lowercase

**Database Constraints**:

- `students_email_format`
- `students_email_key` (unique index)

---

### Postal Code (PIN Code)

**Field**: `postal_code`

**Validation Pattern**: `/^[0-9]{6}$/`

**Rules**:

- Must be exactly 6 digits
- No letters or special characters allowed
- Required field

**Error Messages**:

- "PIN code must be exactly 6 digits"
- "PIN code must contain only digits"

**Code Reference**: `src/lib/validators/studentValidator.ts:133-141`

**Valid Examples**:

- `560001`
- `400001`
- `110001`

**Invalid Examples**:

- `40001` (only 5 digits)
- `4000011` (7 digits)
- `40000A` (contains letter)
- `abcdef` (all letters)

**Transformations**:

- Whitespace is trimmed before validation

**Database Constraint**: `student_addresses_postal_code_check`

---

### Date of Birth

**Field**: `date_of_birth`

**Validation Rules**:

1. Year must be between 1950 and 2010
2. Student must be at least 16 years old

**Error Messages**:

- "Date of birth must be between 1950 and 2010"
- "Student must be at least 16 years old"

**Code Reference**: `src/lib/types/validations.ts:162-179`, `src/lib/validators/studentValidator.ts:213-238`

**Valid Examples**:

- `2000-01-01` (24 years old)
- `1995-06-15` (29 years old)
- `2008-12-31` (16 years old)

**Invalid Examples**:

- `1940-01-01` (year before 1950)
- `2015-01-01` (less than 16 years old)
- `2011-01-01` (year after 2010)

**Age Calculation**:
The system calculates age by comparing the birth year, month, and day with the current date. If the birthday hasn't occurred yet in the current year, the age is reduced by 1.

**Database Constraints**:

- `students_date_of_birth_check`
- `students_minimum_age_check`

---

### Batch Code

**Field**: `batch_code`

**Validation**: Dynamic patterns based on certification type

**Rules**:

- Pattern varies by certification type
- Optional field (can be null)
- Must match the certification type pattern if provided

**Code Reference**: `src/lib/validators/rules.ts:38-61`, `src/lib/validators/studentValidator.ts:346-405`

#### US CMA Batch Code

**Pattern**: `/^CMA_(?:P\d+|PART\d+|[A-Z0-9]{1,10})_(?:(?:Sec[A-Z]_)?Batch|Group)_[0-9]{1,2}_[A-Z](?:_[A-Z])?$/`

**Format**: `CMA_{identifier}_{Batch|SecX_Batch|Group}_{number}_{suffix}`

**Error Message**: "US CMA batch code must follow format: CMA*{identifier}*{Batch|SecX*Batch|Group}*{number}\_{suffix}"

**Valid Examples**:

- `CMA_P1_Batch_1_A`
- `CMA_PART1_Batch_3_E`
- `CMA_P1_SecA_Batch_7_W_E`
- `CMA_PART2_Group_5_B`

**Invalid Examples**:

- `CMA_P1_Batch_1` (missing suffix)
- `CMA_Batch_1_A` (missing identifier)
- `ACCA_2024_Batch_1` (wrong prefix)

#### ACCA Batch Code

**Pattern**: `/^ACCA_\d{4}_Batch_\d+$/`

**Format**: `ACCA_{year}_Batch_{number}`

**Error Message**: "ACCA batch code must follow format: ACCA*{year}\_Batch*{number}"

**Valid Examples**:

- `ACCA_2024_Batch_1`
- `ACCA_2024_Batch_5`
- `ACCA_2023_Batch_10`

**Invalid Examples**:

- `ACCA_24_Batch_1` (year must be 4 digits)
- `ACCA_2024_1` (missing "Batch")
- `CMA_P1_Batch_1_A` (wrong prefix)

#### CFA Batch Code

**Pattern**: `/^CFA_L\d+_Batch_\d+$/`

**Format**: `CFA_L{level}_Batch_{number}`

**Error Message**: "CFA batch code must follow format: CFA*L{level}\_Batch*{number}"

**Valid Examples**:

- `CFA_L1_Batch_1`
- `CFA_L1_Batch_3`
- `CFA_L2_Batch_5`

**Invalid Examples**:

- `CFA_Level1_Batch_1` (must use "L" not "Level")
- `CFA_L1_1` (missing "Batch")
- `ACCA_2024_Batch_1` (wrong prefix)

#### US CPA Batch Code

**Pattern**: `/^CPA_[A-Z]{3}_Batch_\d+$/`

**Format**: `CPA_{section}_Batch_{number}`

**Error Message**: "US CPA batch code must follow format: CPA*{section}\_Batch*{number}"

**Valid Examples**:

- `CPA_FAR_Batch_1`
- `CPA_AUD_Batch_2`
- `CPA_REG_Batch_3`
- `CPA_BEC_Batch_1`

**Invalid Examples**:

- `CPA_FA_Batch_1` (section must be 3 letters)
- `CPA_FARE_Batch_1` (section must be exactly 3 letters)
- `CPA_FAR_1` (missing "Batch")

---

### Enum Fields with Fallbacks

The system includes several enum fields that automatically fall back to default values when invalid or null values are provided.

**Code Reference**: `src/lib/validators/rules.ts:22-36`, `src/lib/types/validations.ts:180-201`

#### Gender

**Field**: `gender`

**Valid Values**: `["Male", "Female", "Others"]`

**Default Value**: `"Others"`

**Behavior**: If an invalid value or null is provided, the system automatically uses "Others" as the default.

**Code Reference**: `src/lib/types/validations.ts:181`

#### Salutation

**Field**: `salutation`

**Valid Values**: `["Mr", "Ms", "Mrs"]`

**Default Value**: `"Mr"`

**Behavior**: If an invalid value or null is provided, the system automatically uses "Mr" as the default.

**Code Reference**: `src/lib/types/validations.ts:183-187`

#### Education Level

**Field**: `education_level`

**Valid Values**: `["10th", "12th", "Graduate", "Master", "Other"]`

**Default Value**: `"Other"`

**Behavior**: If an invalid value or null is provided, the system automatically uses "Other" as the default.

**Code Reference**: `src/lib/types/validations.ts:189-193`

#### Stream

**Field**: `stream`

**Valid Values**: `["Commerce", "Arts", "Science", "Other"]`

**Default Value**: `"Other"`

**Behavior**: If an invalid value or null is provided, the system automatically uses "Other" as the default.

**Code Reference**: `src/lib/types/validations.ts:195`

#### Certification Type

**Field**: `certification_type`

**Valid Values**: `["ACCA", "US CMA", "CFA", "US CPA"]`

**Default Value**: `"ACCA"`

**Behavior**: If an invalid value or null is provided, the system automatically uses "ACCA" as the default.

**Code Reference**: `src/lib/types/validations.ts:197-201`

---

## Cross-Field Validation Rules

Cross-field validation rules ensure that combinations of fields make logical sense together. These validations occur after individual field validation passes.

### Guardian Phone vs Student Phone

**Fields**: `guardian_phone`, `phone_number`

**Rule**: Guardian phone number must be different from student phone number

**Error Message**: "Guardian phone number must be different from student phone number"

**Code Reference**: `src/lib/validators/studentValidator.ts:202-211`

**Validation Logic**:

```typescript
if (guardianPhone && studentPhone === guardianPhone) {
  return "Guardian phone number must be different from student phone number";
}
```

**Valid Examples**:

- Student: `9876543210`, Guardian: `8765432109` ✓
- Student: `9876543210`, Guardian: `null` ✓

**Invalid Examples**:

- Student: `9876543210`, Guardian: `9876543210` ✗

**Database Constraint**: `students_guardian_diff`

---

### Address Landmark Requirement

**Fields**: `address_type`, `landmark`

**Rule**: Landmark is required when `address_type` is "delivery"

**Error Message**: "Landmark is required for delivery addresses"

**Code Reference**: `src/lib/types/address.ts:23-33`

**Validation Logic**:

```typescript
if (address_type === "delivery" && (!landmark || landmark.trim().length === 0)) {
  return error;
}
```

**Valid Examples**:

- Type: `"residential"`, Landmark: `null` ✓
- Type: `"delivery"`, Landmark: `"Behind City Mall"` ✓

**Invalid Examples**:

- Type: `"delivery"`, Landmark: `null` ✗
- Type: `"delivery"`, Landmark: `""` ✗

**Test Reference**: `src/lib/types/address.test.ts:79-100`

---

### Batch Code and Certification Type

**Fields**: `batch_code`, `certification_type`, `custom_fields`

**Rule**: Batch code pattern must match the certification type

**Error Message**: "Invalid batch code format for the selected certification type"

**Code Reference**: `src/lib/types/student-certification.ts:29-81`, `src/lib/validators/studentValidator.ts:407-412`

**Validation Logic**:
The system validates that:

1. The batch code prefix matches the certification type
2. The batch code follows the pattern for that certification type
3. If `custom_fields` contains `batch_prefix` or `batch_identifier`, the batch code must match those values

**Valid Examples**:

- Certification: `"US CMA"`, Batch: `"CMA_P1_Batch_1_A"` ✓
- Certification: `"ACCA"`, Batch: `"ACCA_2024_Batch_1"` ✓
- Certification: `"CFA"`, Batch: `"CFA_L1_Batch_1"` ✓
- Certification: `"US CPA"`, Batch: `"CPA_FAR_Batch_1"` ✓

**Invalid Examples**:

- Certification: `"US CMA"`, Batch: `"ACCA_2024_Batch_1"` ✗
- Certification: `"ACCA"`, Batch: `"CMA_P1_Batch_1_A"` ✗

---

## Database Constraints

Database-level CHECK constraints provide the final layer of validation enforcement. These constraints are defined in the PostgreSQL schema and cannot be bypassed.

**Location**: `supabase/migrations/20251102143938_students_table.sql:25-31`

### Students Table Constraints

| Constraint Name                  | Field            | Rule                                              | Error Code             |
| -------------------------------- | ---------------- | ------------------------------------------------- | ---------------------- |
| `students_phone_format`          | `phone_number`   | Must match `/^[6-9][0-9]{9}$/`                    | `constraint_violation` |
| `students_guardian_phone_format` | `guardian_phone` | Must match `/^[6-9][0-9]{9}$/` or be null         | `constraint_violation` |
| `students_guardian_diff`         | `guardian_phone` | Must differ from `phone_number` or be null        | `constraint_violation` |
| `students_email_format`          | `email`          | Must contain '@' with position > 1                | `constraint_violation` |
| `students_aadhar_format`         | `aadhar_number`  | Must match `/^[0-9]{12}$/` or be null             | `constraint_violation` |
| `students_pan_format`            | `pan_number`     | Must match `/^[A-Z]{5}[0-9]{4}[A-Z]$/` or be null | `constraint_violation` |
| `students_minimum_age_check`     | `date_of_birth`  | Student must be at least 16 years old             | `constraint_violation` |
| `students_date_of_birth_check`   | `date_of_birth`  | Year must be between 1950 and 2010                | `constraint_violation` |
| `students_gender_check`          | `gender`         | Must be one of: Male, Female, Others              | `constraint_violation` |
| `students_salutation_check`      | `salutation`     | Must be one of: Mr, Ms, Mrs                       | `constraint_violation` |

### Student Addresses Table Constraints

| Constraint Name                       | Field         | Rule                     | Error Code             |
| ------------------------------------- | ------------- | ------------------------ | ---------------------- |
| `student_addresses_postal_code_check` | `postal_code` | Must be exactly 6 digits | `constraint_violation` |
| `student_addresses_state_check`       | `state`       | Must not be empty        | `constraint_violation` |
| `student_addresses_country_check`     | `country`     | Must not be empty        | `constraint_violation` |

### Unique Constraints

| Constraint Name              | Field           | Rule                              | Error Code         |
| ---------------------------- | --------------- | --------------------------------- | ------------------ |
| `students_phone_number_key`  | `phone_number`  | Must be unique                    | `unique_violation` |
| `students_email_key`         | `email`         | Must be unique (case-insensitive) | `unique_violation` |
| `students_aadhar_number_key` | `aadhar_number` | Must be unique (when not null)    | `unique_violation` |

**Note**: The unique constraints use `NULLS NOT DISTINCT` for optional fields, meaning multiple null values are allowed but duplicate non-null values are not.

---

## Error Code System

The error code system provides a structured way to categorize and handle validation failures. All error codes are defined and mapped in `src/lib/utils/errorFormatter.ts`.

### Two Families of Error Codes

The validation system uses two distinct families of error codes depending on where the validation occurs:

#### Application-Level (Zod) Error Codes

When validation fails at the application level (before reaching the database), the `formatValidationErrors` function passes through Zod's native error codes unchanged. These codes are intentionally not normalized to preserve Zod's standard error taxonomy.

**Code Reference**: `src/lib/utils/errorFormatter.ts:13-30` (line 24 sets `code: issue.code`)

**Common Zod Error Codes**:

| Zod Code             | When It Occurs                                | Example Scenario                                 |
| -------------------- | --------------------------------------------- | ------------------------------------------------ |
| `invalid_type`       | Value type doesn't match schema               | Passing number when string expected              |
| `invalid_string`     | String validation failed (regex, email, etc.) | Phone number fails regex pattern                 |
| `too_small`          | Value below minimum (length, number, date)    | String shorter than minimum length               |
| `too_big`            | Value above maximum (length, number, date)    | String longer than maximum length                |
| `invalid_enum_value` | Value not in allowed enum values              | Gender value not in ["Male", "Female", "Others"] |
| `unrecognized_keys`  | Object has unexpected properties              | Extra fields in validated object                 |
| `invalid_union`      | None of union options matched                 | Value doesn't match any union type               |
| `custom`             | Custom validation function failed             | AADHAR checksum verification failed              |

**Example Application-Level Error**:

```json
{
  "phone_number": {
    "field": "phone_number",
    "message": "Phone number must be 10 digits starting with 6-9",
    "code": "invalid_string"
  }
}
```

#### Database-Level (Normalized) Error Codes

When validation fails at the database level (constraint violations, unique violations, etc.), the `formatDatabaseError` function normalizes PostgreSQL error messages into a consistent set of error codes. These codes are system-defined and provide a higher-level categorization.

**Code Reference**: `src/lib/utils/errorFormatter.ts:72-259`

**Normalized Error Codes**: `constraint_violation`, `unique_violation`, `invalid_format`, `foreign_key_violation`, `not_null_violation`, `cross_field_validation`, `async_validation`, `unknown_error`

**Example Database-Level Error**:

```json
{
  "email": {
    "field": "email",
    "message": "This email address is already registered",
    "code": "unique_violation"
  }
}
```

---

### Error Code Categories

#### 1. constraint_violation

**Description**: Database CHECK constraint violations

**When It Occurs**: When data violates a database-level CHECK constraint

**Code Reference**: `src/lib/utils/errorFormatter.ts:76-178`

**Constraint Mapping Table**:

| Constraint Name                       | Field            | User-Friendly Message                                               |
| ------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `students_phone_format`               | `phone_number`   | "Phone number must be 10 digits starting with 6-9"                  |
| `students_guardian_phone_format`      | `guardian_phone` | "Guardian phone number must be 10 digits starting with 6-9"         |
| `students_guardian_diff`              | `guardian_phone` | "Guardian phone number must be different from student phone number" |
| `students_email_format`               | `email`          | "Please enter a valid email address"                                |
| `students_aadhar_format`              | `aadhar_number`  | "AADHAR number must be exactly 12 digits"                           |
| `students_pan_format`                 | `pan_number`     | "PAN number must follow format: 5 letters, 4 digits, 1 letter"      |
| `students_minimum_age_check`          | `date_of_birth`  | "Student must be at least 16 years old"                             |
| `students_date_of_birth_check`        | `date_of_birth`  | "Date of birth must be between 1950 and 2010"                       |
| `students_gender_check`               | `gender`         | "Gender must be one of: Male, Female, Others"                       |
| `students_salutation_check`           | `salutation`     | "Salutation must be one of: Mr, Ms, Mrs"                            |
| `student_addresses_postal_code_check` | `postal_code`    | "PIN code must be exactly 6 digits"                                 |
| `student_addresses_state_check`       | `state`          | "State is required"                                                 |
| `student_addresses_country_check`     | `country`        | "Country is required"                                               |

**Example Error Response**:

```json
{
  "phone_number": {
    "field": "phone_number",
    "message": "Phone number must be 10 digits starting with 6-9",
    "code": "constraint_violation"
  }
}
```

---

#### 2. unique_violation

**Description**: Unique constraint violations

**When It Occurs**: When attempting to insert or update a record with a value that already exists for a unique field

**Code Reference**: `src/lib/utils/errorFormatter.ts:180-226`

**Unique Fields**:

| Field           | User-Friendly Message                      |
| --------------- | ------------------------------------------ |
| `email`         | "This email address is already registered" |
| `phone_number`  | "This phone number is already registered"  |
| `aadhar_number` | "This AADHAR number is already registered" |
| `pan_number`    | "This PAN number is already registered"    |

**Example Error Response**:

```json
{
  "email": {
    "field": "email",
    "message": "This email address is already registered",
    "code": "unique_violation"
  }
}
```

---

#### 3. invalid_format

**Description**: Data format errors

**When It Occurs**: When data doesn't match the expected format or structure

**Code Reference**: `src/lib/utils/errorFormatter.ts:228-234`

**Example Scenarios**:

- Invalid JSON object provided
- Malformed data structure
- Type mismatch

**Example Error Response**:

```json
{
  "root": {
    "field": "root",
    "message": "Invalid data format: expected a JSON object",
    "code": "invalid_format"
  }
}
```

---

#### 4. foreign_key_violation

**Description**: Referenced record doesn't exist

**When It Occurs**: When attempting to insert or update a record that references a non-existent record in another table

**Code Reference**: `src/lib/utils/errorFormatter.ts:236-242`

**Example Scenarios**:

- Student ID doesn't exist when creating an address
- Certification ID doesn't exist when creating a student certification

**Example Error Response**:

```json
{
  "root": {
    "field": "root",
    "message": "Referenced record does not exist",
    "code": "foreign_key_violation"
  }
}
```

---

#### 5. not_null_violation

**Description**: Required field missing

**When It Occurs**: When a required (NOT NULL) field is not provided or is null

**Code Reference**: `src/lib/utils/errorFormatter.ts:244-252`

**Example Scenarios**:

- Required field not provided in form submission
- Null value provided for NOT NULL column

**Example Error Response**:

```json
{
  "first_name": {
    "field": "first_name",
    "message": "This field is required",
    "code": "not_null_violation"
  }
}
```

---

#### 6. cross_field_validation

**Description**: Cross-field validation failures

**When It Occurs**: When validation fails due to relationships between multiple fields

**Code Reference**: `src/lib/utils/errorFormatter.ts:292-304`

**Example Scenarios**:

- Guardian phone same as student phone
- Landmark missing for delivery address
- Batch code doesn't match certification type

**Example Error Response**:

```json
{
  "guardian_phone": {
    "field": "guardian_phone",
    "message": "Guardian phone number must be different from student phone number",
    "code": "cross_field_validation"
  }
}
```

---

#### 7. async_validation

**Description**: Asynchronous validation errors

**When It Occurs**: When validation requires external API calls or database queries

**Code Reference**: `src/lib/utils/errorFormatter.ts:306-314`

**Example Scenarios**:

- Checking if email already exists (async database query)
- Validating against external API

**Example Error Response**:

```json
{
  "email": {
    "field": "email",
    "message": "Email validation failed",
    "code": "async_validation"
  }
}
```

---

#### 8. unknown_error

**Description**: Unhandled errors

**When It Occurs**: When an error occurs that doesn't match any known error pattern

**Code Reference**: `src/lib/utils/errorFormatter.ts:254-258`

**Example Error Response**:

```json
{
  "root": {
    "field": "root",
    "message": "An error occurred while processing your request",
    "code": "unknown_error"
  }
}
```

---

## Validation Helper Functions

The validation system provides a consistent set of helper functions for each validated field. These functions follow a standard pattern to make validation predictable and easy to use.

**Code Reference**: `src/lib/validators/studentValidator.ts:62-200`

### Function Patterns

For each validated field, there are four function patterns available:

#### 1. `validate[Field]()` - Returns boolean

**Purpose**: Quick validation check that returns true/false

**Returns**: `boolean`

**Use Case**: When you only need to know if the value is valid or not

**Example**:

```typescript
const isValid = validatePhoneNumber("9876543210");
// Returns: true

const isInvalid = validatePhoneNumber("1234567890");
// Returns: false
```

---

#### 2. `parse[Field]()` - Throws on error

**Purpose**: Parse and validate, throwing an error if validation fails

**Returns**: Validated and transformed value

**Throws**: `ZodError` if validation fails

**Use Case**: When you want to fail fast and handle errors with try/catch

**Example**:

```typescript
try {
  const validPhone = parsePhoneNumber("9876543210");
  // Returns: "9876543210"
} catch (error) {
  // Handle validation error
  console.error("Validation failed:", error);
}
```

---

#### 3. `safeParse[Field]()` - Returns result object

**Purpose**: Parse and validate, returning a result object with success status

**Returns**: `{ success: boolean, data?: T, error?: ZodError }`

**Use Case**: When you want to handle validation results without try/catch

**Example**:

```typescript
const result = safeParsePhoneNumber("9876543210");

if (result.success) {
  console.log("Valid phone:", result.data);
  // result.data: "9876543210"
} else {
  console.error("Validation errors:", result.error);
}
```

---

#### 4. `get[Field]ValidationError()` - Returns error message or null

**Purpose**: Get a user-friendly error message if validation fails

**Returns**: `string | null`

**Use Case**: When you want to display validation errors to users

**Example**:

```typescript
const error = getPhoneValidationError("1234567890");
// Returns: "Phone number must be 10 digits starting with 6-9"

const noError = getPhoneValidationError("9876543210");
// Returns: null
```

---

### Complete Example: Phone Number Validation

Here's a complete example showing all four function patterns for phone number validation:

```typescript
import {
  validatePhoneNumber,
  parsePhoneNumber,
  safeParsePhoneNumber,
  getPhoneValidationError,
} from "@/lib/validators/studentValidator";

// 1. Boolean validation
const isValid = validatePhoneNumber("9876543210");
console.log(isValid); // true

// 2. Parse with throw
try {
  const phone = parsePhoneNumber("9876543210");
  console.log("Valid phone:", phone); // "9876543210"
} catch (error) {
  console.error("Invalid phone");
}

// 3. Safe parse
const result = safeParsePhoneNumber("9876543210");
if (result.success) {
  console.log("Valid phone:", result.data); // "9876543210"
} else {
  console.error("Errors:", result.error.issues);
}

// 4. Get error message
const error = getPhoneValidationError("1234567890");
console.log(error); // "Phone number must be 10 digits starting with 6-9"
```

---

### Available Validation Functions

The following fields have the complete set of validation helper functions:

- **Phone Number**: `validatePhoneNumber`, `parsePhoneNumber`, `safeParsePhoneNumber`, `getPhoneValidationError`
- **Guardian Phone**: `validateGuardianPhone`, `parseGuardianPhone`, `safeParseGuardianPhone`, `getGuardianPhoneValidationError`
- **AADHAR Number**: `validateAadharNumber`, `parseAadharNumber`, `safeParseAadharNumber`, `getAadharValidationError`
- **PAN Number**: `validatePanNumber`, `parsePanNumber`, `safeParsePanNumber`, `getPanValidationError`
- **Email**: `validateEmail`, `parseEmail`, `safeParseEmail`, `getEmailValidationError`
- **Postal Code**: `validatePostalCode`, `parsePostalCode`, `safeParsePostalCode`, `getPostalCodeValidationError`
- **Gender**: `validateGender`, `parseGender`, `safeParseGender`, `getGenderValidationError`
- **Salutation**: `validateSalutation`, `parseSalutation`, `safeParseSalutation`, `getSalutationValidationError`
- **Education Level**: `validateEducationLevel`, `parseEducationLevel`, `safeParseEducationLevel`, `getEducationLevelValidationError`
- **Stream**: `validateStream`, `parseStream`, `safeParseStream`, `getStreamValidationError`
- **Certification Type**: `validateCertificationType`, `parseCertificationType`, `safeParseCertificationType`, `getCertificationTypeValidationError`
- **Batch Code**: `validateBatchCode`, `parseBatchCode`, `safeParseBatchCode`, `getBatchCodeValidationError`

---

## Usage Examples

This section provides practical examples of how to use the validation system in different scenarios.

### Example 1: Form Validation

```typescript
import {
  safeParsePhoneNumber,
  safeParseEmail,
  getPhoneValidationError,
  getEmailValidationError,
} from "@/lib/validators/studentValidator";

function validateStudentForm(formData: { phone: string; email: string }) {
  const errors: Record<string, string> = {};

  // Validate phone number
  const phoneError = getPhoneValidationError(formData.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }

  // Validate email
  const emailError = getEmailValidationError(formData.email);
  if (emailError) {
    errors.email = emailError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Usage
const result = validateStudentForm({
  phone: "9876543210",
  email: "student@example.com",
});

if (result.isValid) {
  console.log("Form is valid!");
} else {
  console.log("Validation errors:", result.errors);
}
```

---

### Example 2: Cross-Field Validation

```typescript
import {
  validateCrossFieldGuardianPhone,
  getPhoneValidationError,
  getGuardianPhoneValidationError,
} from "@/lib/validators/studentValidator";

function validateStudentWithGuardian(data: { phone: string; guardianPhone: string | null }) {
  const errors: Record<string, string> = {};

  // Validate student phone
  const phoneError = getPhoneValidationError(data.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }

  // Validate guardian phone format
  if (data.guardianPhone) {
    const guardianPhoneError = getGuardianPhoneValidationError(data.guardianPhone);
    if (guardianPhoneError) {
      errors.guardianPhone = guardianPhoneError;
    }
  }

  // Cross-field validation
  const crossFieldError = validateCrossFieldGuardianPhone(data.phone, data.guardianPhone);
  if (crossFieldError) {
    errors.guardianPhone = crossFieldError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Usage
const result = validateStudentWithGuardian({
  phone: "9876543210",
  guardianPhone: "9876543210", // Same as student phone
});

console.log(result.errors);
// Output: { guardianPhone: "Guardian phone number must be different from student phone number" }
```

---

### Example 3: Batch Code Validation

```typescript
import {
  getBatchCodeValidationError,
  validateCrossFieldBatchCode,
} from "@/lib/validators/studentValidator";

function validateCertificationEnrollment(data: { certificationType: string; batchCode: string }) {
  const errors: Record<string, string> = {};

  // Validate batch code against certification type
  const batchCodeError = getBatchCodeValidationError(data.batchCode, data.certificationType);
  if (batchCodeError) {
    errors.batchCode = batchCodeError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Usage - Valid
const validResult = validateCertificationEnrollment({
  certificationType: "US CMA",
  batchCode: "CMA_P1_Batch_1_A",
});
console.log(validResult.isValid); // true

// Usage - Invalid
const invalidResult = validateCertificationEnrollment({
  certificationType: "US CMA",
  batchCode: "ACCA_2024_Batch_1", // Wrong prefix
});
console.log(invalidResult.errors);
// Output: { batchCode: "US CMA batch code must follow format: CMA_{identifier}_{Batch|SecX_Batch|Group}_{number}_{suffix} (e.g., CMA_PART1_Batch_3_E or CMA_P1_SecA_Batch_7_W_E)" }
```

---

### Example 4: Handling Database Errors

```typescript
import { formatDatabaseError } from "@/lib/utils/errorFormatter";

async function createStudent(studentData: any) {
  try {
    // Attempt to insert student into database
    const result = await supabase.from("students").insert(studentData);

    if (result.error) {
      throw result.error;
    }

    return { success: true, data: result.data };
  } catch (error) {
    // Format database error for user display
    const formattedError = formatDatabaseError(error);

    return {
      success: false,
      error: formattedError,
    };
  }
}

// Usage
const result = await createStudent({
  phone_number: "9876543210",
  email: "existing@example.com", // Already exists
  first_name: "John",
});

if (!result.success) {
  console.log(result.error);
  // Output: {
  //   field: "email",
  //   message: "This email address is already registered",
  //   code: "unique_violation"
  // }
}
```

---

### Example 5: API Error Response

```typescript
import {
  formatValidationErrors,
  formatDatabaseError,
  formatCrossFieldError,
} from "@/lib/utils/errorFormatter";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with Zod schema
    const schema = z.object({
      phone_number: phoneNumberSchema,
      email: emailSchema,
      first_name: z.string().min(1),
    });

    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      return Response.json(
        {
          success: false,
          errors,
        },
        { status: 400 },
      );
    }

    // Attempt database insertion
    const { data, error } = await supabase.from("students").insert(result.data);

    if (error) {
      const formattedError = formatDatabaseError(error);
      return Response.json(
        {
          success: false,
          errors: { [formattedError.field]: formattedError },
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        errors: {
          root: {
            field: "root",
            message: "An unexpected error occurred",
            code: "unknown_error",
          },
        },
      },
      { status: 500 },
    );
  }
}
```

**Example Error Response**:

This example demonstrates both error code families in a single response:

```json
{
  "success": false,
  "errors": {
    "phone_number": {
      "field": "phone_number",
      "message": "Phone number must be 10 digits starting with 6-9",
      "code": "invalid_string"
    },
    "email": {
      "field": "email",
      "message": "This email address is already registered",
      "code": "unique_violation"
    }
  }
}
```

**Note**: The `phone_number` error uses the Zod error code `invalid_string` (application-level validation), while the `email` error uses the normalized code `unique_violation` (database-level validation).

---

## Testing Reference

The validation system includes comprehensive test suites that demonstrate expected behavior and edge cases. These tests serve as living documentation of the validation rules.

### Validation Function Tests

**File**: `src/lib/types/validations.test.ts`

**Lines**: 1-158

**Coverage**:

- Phone number validation (lines 17-32)
- AADHAR number validation with Verhoeff checksum (lines 34-53)
- PAN number validation (lines 54-69)
- Postal code validation (lines 70-83)
- Email validation (lines 84-95)
- Date range validation (lines 96-107)
- Age validation (lines 108-119)
- Normalization functions (lines 120-158)

**Key Test Cases**:

1. **Phone Number Validation** (lines 17-32):
   - Valid: Numbers starting with 6, 7, 8, 9
   - Invalid: Numbers starting with 1-5, wrong length, non-numeric

2. **AADHAR Validation** (lines 34-53):
   - Valid: 12-digit numbers with valid Verhoeff checksum
   - Invalid: Wrong length, invalid checksum, non-numeric

3. **PAN Validation** (lines 54-69):
   - Valid: Uppercase format (5 letters, 4 digits, 1 letter)
   - Invalid: Lowercase, wrong format, wrong length

---

### Address Validation Tests

**File**: `src/lib/types/address.test.ts`

**Lines**: 78-100

**Coverage**:

- Cross-field validation for delivery addresses
- Landmark requirement based on address type

**Key Test Cases**:

1. **Landmark Required for Delivery** (lines 79-90):

   ```typescript
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
   ```

2. **Landmark Optional for Residential** (lines 70-77):
   ```typescript
   it("should allow null landmark for non-delivery address", () => {
     const residentialAddress = {
       ...validAddress,
       landmark: null,
     };
     const result = studentAddressSchema.safeParse(residentialAddress);
     expect(result.success).toBe(true);
   });
   ```

---

### Running Tests

To run the validation tests:

```bash
# Run all tests
npm run test

# Run specific test file
npm run test validations.test.ts

# Run tests in watch mode
npm run test -- --watch
```

---

## Summary

The Student Bible validation system provides comprehensive data validation through three layers:

1. **Application-Level Validation**: Zod schemas with custom rules for immediate feedback
2. **Cross-Field Validation**: Business logic validation across related fields
3. **Database-Level Validation**: PostgreSQL CHECK constraints as the final safety net

The system includes:

- **Field Validation Rules**: 15+ validated fields with specific patterns and error messages
- **Cross-Field Rules**: 3 cross-field validation rules for related fields
- **Database Constraints**: 13+ CHECK constraints and 3 unique constraints
- **Error Code System**: 8 error code categories for structured error handling
- **Helper Functions**: 4 function patterns per field for flexible validation
- **Comprehensive Tests**: Test suites demonstrating expected behavior

This documentation serves as the single source of truth for all validation rules in the Student Bible system. For implementation details, refer to the code references provided throughout this document.

---

**Related Documentation**:

- [JSONB Functions Guide](./jsonb-functions-guide.md)
- [Supabase Project Setup](./supabase-project-setup.md)
- [PRD: Student Bible](../tasks/tasks-0001-prd-student-bible.md)

**Last Updated**: 2025-11-06

**Task Reference**: PLU-62 (Task 3.20 - Document validation rules and error codes)
