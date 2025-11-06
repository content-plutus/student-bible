
create or replace function public.students_update_profile(
    student_id uuid,
    core_patch jsonb,
    extra_patch jsonb,
    strip_nulls boolean default true
)
returns public.students as $$
declare
    current_student public.students;
    merged_extra_fields jsonb;
begin
    select * into current_student
    from public.students
    where id = student_id;
    
    if current_student is null then
        raise exception 'Student with id % not found', student_id;
    end if;
    
    merged_extra_fields := jsonb_deep_merge(current_student.extra_fields, extra_patch);
    
    if strip_nulls then
        merged_extra_fields := jsonb_strip_nulls(merged_extra_fields);
    end if;
    
    update public.students
    set
        phone_number = case 
            when core_patch ? 'phone_number' then (core_patch->>'phone_number')::varchar(10)
            else current_student.phone_number
        end,
        email = case 
            when core_patch ? 'email' then (core_patch->>'email')::citext
            else current_student.email
        end,
        first_name = case 
            when core_patch ? 'first_name' then (core_patch->>'first_name')::text
            else current_student.first_name
        end,
        last_name = case 
            when core_patch ? 'last_name' then 
                case when core_patch->'last_name' = 'null'::jsonb then null
                else (core_patch->>'last_name')::text
                end
            else current_student.last_name
        end,
        gender = case 
            when core_patch ? 'gender' then 
                case when core_patch->'gender' = 'null'::jsonb then null
                else (core_patch->>'gender')::text
                end
            else current_student.gender
        end,
        date_of_birth = case 
            when core_patch ? 'date_of_birth' then 
                case when core_patch->'date_of_birth' = 'null'::jsonb then null
                else (core_patch->>'date_of_birth')::date
                end
            else current_student.date_of_birth
        end,
        guardian_phone = case 
            when core_patch ? 'guardian_phone' then 
                case when core_patch->'guardian_phone' = 'null'::jsonb then null
                else (core_patch->>'guardian_phone')::varchar(10)
                end
            else current_student.guardian_phone
        end,
        salutation = case 
            when core_patch ? 'salutation' then 
                case when core_patch->'salutation' = 'null'::jsonb then null
                else (core_patch->>'salutation')::text
                end
            else current_student.salutation
        end,
        father_name = case 
            when core_patch ? 'father_name' then 
                case when core_patch->'father_name' = 'null'::jsonb then null
                else (core_patch->>'father_name')::text
                end
            else current_student.father_name
        end,
        mother_name = case 
            when core_patch ? 'mother_name' then 
                case when core_patch->'mother_name' = 'null'::jsonb then null
                else (core_patch->>'mother_name')::text
                end
            else current_student.mother_name
        end,
        aadhar_number = case 
            when core_patch ? 'aadhar_number' then 
                case when core_patch->'aadhar_number' = 'null'::jsonb then null
                else (core_patch->>'aadhar_number')::varchar(12)
                end
            else current_student.aadhar_number
        end,
        pan_number = case 
            when core_patch ? 'pan_number' then 
                case when core_patch->'pan_number' = 'null'::jsonb then null
                else (core_patch->>'pan_number')::varchar(10)
                end
            else current_student.pan_number
        end,
        enrollment_status = case 
            when core_patch ? 'enrollment_status' then 
                case when core_patch->'enrollment_status' = 'null'::jsonb then null
                else (core_patch->>'enrollment_status')::text
                end
            else current_student.enrollment_status
        end,
        extra_fields = merged_extra_fields,
        updated_at = now()
    where id = student_id
    returning * into current_student;
    
    return current_student;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

comment on function public.students_update_profile(uuid, jsonb, jsonb, boolean) is
    'Atomically updates a student''s core fields and extra_fields in a single transaction. Returns the updated student record.';

revoke execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean) from public;
grant execute on function public.students_update_profile(uuid, jsonb, jsonb, boolean) to service_role;
