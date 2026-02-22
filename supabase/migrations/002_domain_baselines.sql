-- Remove the vague fitness_level column and replace with structured domain baselines
alter table public.user_profiles drop column if exists fitness_level;

alter table public.user_profiles
  add column if not exists domain_baselines jsonb not null default '{}'::jsonb;
