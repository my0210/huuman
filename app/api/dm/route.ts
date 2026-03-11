import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recipientId } = await request.json();

  if (!recipientId || typeof recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 });
  }

  const { data: existingMemberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id);

  const myGroupIds = (existingMemberships ?? []).map((m) => m.group_id);

  if (myGroupIds.length > 0) {
    const { data: dmGroups } = await supabase
      .from('groups')
      .select('id')
      .in('id', myGroupIds)
      .eq('is_dm', true);

    for (const g of dmGroups ?? []) {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', g.id);

      const memberIds = (members ?? []).map((m) => m.user_id);
      if (memberIds.length === 2 && memberIds.includes(recipientId)) {
        return NextResponse.json({ groupId: g.id, existing: true });
      }
    }
  }

  const { data: recipient } = await supabase
    .from('user_profiles')
    .select('display_name, username')
    .eq('id', recipientId)
    .single();

  const dmName = recipient?.display_name || recipient?.username || 'DM';

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: dmName, created_by: user.id, is_dm: true })
    .select('id')
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: groupError?.message ?? 'Failed to create DM' }, { status: 500 });
  }

  await supabase.from('group_members').insert([
    { group_id: group.id, user_id: user.id, role: 'admin' },
    { group_id: group.id, user_id: recipientId, role: 'admin' },
  ]);

  return NextResponse.json({ groupId: group.id, existing: false }, { status: 201 });
}
