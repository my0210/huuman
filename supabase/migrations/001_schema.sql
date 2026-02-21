-- Huuman v0.1 Initial Schema
-- All tables use RLS scoped to auth.uid()

-- =============================================================================
-- User Profiles
-- =============================================================================

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  age integer,
  weight_kg numeric(5,1),
  fitness_level text not null default 'beginner'
    check (fitness_level in ('sedentary', 'beginner', 'intermediate', 'advanced')),
  goals jsonb not null default '{"primary": []}'::jsonb,
  constraints jsonb not null default '{
    "schedule": {"blockedTimes": [], "preferredWorkoutTimes": []},
    "equipment": {"gymAccess": false, "homeEquipment": [], "outdoorAccess": true},
    "limitations": {"injuries": [], "medical": []}
  }'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = id);

-- =============================================================================
-- Weekly Plans
-- =============================================================================

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  week_start date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  intro_message text,
  generation_context jsonb,
  created_at timestamptz not null default now(),

  unique (user_id, week_start)
);

alter table public.weekly_plans enable row level security;

create policy "Users can read own plans"
  on public.weekly_plans for select using (auth.uid() = user_id);
create policy "Users can insert own plans"
  on public.weekly_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own plans"
  on public.weekly_plans for update using (auth.uid() = user_id);

-- =============================================================================
-- Planned Sessions
-- =============================================================================

create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  domain text not null
    check (domain in ('cardio', 'strength', 'nutrition', 'mindfulness', 'sleep')),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  scheduled_date date not null,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped')),
  detail jsonb not null,          -- full session prescription
  completed_detail jsonb,          -- actual values on completion
  completed_at timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.planned_sessions enable row level security;

create policy "Users can read own sessions"
  on public.planned_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.planned_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on public.planned_sessions for update using (auth.uid() = user_id);

create index idx_sessions_plan on public.planned_sessions(plan_id);
create index idx_sessions_user_date on public.planned_sessions(user_id, scheduled_date);

-- =============================================================================
-- Daily Habits
-- =============================================================================

create table public.daily_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  date date not null,
  steps_actual integer,
  steps_target integer not null default 10000,
  nutrition_on_plan boolean,
  sleep_hours numeric(3,1),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  created_at timestamptz not null default now(),

  unique (user_id, date)
);

alter table public.daily_habits enable row level security;

create policy "Users can read own habits"
  on public.daily_habits for select using (auth.uid() = user_id);
create policy "Users can insert own habits"
  on public.daily_habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits"
  on public.daily_habits for update using (auth.uid() = user_id);

-- =============================================================================
-- Conversations
-- =============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users can read own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);

-- =============================================================================
-- Messages
-- =============================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can read own messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "Users can insert own messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- =============================================================================
-- Auto-create profile on signup
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
