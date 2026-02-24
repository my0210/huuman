-- User context memory: categorized, time-scoped facts about the user.
-- Replaces rigid constraints JSONB for dynamic personalization.

create table public.user_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  category text not null check (category in ('physical', 'environment', 'equipment', 'schedule')),
  content text not null,
  scope text not null default 'permanent' check (scope in ('permanent', 'temporary')),
  expires_at date,
  active boolean not null default true,
  source text not null default 'conversation' check (source in ('onboarding', 'conversation')),
  created_at timestamptz not null default now()
);

alter table public.user_context enable row level security;

create policy "Users can read own context"
  on public.user_context for select using (auth.uid() = user_id);
create policy "Users can insert own context"
  on public.user_context for insert with check (auth.uid() = user_id);
create policy "Users can update own context"
  on public.user_context for update using (auth.uid() = user_id);
create policy "Users can delete own context"
  on public.user_context for delete using (auth.uid() = user_id);

create index idx_user_context_active on public.user_context (user_id) where active = true;
