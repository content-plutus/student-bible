-- Task 2.5: Student certifications junction table with JSONB custom fields

create type certification_status as enum ('planned', 'in_progress', 'completed', 'on_hold', 'dropped');

create table if not exists public.student_certifications (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid not null references public.students (id) on delete cascade,
    certification_id uuid not null references public.certifications (id) on delete cascade,
    enrollment_date date,
    status certification_status not null default 'planned',
    progress_papers_completed integer default 0,
    total_papers_target integer,
    projected_exam date,
    custom_fields jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint student_certifications_progress_nonnegative check (progress_papers_completed >= 0),
    constraint student_certifications_total_papers_nonnegative check (total_papers_target is null or total_papers_target >= 0)
);

create unique index if not exists student_certifications_unique_student_cert on public.student_certifications (student_id, certification_id);
create index if not exists student_certifications_status_idx on public.student_certifications (status);

comment on table public.student_certifications is 'Links students to certification enrollments, tracking status and progress.';
comment on column public.student_certifications.custom_fields is 'JSONB payload for certification-specific additional fields.';
