-- 023_message_reads.sql -- Per-message read tracking for read receipts

create table public.message_reads (
  message_id uuid not null references public.social_messages(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  read_at timestamptz not null default now(),

  primary key (message_id, user_id)
);

alter table public.message_reads enable row level security;

create index idx_message_reads_message on public.message_reads(message_id);

create policy "Users can insert own reads"
  on public.message_reads for insert
  with check (auth.uid() = user_id);

create policy "Group members can read message reads"
  on public.message_reads for select
  using (
    exists (
      select 1
      from public.social_messages sm
      join public.group_members gm on gm.group_id = sm.group_id
      where sm.id = message_reads.message_id
        and gm.user_id = auth.uid()
    )
  );
