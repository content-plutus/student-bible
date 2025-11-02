-- Task 2.11: CHECK constraints for core validation rules derived from PRD Section 7

alter table public.students
    add constraint students_gender_check check (gender is null or gender in ('Male', 'Female', 'Others')),
    add constraint students_salutation_check check (salutation is null or salutation in ('Mr', 'Ms', 'Mrs')),
    add constraint students_date_of_birth_check check (
        date_of_birth is null
        or date_of_birth between date '1950-01-01' and date '2010-12-31'
    ),
    add constraint students_minimum_age_check check (
        date_of_birth is null
        or date_part('year', age(date_of_birth)) >= 16
    );

alter table public.student_addresses
    add constraint student_addresses_state_check check (state <> ''),
    add constraint student_addresses_country_check check (country <> '');

alter table public.academic_info
    add constraint academic_info_stream_check check (stream_12th is null or stream_12th in ('Commerce', 'Arts', 'Science', 'Other'));

comment on constraint students_gender_check on public.students is 'Allowed gender values from PRD validation rules.';
comment on constraint students_salutation_check on public.students is 'Matches PRD salutation enum (Mr/Ms/Mrs).';
comment on constraint students_minimum_age_check on public.students is 'Ensures student is at least 16 years old.';
comment on constraint academic_info_stream_check on public.academic_info is 'Stream options aligned with PRD 12th stream validation.';
