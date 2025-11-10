-- Task 4.16: Schema extension registry and helper for dynamic JSONB fields

create table if not exists public.jsonb_schema_extensions (
    id uuid primary key default gen_random_uuid(),
    table_name text not null,
    jsonb_column text not null,
    field_name text not null,
    field_type text not null,
    description text,
    required boolean not null default false,
    allow_null boolean not null default true,
    default_value jsonb,
    validation_rules jsonb,
    migration_strategy text not null default 'merge',
    apply_to_existing boolean not null default false,
    schema_version integer not null default 1,
    last_applied_at timestamptz,
    created_at timestamptz not null default now(),
    created_by text,
    unique (table_name, jsonb_column, field_name)
);

comment on table public.jsonb_schema_extensions is 'Registry of dynamic JSONB field extensions applied via the schema extension API.';
comment on column public.jsonb_schema_extensions.table_name is 'Target table name for the JSONB extension.';
comment on column public.jsonb_schema_extensions.jsonb_column is 'Target JSONB column to extend.';
comment on column public.jsonb_schema_extensions.field_name is 'Name of the JSONB field that was added.';
comment on column public.jsonb_schema_extensions.field_type is 'Logical field type (string, number, date, etc).';
comment on column public.jsonb_schema_extensions.validation_rules is 'JSON payload describing validation constraints (min/max/pattern/enum).';

create index if not exists jsonb_schema_extensions_table_idx
  on public.jsonb_schema_extensions(table_name, jsonb_column);

create or replace function public.jsonb_append_arrays(target jsonb, source jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
    result jsonb := coalesce(target, '{}'::jsonb);
    entry record;
    existing jsonb;
    existing_type text;
    value_type text;
begin
    if source is null or source = '{}'::jsonb then
        return result;
    end if;

    for entry in select key, value from jsonb_each(source)
    loop
        existing := result -> entry.key;
        existing_type := coalesce(jsonb_typeof(existing), 'null');
        value_type := coalesce(jsonb_typeof(entry.value), 'null');

        if existing_type = 'array' and value_type = 'array' then
            result := jsonb_set(
                result,
                ARRAY[entry.key],
                coalesce(existing, '[]'::jsonb) || entry.value,
                true
            );
        elsif existing_type = 'array' then
            result := jsonb_set(result, ARRAY[entry.key], existing, true);
        else
            result := jsonb_set(result, ARRAY[entry.key], entry.value, true);
        end if;
    end loop;

    return result;
end;
$$;

comment on function public.jsonb_append_arrays(jsonb, jsonb) is
    'Appends array values when new schema defaults target existing JSONB arrays.';

create or replace function public.apply_jsonb_schema_extension(
    target_table text,
    jsonb_column text,
    extension_payload jsonb,
    field_names text[] default null,
    strategy text default 'merge'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    update_sql text;
    updated_rows integer := 0;
    target_column text := quote_ident(jsonb_column);
begin
    if extension_payload is null or extension_payload = '{}'::jsonb then
        return 0;
    end if;

    if field_names is null or array_length(field_names, 1) is null then
        select coalesce(array_agg(key), '{}')
        into field_names
        from jsonb_object_keys(extension_payload) as key;
    end if;

    if field_names is null or array_length(field_names, 1) is null then
        return 0;
    end if;

    if strategy = 'replace' then
        update_sql := format(
            'update %1$I set %2$s = jsonb_deep_merge((coalesce(%2$s, ''{}''::jsonb) - $2), $1::jsonb)',
            target_table,
            target_column
        );
    elsif strategy = 'append' then
        update_sql := format(
            'update %1$I set %2$s = jsonb_append_arrays(coalesce(%2$s, ''{}''::jsonb), $1::jsonb)',
            target_table,
            target_column
        );
    else
        update_sql := format(
            'update %1$I set %2$s = jsonb_deep_merge(coalesce(%2$s, ''{}''::jsonb), $1::jsonb) where not (%2$s ?| $2)',
            target_table,
            target_column
        );
    end if;

    execute update_sql using extension_payload, field_names;
    get diagnostics updated_rows = row_count;
    return updated_rows;
end;
$$;

comment on function public.apply_jsonb_schema_extension(text, text, jsonb, text[], text) is
    'Applies default values for new JSONB fields by merging payloads into rows missing the field.';
