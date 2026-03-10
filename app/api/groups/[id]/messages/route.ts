import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: groupId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const before = searchParams.get('before');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100);

  const { data: membership } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }

  let query = supabase
    .from('social_messages')
    .select(`
      id,
      group_id,
      user_id,
      message_type,
      content,
      detail,
      media_url,
      media_duration_ms,
      created_at,
      sender:user_profiles!social_messages_user_id_fkey(display_name)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messageIds = (messages ?? []).map((m) => m.id);

  let reactionsByMessage = new Map<string, Record<string, { count: number; userReacted: boolean }>>();

  if (messageIds.length > 0) {
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', messageIds);

    for (const r of reactions ?? []) {
      const msgReactions = reactionsByMessage.get(r.message_id) ?? {};
      if (!msgReactions[r.emoji]) {
        msgReactions[r.emoji] = { count: 0, userReacted: false };
      }
      msgReactions[r.emoji].count++;
      if (r.user_id === user.id) {
        msgReactions[r.emoji].userReacted = true;
      }
      reactionsByMessage.set(r.message_id, msgReactions);
    }
  }

  const enriched = (messages ?? []).map((m) => ({
    id: m.id,
    groupId: m.group_id,
    userId: m.user_id,
    messageType: m.message_type,
    content: m.content,
    detail: m.detail,
    mediaUrl: m.media_url,
    mediaDurationMs: m.media_duration_ms,
    createdAt: m.created_at,
    sender: m.sender,
    reactions: reactionsByMessage.get(m.id) ?? {},
  }));

  return NextResponse.json({ messages: enriched });
}

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

  const { messageType, content, detail, mediaUrl, mediaDurationMs } = await request.json();

  if (!messageType || typeof messageType !== 'string') {
    return NextResponse.json({ error: 'messageType is required' }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from('social_messages')
    .insert({
      group_id: groupId,
      user_id: user.id,
      message_type: messageType,
      content: content ?? null,
      detail: detail ?? null,
      media_url: mediaUrl ?? null,
      media_duration_ms: mediaDurationMs ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const channel = supabase.channel(`group:${groupId}`);
    await channel.send({ type: 'broadcast', event: 'new_message', payload: message });
    supabase.removeChannel(channel);
  } catch { /* broadcast is best-effort */ }

  return NextResponse.json({ message }, { status: 201 });
}
