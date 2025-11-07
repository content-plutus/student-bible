-- Add raw_data column to import_jobs for async job processing

alter table public.import_jobs
  add column if not exists raw_data jsonb;

comment on column public.import_jobs.raw_data is
  'Stores the raw import records for async processing. Used when async=true to persist data for background processing.';

create index if not exists import_jobs_status_pending_idx
  on public.import_jobs (status)
  where status = 'pending';

select app_meta.record_migration(
  20251107120000,
  '20251107120000_add_raw_data_to_import_jobs.sql',
  null,
  null,
  'Add raw_data column to import_jobs for async job processing'
);

