-- Audit context aware wrappers for student mutations and schema extensions

create or replace function public.students_update_profile(
    student_id uuid,
    core_patch jsonb,
    extra_patch jsonb,
    strip_nulls boolean default true,
    p_actor text default null,
    p_request_id text default null
)
returns public.students as $$
declare
    updated_student public.students;
begin
    perform public.set_audit_context(p_actor, p_request_id);

    update public.students s
    set
        phone_number = case 
            when core_patch ? 'phone_number' then (core_patch->>'phone_number')::varchar(10)
            else s.phone_number
        end,
        email = case 
            when core_patch ? 'email' then (core_patch->>'email')::citext
            else s.email
        end,
        first_name = case 
            when core_patch ? 'first_name' then (core_patch->>'first_name')::text
            else s.first_name
        end,
        last_name = case 
            when core_patch ? 'last_name' then 
                case when core_patch->'last_name' = 'null'::jsonb then null
                else (core_patch->>'last_name')::text
                end
            else s.last_name
        end,
        gender = case 
            when core_patch ? 'gender' then 
                case when core_patch->'gender' = 'null'::jsonb then null
                else (core_patch->>'gender')::text
                end
            else s.gender
        end,
        date_of_birth = case 
            when core_patch ? 'date_of_birth' then 
                case when core_patch->'date_of_birth' = 'null'::jsonb then null
                else (core_patch->>'date_of_birth')::date
                end
            else s.date_of_birth
        end,
        guardian_phone = case 
            when core_patch ? 'guardian_phone' then 
                case when core_patch->'guardian_phone' = 'null'::jsonb then null
                else (core_patch->>'guardian_phone')::varchar(10)
                end
            else s.guardian_phone
        end,
        salutation = case 
            when core_patch ? 'salutation' then 
                case when core_patch->'salutation' = 'null'::jsonb then null
                else (core_patch->>'salutation')::text
                end
            else s.salutation
        end,
        father_name = case 
            when core_patch ? 'father_name' then 
                case when core_patch->'father_name' = 'null'::jsonb then null
                else (core_patch->>'father_name')::text
                end
            else s.father_name
        end,
        mother_name = case 
            when core_patch ? 'mother_name' then 
                case when core_patch->'mother_name' = 'null'::jsonb then null
                else (core_patch->>'mother_name')::text
                end
            else s.mother_name
        end,
        aadhar_number = case 
            when core_patch ? 'aadhar_number' then 
                case when core_patch->'aadhar_number' = 'null'::jsonb then null
                else (core_patch->>'aadhar_number')::varchar(12)
                end
            else s.aadhar_number
        end,
        pan_number = case 
            when core_patch ? 'pan_number' then 
                case when core_patch->'pan_number' = 'null'::jsonb then null
                else (core_patch->>'pan_number')::varchar(10)
                end
            else s.pan_number
        end,
        enrollment_status = case 
            when core_patch ? 'enrollment_status' then 
                case when core_patch->'enrollment_status' = 'null'::jsonb then null
                else (core_patch->>'enrollment_status')::text
                end
            else s.enrollment_status
        end,
        extra_fields = case
            when extra_patch is null or extra_patch = '{}'::jsonb then s.extra_fields
            else (
                case when strip_nulls
                     then jsonb_strip_nulls(jsonb_deep_merge(s.extra_fields, extra_patch))
                     else jsonb_deep_merge(s.extra_fields, extra_patch)
                end
            )
        end,
        updated_at = now()
    where s.id = student_id
    returning * into updated_student;
    
    if not found then
        raise exception 'Student with id % not found', student_id;
    end if;
    
    return updated_student;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

revoke execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean, text, text) from public;
grant execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean, text, text) to service_role;

create or replace function public.students_insert_with_audit(
    payload jsonb,
    p_actor text default null,
    p_request_id text default null
)
returns public.students as $$
declare
    new_student public.students;
begin
    perform public.set_audit_context(p_actor, p_request_id);

    insert into public.students (
        phone_number,
        email,
        first_name,
        last_name,
        gender,
        date_of_birth,
        guardian_phone,
        salutation,
        father_name,
        mother_name,
        aadhar_number,
        pan_number,
        enrollment_status,
        extra_fields
    )
    values (
        (payload->>'phone_number')::varchar(10),
        (payload->>'email')::citext,
        (payload->>'first_name')::text,
        case when payload ? 'last_name' and payload->'last_name' <> 'null'::jsonb
             then (payload->>'last_name')::text else null end,
        case when payload ? 'gender' and payload->'gender' <> 'null'::jsonb
             then (payload->>'gender')::text else null end,
        case when payload ? 'date_of_birth' and payload->'date_of_birth' <> 'null'::jsonb
             then (payload->>'date_of_birth')::date else null end,
        case when payload ? 'guardian_phone' and payload->'guardian_phone' <> 'null'::jsonb
             then (payload->>'guardian_phone')::varchar(10) else null end,
        case when payload ? 'salutation' and payload->'salutation' <> 'null'::jsonb
             then (payload->>'salutation')::text else null end,
        case when payload ? 'father_name' and payload->'father_name' <> 'null'::jsonb
             then (payload->>'father_name')::text else null end,
        case when payload ? 'mother_name' and payload->'mother_name' <> 'null'::jsonb
             then (payload->>'mother_name')::text else null end,
        case when payload ? 'aadhar_number' and payload->'aadhar_number' <> 'null'::jsonb
             then (payload->>'aadhar_number')::varchar(12) else null end,
        case when payload ? 'pan_number' and payload->'pan_number' <> 'null'::jsonb
             then (payload->>'pan_number')::varchar(10) else null end,
        case when payload ? 'enrollment_status' and payload->'enrollment_status' <> 'null'::jsonb
             then (payload->>'enrollment_status')::text else null end,
        coalesce(payload->'extra_fields', '{}'::jsonb)
    )
    returning * into new_student;

    return new_student;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

revoke execute on function public.students_insert_with_audit(jsonb, text, text) from public;
grant execute on function public.students_insert_with_audit(jsonb, text, text) to service_role;

create or replace function public.schema_extension_persist(
    p_table_name text,
    p_jsonb_column text,
    p_records jsonb,
    p_defaults jsonb default '{}'::jsonb,
    p_field_names text[] default null,
    p_strategy text default 'merge',
    p_apply_existing boolean default false,
    p_actor text default null,
    p_request_id text default null
)
returns jsonb as $$
declare
    stored_count integer := 0;
    updated_rows integer := 0;
begin
    perform public.set_audit_context(p_actor, p_request_id);

    if p_records is not null and jsonb_array_length(p_records) > 0 then
        with payload as (
            select *
            from jsonb_to_recordset(p_records) as r(
                table_name text,
                jsonb_column text,
                field_name text,
                field_type text,
                description text,
                required boolean,
                allow_null boolean,
                default_value jsonb,
                validation_rules jsonb,
                migration_strategy text,
                apply_to_existing boolean,
                schema_version integer,
                last_applied_at timestamptz
            )
        ), upserted as (
            insert into public.jsonb_schema_extensions (
                table_name,
                jsonb_column,
                field_name,
                field_type,
                description,
                required,
                allow_null,
                default_value,
                validation_rules,
                migration_strategy,
                apply_to_existing,
                schema_version,
                last_applied_at
            )
            select
                table_name,
                jsonb_column,
                field_name,
                field_type,
                description,
                coalesce(required, false),
                coalesce(allow_null, true),
                default_value,
                validation_rules,
                coalesce(migration_strategy, p_strategy),
                coalesce(apply_to_existing, p_apply_existing),
                schema_version,
                coalesce(last_applied_at, now())
            from payload
            on conflict (table_name, jsonb_column, field_name)
            do update set
                field_type = excluded.field_type,
                description = excluded.description,
                required = excluded.required,
                allow_null = excluded.allow_null,
                default_value = excluded.default_value,
                validation_rules = excluded.validation_rules,
                migration_strategy = excluded.migration_strategy,
                apply_to_existing = excluded.apply_to_existing,
                schema_version = excluded.schema_version,
                last_applied_at = excluded.last_applied_at
            returning 1
        )
        select count(*) into stored_count from upserted;
    end if;

    if p_apply_existing and p_defaults is not null and p_defaults <> '{}'::jsonb then
        updated_rows := coalesce(
            public.apply_jsonb_schema_extension(
                p_table_name,
                p_jsonb_column,
                p_defaults,
                p_field_names,
                p_strategy
            ),
            0
        );
    end if;

    return json_build_object(
        'stored_count', stored_count,
        'records_updated', updated_rows
    );
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.schema_extension_persist(text, text, jsonb, jsonb, text[], text, boolean, text, text) from public;
grant execute on function public.schema_extension_persist(text, text, jsonb, jsonb, text[], text, boolean, text, text) to service_role;
