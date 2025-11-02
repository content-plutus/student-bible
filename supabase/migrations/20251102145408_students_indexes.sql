-- Task 2.12: Add indexes and enable GIN for JSONB search

create extension if not exists pg_trgm;

create index if not exists students_full_text_idx on public.students using gin ((first_name || ' ' || coalesce(last_name, '')) gin_trgm_ops);
create index if not exists students_extra_fields_gin on public.students using gin (extra_fields jsonb_path_ops);

create index if not exists student_addresses_additional_data_gin on public.student_addresses using gin (additional_data jsonb_path_ops);

create index if not exists academic_info_extra_fields_gin on public.academic_info using gin (extra_fields jsonb_path_ops);

create index if not exists student_certifications_custom_fields_gin on public.student_certifications using gin (custom_fields jsonb_path_ops);

create index if not exists attendance_records_extra_metrics_gin on public.attendance_records using gin (extra_metrics jsonb_path_ops);

create index if not exists test_scores_analysis_data_gin on public.test_scores using gin (analysis_data jsonb_path_ops);

create index if not exists exam_attempts_metadata_gin on public.exam_attempts using gin (metadata jsonb_path_ops);

create index if not exists form_submissions_raw_data_gin on public.form_submissions using gin (raw_data jsonb_path_ops);
