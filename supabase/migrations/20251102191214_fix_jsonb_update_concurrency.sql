

create or replace function public.students_update_extra_fields(
    student_id uuid,
    patch jsonb,
    strip_nulls boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    updated jsonb;
    rc int;
begin
    if patch is null or jsonb_typeof(patch) <> 'object' then
        raise exception 'patch must be a JSON object';
    end if;

    update public.students s
    set extra_fields = case
                         when strip_nulls then jsonb_strip_nulls(jsonb_deep_merge(s.extra_fields, patch))
                         else jsonb_deep_merge(s.extra_fields, patch)
                       end,
        updated_at = now()
    where s.id = student_id
    returning extra_fields into updated;

    get diagnostics rc = row_count;
    if rc = 0 then
        raise exception 'Student with id % not found', student_id;
    end if;

    return updated;
end;
$$;

comment on function public.students_update_extra_fields(uuid, jsonb, boolean) is
    'Atomically updates a student''s extra_fields by merging a patch. Optionally strips null values. Returns the updated extra_fields. Concurrency-safe: eliminates lost updates across different keys; last-writer-wins for same-key conflicts.';


create or replace function public.addresses_update_additional_data(
    address_id uuid,
    patch jsonb,
    strip_nulls boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    updated jsonb;
    rc int;
begin
    if patch is null or jsonb_typeof(patch) <> 'object' then
        raise exception 'patch must be a JSON object';
    end if;

    update public.student_addresses a
    set additional_data = case
                            when strip_nulls then jsonb_strip_nulls(jsonb_deep_merge(a.additional_data, patch))
                            else jsonb_deep_merge(a.additional_data, patch)
                          end,
        updated_at = now()
    where a.id = address_id
    returning additional_data into updated;

    get diagnostics rc = row_count;
    if rc = 0 then
        raise exception 'Address with id % not found', address_id;
    end if;

    return updated;
end;
$$;

comment on function public.addresses_update_additional_data(uuid, jsonb, boolean) is
    'Atomically updates an address''s additional_data by merging a patch. Optionally strips null values. Returns the updated additional_data. Concurrency-safe: eliminates lost updates across different keys; last-writer-wins for same-key conflicts.';


revoke execute on function public.students_update_extra_fields(uuid, jsonb, boolean) from public;
revoke execute on function public.addresses_update_additional_data(uuid, jsonb, boolean) from public;

grant execute on function public.students_update_extra_fields(uuid, jsonb, boolean) to service_role;
grant execute on function public.addresses_update_additional_data(uuid, jsonb, boolean) to service_role;
