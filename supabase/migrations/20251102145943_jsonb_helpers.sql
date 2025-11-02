-- Task 2.18: JSONB helper functions to support schema evolution workflows

create or replace function public.jsonb_deep_merge(target jsonb, source jsonb)
returns jsonb as $$
select coalesce(target, '{}'::jsonb) || coalesce(source, '{}'::jsonb);
$$ language sql immutable;

create or replace function public.jsonb_strip_nulls(data jsonb)
returns jsonb as $$
select jsonb_object_agg(key, value)
from jsonb_each(data)
where value is not null;
$$ language sql immutable;

comment on function public.jsonb_deep_merge(jsonb, jsonb) is 'Merges two JSONB objects, preferring source values. Used for schema extension updates.';
comment on function public.jsonb_strip_nulls(jsonb) is 'Removes null-valued keys from JSONB payloads before storage.';
