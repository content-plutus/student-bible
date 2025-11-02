-- Task 2.16: Generated columns for convenience fields

alter table public.students
    add column full_name text generated always as (trim(concat(first_name, ' ', coalesce(last_name, '')))) stored;

alter table public.students
    add column age_years integer generated always as (
        case
            when date_of_birth is null then null
            else floor(date_part('year', age(date_of_birth)))::integer
        end
    ) stored;
