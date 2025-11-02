-- Task 2.15: Unique constraints with NULLS NOT DISTINCT behavior for optional unique fields

alter table public.students
    add constraint students_email_unique unique nulls not distinct (email);

alter table public.students
    add constraint students_aadhar_unique unique nulls not distinct (aadhar_number);

alter table public.students
    add constraint students_pan_unique unique nulls not distinct (pan_number);

alter table public.student_certifications
    add constraint student_certifications_unique unique (student_id, certification_id);
