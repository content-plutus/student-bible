-- Task 2.7: Exam attempts with metadata JSONB

create table if not exists public.exam_attempts (
    id uuid primary key default gen_random_uuid(),
    student_certification_id uuid not null references public.student_certifications (id) on delete cascade,
    paper_code text not null,
    attempt_date date,
    result text,
    score numeric(5,2),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists exam_attempts_student_cert_idx on public.exam_attempts (student_certification_id);
create index if not exists exam_attempts_paper_code_idx on public.exam_attempts (paper_code);

comment on table public.exam_attempts is 'Tracks exam attempts per student certification.';
comment on column public.exam_attempts.metadata is 'JSONB payload for attempt-specific details (mock performance, feedback, etc.).';
