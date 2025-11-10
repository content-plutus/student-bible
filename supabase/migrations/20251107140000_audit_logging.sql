-- Task 4.17: Audit logging for all data modifications

create table if not exists public.audit_logs (
    id bigserial primary key,
    table_name text not null,
    record_id text,
    action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    new_data jsonb,
    old_data jsonb,
    actor text,
    request_id text,
    changed_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable record of data modifications across core tables.';
comment on column public.audit_logs.new_data is 'New row state for INSERT/UPDATE operations.';
comment on column public.audit_logs.old_data is 'Previous row state for UPDATE/DELETE operations.';

create index if not exists audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
create index if not exists audit_logs_changed_at_idx on public.audit_logs (changed_at);

create or replace function public.set_audit_context(p_actor text default null, p_request_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_actor is not null then
        perform set_config('app.current_actor', p_actor, true);
    end if;

    if p_request_id is not null then
        perform set_config('app.request_id', p_request_id, true);
    end if;
end;
$$;

comment on function public.set_audit_context(text, text) is
    'Sets session-level metadata captured by audit triggers (actor/request id).';

create or replace function public.record_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    pk_column text := coalesce(TG_ARGV[0], 'id');
    record_id text;
    new_state jsonb;
    old_state jsonb;
    actor text := nullif(current_setting('app.current_actor', true), '');
    request_id text := nullif(current_setting('app.request_id', true), '');
begin
    if actor is null then
        actor := current_user;
    end if;

    if TG_OP = 'INSERT' then
        new_state := to_jsonb(NEW);
        record_id := new_state ->> pk_column;
    elsif TG_OP = 'UPDATE' then
        new_state := to_jsonb(NEW);
        old_state := to_jsonb(OLD);
        record_id := coalesce(new_state ->> pk_column, old_state ->> pk_column);
    else
        old_state := to_jsonb(OLD);
        record_id := old_state ->> pk_column;
    end if;

    insert into public.audit_logs (
        table_name,
        record_id,
        action,
        new_data,
        old_data,
        actor,
        request_id
    )
    values (
        TG_TABLE_NAME,
        record_id,
        TG_OP,
        new_state,
        old_state,
        actor,
        request_id
    );

    if TG_OP = 'DELETE' then
        return OLD;
    end if;
    return NEW;
end;
$$;

comment on function public.record_audit_change() is
    'Generic trigger used to capture INSERT/UPDATE/DELETE events for audit logging.';

create trigger audit_students
after insert or update or delete on public.students
for each row execute function public.record_audit_change('id');

create trigger audit_student_addresses
after insert or update or delete on public.student_addresses
for each row execute function public.record_audit_change('id');

create trigger audit_student_certifications
after insert or update or delete on public.student_certifications
for each row execute function public.record_audit_change('id');

create trigger audit_academic_info
after insert or update or delete on public.academic_info
for each row execute function public.record_audit_change('id');

create trigger audit_exam_attempts
after insert or update or delete on public.exam_attempts
for each row execute function public.record_audit_change('id');

create trigger audit_attendance_records
after insert or update or delete on public.attendance_records
for each row execute function public.record_audit_change('id');

create trigger audit_test_scores
after insert or update or delete on public.test_scores
for each row execute function public.record_audit_change('id');

create trigger audit_form_submissions
after insert or update or delete on public.form_submissions
for each row execute function public.record_audit_change('id');

create trigger audit_import_jobs
after insert or update or delete on public.import_jobs
for each row execute function public.record_audit_change('id');
