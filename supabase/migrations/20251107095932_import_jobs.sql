-- Task 4.8: Create import_jobs table for batch import progress tracking and rollback support

create type import_job_status as enum ('pending', 'processing', 'completed', 'failed', 'rolled_back');

create table if not exists public.import_jobs (
    id uuid primary key default gen_random_uuid(),
    status import_job_status not null default 'pending',
    total_records integer not null default 0,
    processed_records integer not null default 0,
    successful_records integer not null default 0,
    failed_records integer not null default 0,
    error_summary jsonb not null default '[]'::jsonb,
    inserted_student_ids jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    constraint import_jobs_total_records_check check (total_records >= 0),
    constraint import_jobs_processed_records_check check (processed_records >= 0 and processed_records <= total_records),
    constraint import_jobs_successful_records_check check (successful_records >= 0),
    constraint import_jobs_failed_records_check check (failed_records >= 0),
    constraint import_jobs_records_sum_check check (successful_records + failed_records <= processed_records)
);

create index if not exists import_jobs_status_idx on public.import_jobs (status);
create index if not exists import_jobs_created_at_idx on public.import_jobs (created_at desc);

comment on table public.import_jobs is
    'Tracks batch import operations with progress, errors, and rollback capability.';

comment on column public.import_jobs.status is
    'Current status of the import job: pending, processing, completed, failed, or rolled_back.';

comment on column public.import_jobs.error_summary is
    'Array of error objects with row numbers, field paths, and error messages.';

comment on column public.import_jobs.inserted_student_ids is
    'Array of student IDs created during this import, used for rollback operations.';

comment on column public.import_jobs.metadata is
    'Additional metadata about the import: source type (csv/json), batch size, options, etc.';

-- Trigger to update updated_at timestamp
create or replace function update_import_jobs_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger import_jobs_updated_at_trigger
    before update on public.import_jobs
    for each row
    execute function update_import_jobs_updated_at();

-- RLS policies (read-only for authenticated users initially)
alter table public.import_jobs enable row level security;

create policy "Import jobs are viewable by authenticated users"
    on public.import_jobs
    for select
    to authenticated
    using (true);

create policy "Import jobs can be created by service role"
    on public.import_jobs
    for insert
    to service_role
    with check (true);

create policy "Import jobs can be updated by service role"
    on public.import_jobs
    for update
    to service_role
    using (true);

select app_meta.record_migration(
    20251107095932,
    '20251107095932_import_jobs.sql',
    null,
    null,
    'Create import_jobs table for batch import progress tracking and rollback support'
);

