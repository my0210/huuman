import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { convertToUIMessages } from '@/lib/chat/store';
import type { DBMessage } from '@/lib/types';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');
  const before = searchParams.get('before');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const msgs = (data ?? []) as DBMessage[];
  msgs.reverse();
  const uiMessages = convertToUIMessages(msgs);

  return NextResponse.json({
    messages: uiMessages,
    hasMore: data?.length === limit,
  });
}
