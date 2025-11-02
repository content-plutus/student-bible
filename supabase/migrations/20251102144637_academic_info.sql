-- Task 2.6: Academic information table with flexible structure

create table if not exists public.academic_info (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    highest_education_level text,
    college_name text,
    university_name text,
    major_subject text,
    passing_year integer,
    stream_12th text,
    grades jsonb,
    extra_fields jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint academic_info_passing_year_check check (passing_year is null or passing_year between 1950 and extract(year from now())::integer + 5)
);

create unique index if not exists academic_info_student_unique on public.academic_info (student_id);

comment on table public.academic_info is 'Stores student academic background and additional education details.';
comment on column public.academic_info.extra_fields is 'JSONB payload for academic form fields not mapped to core columns.';
