-- Task 2.13: Row Level Security policies (read-only access initially)

alter table public.students enable row level security;
alter table public.student_addresses enable row level security;
alter table public.certifications enable row level security;
alter table public.student_certifications enable row level security;
alter table public.academic_info enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.form_submissions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.test_scores enable row level security;

create policy "Allow read access to all roles" on public.students
    for select
    using (true);

create policy "Allow read access to all roles" on public.student_addresses
    for select
    using (true);

create policy "Allow read access to all roles" on public.certifications
    for select
    using (true);

create policy "Allow read access to all roles" on public.student_certifications
    for select
    using (true);

create policy "Allow read access to all roles" on public.academic_info
    for select
    using (true);

create policy "Allow read access to all roles" on public.exam_attempts
    for select
    using (true);

create policy "Allow read access to all roles" on public.form_submissions
    for select
    using (true);

create policy "Allow read access to all roles" on public.attendance_records
    for select
    using (true);

create policy "Allow read access to all roles" on public.test_scores
    for select
    using (true);
