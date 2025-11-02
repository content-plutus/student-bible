-- Task 2.4: Certifications metadata table

create table if not exists public.certifications (
    id uuid primary key default uuid_generate_v4(),
    code text not null unique,
    name text not null,
    description text,
    total_papers integer,
    organization text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.certifications is 'Master list of certification programs (ACCA, US CMA, etc.).';
comment on column public.certifications.metadata is 'Certification-specific metadata (e.g., exam sequence, weightage).';
