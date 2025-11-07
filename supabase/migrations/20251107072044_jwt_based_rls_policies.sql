
drop policy if exists "Allow read access to all roles" on public.students;
drop policy if exists "Allow read access to all roles" on public.student_addresses;
drop policy if exists "Allow read access to all roles" on public.certifications;
drop policy if exists "Allow read access to all roles" on public.student_certifications;
drop policy if exists "Allow read access to all roles" on public.academic_info;
drop policy if exists "Allow read access to all roles" on public.exam_attempts;
drop policy if exists "Allow read access to all roles" on public.form_submissions;
drop policy if exists "Allow read access to all roles" on public.attendance_records;
drop policy if exists "Allow read access to all roles" on public.test_scores;

create policy "Authenticated users can read students"
  on public.students
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert students"
  on public.students
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update students"
  on public.students
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete students"
  on public.students
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read student_addresses"
  on public.student_addresses
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert student_addresses"
  on public.student_addresses
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update student_addresses"
  on public.student_addresses
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete student_addresses"
  on public.student_addresses
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read certifications"
  on public.certifications
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert certifications"
  on public.certifications
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update certifications"
  on public.certifications
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete certifications"
  on public.certifications
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read student_certifications"
  on public.student_certifications
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert student_certifications"
  on public.student_certifications
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update student_certifications"
  on public.student_certifications
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete student_certifications"
  on public.student_certifications
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read academic_info"
  on public.academic_info
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert academic_info"
  on public.academic_info
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update academic_info"
  on public.academic_info
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete academic_info"
  on public.academic_info
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read exam_attempts"
  on public.exam_attempts
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert exam_attempts"
  on public.exam_attempts
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update exam_attempts"
  on public.exam_attempts
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete exam_attempts"
  on public.exam_attempts
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read form_submissions"
  on public.form_submissions
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert form_submissions"
  on public.form_submissions
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update form_submissions"
  on public.form_submissions
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete form_submissions"
  on public.form_submissions
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read attendance_records"
  on public.attendance_records
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert attendance_records"
  on public.attendance_records
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update attendance_records"
  on public.attendance_records
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete attendance_records"
  on public.attendance_records
  for delete
  using (auth.uid() is not null);

create policy "Authenticated users can read test_scores"
  on public.test_scores
  for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert test_scores"
  on public.test_scores
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update test_scores"
  on public.test_scores
  for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete test_scores"
  on public.test_scores
  for delete
  using (auth.uid() is not null);
