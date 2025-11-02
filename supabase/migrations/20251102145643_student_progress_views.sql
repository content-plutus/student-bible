-- Task 2.14: Materialized view for student certification progress summary

create materialized view if not exists public.student_progress_summary as
select
    sc.student_id,
    sc.certification_id,
    c.code as certification_code,
    c.name as certification_name,
    coalesce(sc.progress_papers_completed, 0) as papers_completed,
    c.total_papers,
    case
        when c.total_papers is null or c.total_papers = 0 then null
        else round((coalesce(sc.progress_papers_completed, 0)::numeric / c.total_papers) * 100, 2)
    end as completion_percentage,
    sc.status,
    sc.projected_exam,
    sc.updated_at
from public.student_certifications sc
join public.certifications c on c.id = sc.certification_id;

create unique index if not exists student_progress_summary_idx
    on public.student_progress_summary (student_id, certification_id);
