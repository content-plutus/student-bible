
create or replace function public.students_update_profile(
    student_id uuid,
    core_patch jsonb,
    extra_patch jsonb,
    strip_nulls boolean default true
)
returns public.students as $$
declare
    updated_student public.students;
begin
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

comment on function public.students_update_profile(uuid, jsonb, jsonb, boolean) is
    'Atomically updates a student''s core fields and extra_fields in a single transaction. Returns the updated student record.';

revoke execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean) from public;
grant execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean) to service_role;
