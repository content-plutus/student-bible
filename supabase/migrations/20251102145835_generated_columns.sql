-- Task 2.16: Generated columns for convenience fields

alter table public.students
    add column full_name text generated always as (trim(first_name || ' ' || coalesce(last_name, ''))) stored;

-- Age should be calculated at query time: floor(date_part('year', age(date_of_birth)))::integer

alter table public.student_certifications
    add column progress_percentage numeric(5,2) generated always as (
        case
            when total_papers_target is null or total_papers_target = 0 then null
            else round((coalesce(progress_papers_completed, 0)::numeric / total_papers_target) * 100, 2)
        end
    ) stored;
