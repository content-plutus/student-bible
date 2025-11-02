-- Task 2.3: Addresses table with JSONB extension field
-- Supports PRD requirements for book delivery addresses and schema flexibility

create table if not exists public.student_addresses (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students (id) on delete cascade,
    address_type text not null default 'residential',
    address_line1 text not null,
    address_line2 text,
    landmark text,
    city text not null,
    state text not null,
    postal_code varchar(6) not null,
    country text not null default 'India',
    additional_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint student_addresses_postal_code_check check (postal_code ~ '^[0-9]{6}$')
);

create index if not exists student_addresses_student_id_idx on public.student_addresses (student_id);
create index if not exists student_addresses_address_type_idx on public.student_addresses (address_type);

comment on table public.student_addresses is
    'Stores student address records, preserving unmapped fields in JSONB (PRD schema flexibility requirement).';

comment on column public.student_addresses.additional_data is
    'JSONB payload for address-specific extra fields from Google Forms or future schema extensions.';
