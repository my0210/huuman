import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: groupId } = await params;

  const { data: membership } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }

  const { messageIds } = await request.json();

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 });
  }

  const capped = messageIds.slice(0, 100);

  const rows = capped.map((id: string) => ({
    message_id: id,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from('message_reads')
    .upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const channel = supabase.channel(`group:${groupId}`);
    await channel.send({
      type: 'broadcast',
      event: 'messages_read',
      payload: { messageIds: capped, userId: user.id },
    });
    supabase.removeChannel(channel);
  } catch { /* best-effort */ }

  await supabase
    .from('group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  return NextResponse.json({ read: capped.length });
}
