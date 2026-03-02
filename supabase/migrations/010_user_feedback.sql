create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  category text not null check (category in ('bug', 'feature_request', 'experience')),
  content text not null,
  raw_quotes text[] not null default '{}',
  conversation_id uuid references conversations(id),
  created_at timestamptz default now()
);

alter table user_feedback enable row level security;

create policy "Users can insert own feedback"
  on user_feedback for insert with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on user_feedback for select using (auth.uid() = user_id);
