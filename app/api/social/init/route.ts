import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [groupsResult, pendingResult] = await Promise.all([
    fetchGroupsWithUnread(supabase, user.id),
    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('status', 'pending'),
  ]);

  if (groupsResult.error) {
    return NextResponse.json({ error: groupsResult.error }, { status: 500 });
  }

  return NextResponse.json({
    groups: groupsResult.data,
    pendingFriendRequests: pendingResult.count ?? 0,
  });
}

async function fetchGroupsWithUnread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id, last_read_at, role')
    .eq('user_id', userId);

  if (memberError || !memberships?.length) {
    return { data: [], error: memberError };
  }

  const groupIds = memberships.map((m) => m.group_id);

  const [groupsRes, membersRes, unreadRes] = await Promise.all([
    supabase.from('groups').select('*').in('id', groupIds),
    supabase
      .from('group_members')
      .select('group_id, user_id, role, user_profiles(display_name, username)')
      .in('group_id', groupIds),
    supabase
      .from('social_messages')
      .select('group_id, created_at')
      .in('group_id', groupIds),
  ]);

  if (groupsRes.error) return { data: [], error: groupsRes.error.message };

  const lastReadMap = new Map(
    memberships.map((m) => [m.group_id, m.last_read_at]),
  );

  const membersByGroup = new Map<string, Array<{ display_name: string; username: string; role: string }>>();
  for (const m of membersRes.data ?? []) {
    const profile = m.user_profiles as unknown as { display_name: string; username: string } | null;
    const list = membersByGroup.get(m.group_id) ?? [];
    list.push({
      display_name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      role: m.role,
    });
    membersByGroup.set(m.group_id, list);
  }

  const unreadByGroup = new Map<string, number>();
  for (const msg of unreadRes.data ?? []) {
    const lastRead = lastReadMap.get(msg.group_id);
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      unreadByGroup.set(msg.group_id, (unreadByGroup.get(msg.group_id) ?? 0) + 1);
    }
  }

  const groups = (groupsRes.data ?? []).map((g) => ({
    ...g,
    unreadCount: unreadByGroup.get(g.id) ?? 0,
    members: (membersByGroup.get(g.id) ?? []).slice(0, 5),
  }));

  return { data: groups, error: null };
}
