-- Task 2.8: Raw form submissions with JSONB storage

create table if not exists public.form_submissions (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references public.students (id) on delete set null,
    form_name text not null,
    submission_id text,
    submitted_at timestamptz default now(),
    raw_data jsonb not null,
    processed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists form_submissions_student_idx on public.form_submissions (student_id);
create index if not exists form_submissions_form_name_idx on public.form_submissions (form_name);
create index if not exists form_submissions_submission_id_idx on public.form_submissions (submission_id);

comment on table public.form_submissions is 'Stores raw Google Form submissions for auditing and reprocessing.';
