-- 021_fix_rls_recursion.sql -- Fix infinite recursion in group_members RLS policies
-- Uses SECURITY DEFINER functions to bypass RLS when checking membership

CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = check_user_id AND role = 'admin'
  );
$$;

-- Drop old recursive policies
DROP POLICY IF EXISTS "Group members can read membership" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can insert members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.group_members;
DROP POLICY IF EXISTS "Group members can read groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group members can read messages" ON public.social_messages;
DROP POLICY IF EXISTS "Group members can insert messages" ON public.social_messages;
DROP POLICY IF EXISTS "Group members can read reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Group members can insert reactions" ON public.message_reactions;

-- Recreate using security definer functions (no recursion)
CREATE POLICY "Group members can read membership" ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can insert members" ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Admins can delete members" ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Group members can read groups" ON public.groups FOR SELECT
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Group admins can update groups" ON public.groups FOR UPDATE
  USING (public.is_group_admin(id, auth.uid()));

CREATE POLICY "Group members can read messages" ON public.social_messages FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can insert messages" ON public.social_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Group members can read reactions" ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_messages sm
      WHERE sm.id = message_reactions.message_id
      AND public.is_group_member(sm.group_id, auth.uid())
    )
  );

CREATE POLICY "Group members can insert reactions" ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.social_messages sm
      WHERE sm.id = message_reactions.message_id
      AND public.is_group_member(sm.group_id, auth.uid())
    )
  );
