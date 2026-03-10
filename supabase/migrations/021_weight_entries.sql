-- 021_weight_entries.sql -- Weight timeline tracking (one entry per day)

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,1) not null,
  created_at timestamptz not null default now(),

  unique (user_id, date)
);

alter table public.weight_entries enable row level security;

create policy "Users can read own weight entries"
  on public.weight_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own weight entries"
  on public.weight_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weight entries"
  on public.weight_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own weight entries"
  on public.weight_entries for delete
  using (auth.uid() = user_id);

create index idx_weight_entries_user_date
  on public.weight_entries(user_id, date desc);
