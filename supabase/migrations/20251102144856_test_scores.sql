-- Task 2.10: Test scores with analysis data JSONB

create table if not exists public.test_scores (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    assessment_name text not null,
    assessment_type text,
    assessment_date date,
    score numeric(5,2),
    max_score numeric(5,2),
    weighted_score numeric(5,2),
    analysis_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists test_scores_student_idx on public.test_scores (student_id);
create index if not exists test_scores_assessment_idx on public.test_scores (assessment_name);

comment on table public.test_scores is 'Stores assessment results with space for analytics metadata.';
comment on column public.test_scores.analysis_data is 'JSONB payload for score breakdowns and future analytics (PRD requirement 22).';
