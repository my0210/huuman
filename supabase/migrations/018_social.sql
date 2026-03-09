-- 018_social.sql -- Social layer: friends, groups, messaging, reactions

-- =============================================================================
-- user_profiles: add social columns
-- =============================================================================

alter table public.user_profiles
  add column if not exists display_name text,
  add column if not exists username text unique,
  add column if not exists sharing_enabled boolean not null default true;

create unique index if not exists idx_user_profiles_username
  on public.user_profiles(username) where username is not null;

-- Allow users to read other profiles (for friend search, group members display)
create policy "Users can read any profile basic info"
  on public.user_profiles for select using (true);

-- Drop the old self-only read policy (replaced by the broader one above)
drop policy if exists "Users can read own profile" on public.user_profiles;

-- =============================================================================
-- friendships
-- =============================================================================

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.user_profiles(id) on delete cascade,
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'removed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,

  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

alter table public.friendships enable row level security;

create policy "Users can read own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create policy "Users can insert friendships as requester"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Users can update own friendships"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

create index idx_friendships_requester on public.friendships(requester_id);
create index idx_friendships_recipient on public.friendships(recipient_id);

-- =============================================================================
-- groups
-- =============================================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Group members can read groups"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "Any user can create a group"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Group admins can update groups"
  on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- =============================================================================
-- group_members
-- =============================================================================

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),

  unique (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Group members can read membership"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group admins can insert members"
  on public.group_members for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create policy "Members can update own membership"
  on public.group_members for update
  using (auth.uid() = user_id);

create policy "Admins can delete members"
  on public.group_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create index idx_group_members_user on public.group_members(user_id);
create index idx_group_members_group on public.group_members(group_id);

-- =============================================================================
-- social_messages
-- =============================================================================

create table public.social_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  message_type text not null
    check (message_type in ('text', 'voice', 'photo', 'session_card', 'sleep_card', 'meal_card', 'commitment_card')),
  content text,
  detail jsonb,
  media_url text,
  media_duration_ms integer,
  created_at timestamptz not null default now()
);

alter table public.social_messages enable row level security;

create policy "Group members can read messages"
  on public.social_messages for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = social_messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can insert messages"
  on public.social_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = social_messages.group_id and gm.user_id = auth.uid()
    )
  );

create index idx_social_messages_group_time
  on public.social_messages(group_id, created_at desc);

-- =============================================================================
-- message_reactions
-- =============================================================================

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.social_messages(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),

  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "Group members can read reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.social_messages sm
      join public.group_members gm on gm.group_id = sm.group_id
      where sm.id = message_reactions.message_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can insert reactions"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.social_messages sm
      join public.group_members gm on gm.group_id = sm.group_id
      where sm.id = message_reactions.message_id and gm.user_id = auth.uid()
    )
  );

create policy "Users can delete own reactions"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

create index idx_message_reactions_message
  on public.message_reactions(message_id);

-- =============================================================================
-- Storage buckets for voice notes and photos
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('social-photos', 'social-photos', false)
on conflict (id) do nothing;

-- Storage policies for voice-notes
create policy "Users can upload voice notes"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read voice notes in their groups"
  on storage.objects for select
  using (bucket_id = 'voice-notes');

-- Storage policies for social-photos
create policy "Users can upload social photos"
  on storage.objects for insert
  with check (bucket_id = 'social-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read social photos in their groups"
  on storage.objects for select
  using (bucket_id = 'social-photos');
