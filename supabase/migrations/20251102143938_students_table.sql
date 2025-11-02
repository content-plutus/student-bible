-- Task 2.1: Create `students` table with core fields and flexible JSONB extensions
-- PRD references: goals (section 2), Functional Requirements 1, 11-12, Schema Flexibility 20-24

-- Ensure required extensions are available
create extension if not exists pgcrypto;  -- Provides gen_random_uuid()
create extension if not exists citext;

create table if not exists public.students (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    phone_number varchar(10) not null,
    email citext not null,
    first_name text not null,
    last_name text,
    gender text,
    date_of_birth date,
    guardian_phone varchar(10),
    salutation text,
    father_name text,
    mother_name text,
    aadhar_number varchar(12),
    pan_number varchar(10),
    enrollment_status text,
    extra_fields jsonb not null default '{}'::jsonb,
    constraint students_phone_format check (phone_number ~ '^[6-9][0-9]{9}$'),
    constraint students_guardian_phone_format check (guardian_phone is null or guardian_phone ~ '^[6-9][0-9]{9}$'),
    constraint students_guardian_diff check (guardian_phone is null or guardian_phone <> phone_number),
    constraint students_email_format check (position('@' in email) > 1),
    constraint students_aadhar_format check (aadhar_number is null or aadhar_number ~ '^[0-9]{12}$'),
    constraint students_pan_format check (pan_number is null or pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
);

create unique index if not exists students_phone_number_key on public.students (phone_number);
create unique index if not exists students_email_key on public.students (email);
create unique index if not exists students_aadhar_number_key on public.students (aadhar_number) where aadhar_number is not null;

comment on table public.students is
    'Core student profile with flexible JSONB storage for certification-specific fields.';

comment on column public.students.extra_fields is
    'Arbitrary JSON payload for unmapped form fields to support schema evolution (PRD requirement 21).';
