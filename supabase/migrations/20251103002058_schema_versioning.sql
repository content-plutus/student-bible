
create schema if not exists app_meta;

create table if not exists app_meta.schema_migrations (
    id bigserial primary key,
    version bigint not null,
    name text not null,
    direction text not null default 'up',
    applied_at timestamptz not null default now(),
    applied_by text not null default current_user,
    execution_time_ms integer,
    success boolean not null default true,
    error_message text,
    checksum text,
    rolled_back_at timestamptz,
    rolled_back_by text,
    notes text,
    constraint schema_migrations_direction_check check (direction in ('up', 'down')),
    constraint schema_migrations_success_error_check check (success or error_message is not null)
);

create unique index if not exists schema_migrations_version_dir_uniq
    on app_meta.schema_migrations (version, direction);

create index if not exists schema_migrations_applied_at_idx
    on app_meta.schema_migrations (applied_at desc);

create or replace view app_meta.current_schema_version as
select max(version) as version
from app_meta.schema_migrations
where success = true
  and direction = 'up'
  and rolled_back_at is null;

comment on table app_meta.schema_migrations is
    'Tracks all database schema migrations with success/failure status and rollback capability.';

comment on view app_meta.current_schema_version is
    'Reports the highest successfully applied migration version that has not been rolled back.';

create or replace function app_meta.record_migration(
    _version bigint,
    _name text,
    _checksum text default null,
    _execution_time_ms integer default null,
    _notes text default null
) returns void as $$
begin
    insert into app_meta.schema_migrations(version, name, checksum, execution_time_ms, success, notes)
    values (_version, _name, _checksum, _execution_time_ms, true, _notes)
    on conflict (version, direction) do update
        set checksum = excluded.checksum,
            execution_time_ms = excluded.execution_time_ms,
            success = excluded.success,
            error_message = null,
            applied_at = now(),
            applied_by = current_user,
            notes = excluded.notes;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public, app_meta;

comment on function app_meta.record_migration(bigint, text, text, integer, text) is
    'Records a successful migration execution. Call at the end of each migration file.';

create or replace function app_meta.record_migration_failure(
    _version bigint,
    _name text,
    _error_message text,
    _execution_time_ms integer default null,
    _notes text default null
) returns void as $$
begin
    insert into app_meta.schema_migrations(version, name, execution_time_ms, success, error_message, notes)
    values (_version, _name, _execution_time_ms, false, _error_message, _notes)
    on conflict (version, direction) do update
        set success = false,
            error_message = excluded.error_message,
            execution_time_ms = excluded.execution_time_ms,
            applied_at = now(),
            applied_by = current_user,
            notes = excluded.notes;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public, app_meta;

comment on function app_meta.record_migration_failure(bigint, text, text, integer, text) is
    'Records a failed migration execution with error details.';

create or replace function app_meta.record_migration_rollback(
    _version bigint
) returns void as $$
begin
    update app_meta.schema_migrations
       set rolled_back_at = now(),
           rolled_back_by = current_user
     where version = _version
       and direction = 'up'
       and rolled_back_at is null;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public, app_meta;

comment on function app_meta.record_migration_rollback(bigint) is
    'Marks a migration as rolled back. Call when manually reverting a migration.';

grant usage on schema app_meta to authenticated;
grant select on app_meta.schema_migrations to authenticated;
grant select on app_meta.current_schema_version to authenticated;

grant execute on function app_meta.record_migration(bigint, text, text, integer, text) to service_role;
grant execute on function app_meta.record_migration_failure(bigint, text, text, integer, text) to service_role;
grant execute on function app_meta.record_migration_rollback(bigint) to service_role;

insert into app_meta.schema_migrations (version, name, success, notes)
values (
    20251102191214,
    'baseline: all migrations up to this point',
    true,
    'Represents migrations 20251102143938 through 20251102191214 applied before schema_migrations table was introduced'
)
on conflict do nothing;

select app_meta.record_migration(
    20251103002058,
    '20251103002058_schema_versioning.sql',
    null,
    null,
    'Initial schema versioning table and helper functions'
);
