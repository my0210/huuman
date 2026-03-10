import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id, last_read_at, role')
    .eq('user_id', user.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!memberships?.length) {
    return NextResponse.json({ groups: [] });
  }

  const groupIds = memberships.map((m) => m.group_id);

  const [groupsRes, membersRes, messagesRes] = await Promise.all([
    supabase.from('groups').select('*').in('id', groupIds),
    supabase
      .from('group_members')
      .select('group_id, user_id, role, user_profiles(id, display_name, username)')
      .in('group_id', groupIds),
    supabase
      .from('social_messages')
      .select('id, group_id, user_id, message_type, content, created_at')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (groupsRes.error) {
    return NextResponse.json({ error: groupsRes.error.message }, { status: 500 });
  }

  const lastReadMap = new Map(
    memberships.map((m) => [m.group_id, m.last_read_at]),
  );

  const membersByGroup = new Map<string, Array<{ id: string; display_name: string; username: string; role: string }>>();
  for (const m of membersRes.data ?? []) {
    const profile = m.user_profiles as unknown as { id: string; display_name: string; username: string } | null;
    const list = membersByGroup.get(m.group_id) ?? [];
    list.push({
      id: profile?.id ?? m.user_id,
      display_name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      role: m.role,
    });
    membersByGroup.set(m.group_id, list);
  }

  type MsgRow = { id: string; group_id: string; user_id: string; message_type: string; content: string | null; created_at: string };
  const lastMessageByGroup = new Map<string, MsgRow>();
  const unreadByGroup = new Map<string, number>();
  for (const msg of messagesRes.data ?? []) {
    if (!lastMessageByGroup.has(msg.group_id)) {
      lastMessageByGroup.set(msg.group_id, msg);
    }
    const lastRead = lastReadMap.get(msg.group_id);
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      unreadByGroup.set(msg.group_id, (unreadByGroup.get(msg.group_id) ?? 0) + 1);
    }
  }

  const groups = (groupsRes.data ?? []).map((g) => {
    const lastMsg = lastMessageByGroup.get(g.id);
    return {
      ...g,
      unreadCount: unreadByGroup.get(g.id) ?? 0,
      members: membersByGroup.get(g.id) ?? [],
      lastMessage: lastMsg
        ? { id: lastMsg.id, senderId: lastMsg.user_id, messageType: lastMsg.message_type, content: lastMsg.content, createdAt: lastMsg.created_at }
        : null,
    };
  });

  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, memberIds } = await request.json();

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
  }

  if (!Array.isArray(memberIds)) {
    return NextResponse.json({ error: 'memberIds must be an array' }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 500 });
  }

  const { error: creatorError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id, role: 'admin' });

  if (creatorError) {
    return NextResponse.json({ error: creatorError.message }, { status: 500 });
  }

  const otherIds = (memberIds as string[]).filter((id) => id !== user.id);
  if (otherIds.length > 0) {
    const { error: membersError } = await supabase
      .from('group_members')
      .insert(otherIds.map((id) => ({ group_id: group.id, user_id: id, role: 'member' })));

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ group }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, name, addMemberIds, removeMemberIds } = await request.json();

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can update the group' }, { status: 403 });
  }

  if (name && typeof name === 'string') {
    const { error } = await supabase
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', groupId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Array.isArray(addMemberIds) && addMemberIds.length > 0) {
    const rows = addMemberIds.map((id: string) => ({
      group_id: groupId,
      user_id: id,
      role: 'member',
    }));
    const { error } = await supabase.from('group_members').upsert(rows, {
      onConflict: 'group_id,user_id',
      ignoreDuplicates: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Array.isArray(removeMemberIds) && removeMemberIds.length > 0) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .in('user_id', removeMemberIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: updatedGroup } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  return NextResponse.json({ group: updatedGroup });
}
