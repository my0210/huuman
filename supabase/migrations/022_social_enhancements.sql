-- 022_social_enhancements.sql -- Reply/quote, soft delete, message editing, group improvements

-- =============================================================================
-- social_messages: add reply, edit, delete support
-- =============================================================================

alter table public.social_messages
  add column if not exists reply_to_id uuid references public.social_messages(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_social_messages_reply_to
  on public.social_messages(reply_to_id)
  where reply_to_id is not null;

-- Allow message authors to update their own messages (for edit and soft delete)
create policy "Authors can update own messages"
  on public.social_messages for update
  using (auth.uid() = user_id);

-- =============================================================================
-- groups: add metadata for DMs and sorting
-- =============================================================================

alter table public.groups
  add column if not exists is_dm boolean not null default false,
  add column if not exists last_message_at timestamptz,
  add column if not exists description text,
  add column if not exists avatar_url text;

create index if not exists idx_groups_last_message_at
  on public.groups(last_message_at desc nulls last);

-- =============================================================================
-- Update last_message_at on new messages via trigger
-- =============================================================================

create or replace function public.update_group_last_message_at()
returns trigger as $$
begin
  update public.groups
    set last_message_at = NEW.created_at
    where id = NEW.group_id;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_group_last_message_at on public.social_messages;
create trigger trg_update_group_last_message_at
  after insert on public.social_messages
  for each row execute function public.update_group_last_message_at();

-- Backfill last_message_at for existing groups
update public.groups g
  set last_message_at = (
    select max(sm.created_at)
    from public.social_messages sm
    where sm.group_id = g.id
  );

-- =============================================================================
-- groups: allow admins to delete groups
-- =============================================================================

create policy "Group admins can delete groups"
  on public.groups for delete
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );
