

drop function if exists public.jsonb_strip_nulls(jsonb);

create or replace function public.jsonb_deep_merge(target jsonb, source jsonb)
returns jsonb as $$
declare
    key text;
    target_value jsonb;
    source_value jsonb;
    result jsonb;
begin
    if target is null then
        return source;
    end if;
    if source is null then
        return target;
    end if;
    
    result := target;
    
    for key, source_value in select * from jsonb_each(source)
    loop
        target_value := target -> key;
        
        if jsonb_typeof(target_value) = 'object' and jsonb_typeof(source_value) = 'object' then
            result := jsonb_set(result, array[key], jsonb_deep_merge(target_value, source_value));
        else
            result := jsonb_set(result, array[key], source_value);
        end if;
    end loop;
    
    return result;
end;
$$ language plpgsql immutable;

comment on function public.jsonb_deep_merge(jsonb, jsonb) is 
    'Recursively merges two JSONB objects, with source values overwriting target values. Nested objects are merged recursively.';


create or replace function public.students_get_extra_field(
    student_id uuid,
    field_key text
)
returns jsonb as $$
    select extra_fields -> field_key
    from public.students
    where id = student_id;
$$ language sql stable security invoker;

comment on function public.students_get_extra_field(uuid, text) is
    'Retrieves a specific field from a student''s extra_fields JSONB column.';

create or replace function public.students_has_extra_field(
    student_id uuid,
    field_key text
)
returns boolean as $$
    select extra_fields ? field_key
    from public.students
    where id = student_id;
$$ language sql stable security invoker;

comment on function public.students_has_extra_field(uuid, text) is
    'Checks if a specific field exists in a student''s extra_fields JSONB column.';

create or replace function public.students_update_extra_fields(
    student_id uuid,
    patch jsonb,
    strip_nulls boolean default true
)
returns jsonb as $$
declare
    current_fields jsonb;
    merged_fields jsonb;
begin
    select extra_fields into current_fields
    from public.students
    where id = student_id;
    
    if current_fields is null then
        raise exception 'Student with id % not found', student_id;
    end if;
    
    merged_fields := jsonb_deep_merge(current_fields, patch);
    
    if strip_nulls then
        merged_fields := jsonb_strip_nulls(merged_fields);
    end if;
    
    update public.students
    set extra_fields = merged_fields,
        updated_at = now()
    where id = student_id;
    
    return merged_fields;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

comment on function public.students_update_extra_fields(uuid, jsonb, boolean) is
    'Updates a student''s extra_fields by merging a patch. Optionally strips null values. Returns the updated extra_fields.';

create or replace function public.search_students_by_extra(
    field_key text,
    field_value jsonb
)
returns setof public.students as $$
    select *
    from public.students
    where extra_fields @> jsonb_build_object(field_key, field_value);
$$ language sql stable security invoker;

comment on function public.search_students_by_extra(text, jsonb) is
    'Searches for students where extra_fields contains the specified key-value pair. Uses GIN index for performance.';


create or replace function public.addresses_get_additional_field(
    address_id uuid,
    field_key text
)
returns jsonb as $$
    select additional_data -> field_key
    from public.student_addresses
    where id = address_id;
$$ language sql stable security invoker;

comment on function public.addresses_get_additional_field(uuid, text) is
    'Retrieves a specific field from an address''s additional_data JSONB column.';

create or replace function public.addresses_has_additional_field(
    address_id uuid,
    field_key text
)
returns boolean as $$
    select additional_data ? field_key
    from public.student_addresses
    where id = address_id;
$$ language sql stable security invoker;

comment on function public.addresses_has_additional_field(uuid, text) is
    'Checks if a specific field exists in an address''s additional_data JSONB column.';

create or replace function public.addresses_update_additional_data(
    address_id uuid,
    patch jsonb,
    strip_nulls boolean default true
)
returns jsonb as $$
declare
    current_data jsonb;
    merged_data jsonb;
begin
    select additional_data into current_data
    from public.student_addresses
    where id = address_id;
    
    if current_data is null then
        raise exception 'Address with id % not found', address_id;
    end if;
    
    merged_data := jsonb_deep_merge(current_data, patch);
    
    if strip_nulls then
        merged_data := jsonb_strip_nulls(merged_data);
    end if;
    
    update public.student_addresses
    set additional_data = merged_data,
        updated_at = now()
    where id = address_id;
    
    return merged_data;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

comment on function public.addresses_update_additional_data(uuid, jsonb, boolean) is
    'Updates an address''s additional_data by merging a patch. Optionally strips null values. Returns the updated additional_data.';



grant execute on function public.students_get_extra_field(uuid, text) to authenticated;
grant execute on function public.students_has_extra_field(uuid, text) to authenticated;
grant execute on function public.search_students_by_extra(text, jsonb) to authenticated;
grant execute on function public.addresses_get_additional_field(uuid, text) to authenticated;
grant execute on function public.addresses_has_additional_field(uuid, text) to authenticated;

revoke execute on function public.students_update_extra_fields(uuid, jsonb, boolean) from public;
revoke execute on function public.addresses_update_additional_data(uuid, jsonb, boolean) from public;

grant execute on function public.students_update_extra_fields(uuid, jsonb, boolean) to service_role;
grant execute on function public.addresses_update_additional_data(uuid, jsonb, boolean) to service_role;

grant execute on function public.jsonb_deep_merge(jsonb, jsonb) to authenticated;
