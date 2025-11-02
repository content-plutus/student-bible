-- Task 2.9: Attendance records with engagement metrics

create table if not exists public.attendance_records (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid not null references public.students (id) on delete cascade,
    session_date date not null,
    session_type text,
    attendance_status text not null,
    engagement_score integer,
    participation_notes text,
    extra_metrics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint attendance_records_engagement_range check (engagement_score is null or engagement_score between 0 and 10)
);

create index if not exists attendance_records_student_idx on public.attendance_records (student_id);
create index if not exists attendance_records_session_date_idx on public.attendance_records (session_date);

comment on table public.attendance_records is 'Captures attendance and engagement metrics across sessions.';
comment on column public.attendance_records.extra_metrics is 'JSONB payload for additional engagement fields from LMS or future sources.';
