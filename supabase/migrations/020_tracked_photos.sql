-- 019_tracked_photos.sql -- AI-detected progress selfies and meal photos from chat

-- =============================================================================
-- progress_photos: body composition selfies tracked over time
-- =============================================================================

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  ai_analysis text not null,
  notes text,
  captured_at date not null default current_date,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

create policy "Users can read own progress photos"
  on public.progress_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress photos"
  on public.progress_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own progress photos"
  on public.progress_photos for delete
  using (auth.uid() = user_id);

create index idx_progress_photos_user_date
  on public.progress_photos(user_id, captured_at desc);

-- =============================================================================
-- meal_photos: meal/food photos with approximate nutritional estimates
-- =============================================================================

create table public.meal_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  description text not null,
  estimated_calories integer,
  estimated_protein_g integer,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  captured_at date not null default current_date,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.meal_photos enable row level security;

create policy "Users can read own meal photos"
  on public.meal_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal photos"
  on public.meal_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own meal photos"
  on public.meal_photos for delete
  using (auth.uid() = user_id);

create index idx_meal_photos_user_date
  on public.meal_photos(user_id, captured_at desc);
