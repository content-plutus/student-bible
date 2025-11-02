-- Task 2.17: Trigger to maintain updated_at timestamps across tables

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_students_set_updated
    before update on public.students
    for each row execute function public.set_updated_at();

create trigger trg_student_addresses_set_updated
    before update on public.student_addresses
    for each row execute function public.set_updated_at();

create trigger trg_certifications_set_updated
    before update on public.certifications
    for each row execute function public.set_updated_at();

create trigger trg_student_certifications_set_updated
    before update on public.student_certifications
    for each row execute function public.set_updated_at();

create trigger trg_academic_info_set_updated
    before update on public.academic_info
    for each row execute function public.set_updated_at();

create trigger trg_exam_attempts_set_updated
    before update on public.exam_attempts
    for each row execute function public.set_updated_at();

create trigger trg_form_submissions_set_updated
    before update on public.form_submissions
    for each row execute function public.set_updated_at();

create trigger trg_attendance_records_set_updated
    before update on public.attendance_records
    for each row execute function public.set_updated_at();

create trigger trg_test_scores_set_updated
    before update on public.test_scores
    for each row execute function public.set_updated_at();
