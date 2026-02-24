import { createClient } from '@/lib/supabase/server';
import { getOrCreateConversation, loadMessages, saveMessages } from '@/lib/chat/store';
import { createTools } from '@/lib/ai/tools';
import { getWeekStart } from '@/lib/types';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = user.id;
  const conversationId = await getOrCreateConversation(userId, supabase);

  const existing = await loadMessages(conversationId, supabase);
  if (existing.length > 0) {
    return Response.json({ seeded: false, reason: 'conversation_has_messages' });
  }

  const tools = createTools(userId, supabase);
  type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
  const execOpts = { toolCallId: 'seed', messages: [] as never[], abortSignal: new AbortController().signal };
  const todayData = await (tools.show_today_plan as unknown as ToolExec).execute({}, execOpts);

  const weekStart = getWeekStart();
  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('intro_message')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('status', 'active')
    .maybeSingle();

  const introText = plan?.intro_message || 'Your plan is ready. Here\'s what today looks like.';

  const messageId = crypto.randomUUID();
  const toolCallId = `seed-${crypto.randomUUID()}`;

  await saveMessages(conversationId, [{
    id: messageId,
    role: 'assistant',
    parts: [
      { type: 'text', text: introText },
      {
        type: 'tool-invocation',
        toolName: 'show_today_plan',
        toolCallId,
        args: {},
        state: 'output-available',
        output: todayData,
      },
    ],
  }], supabase);

  return Response.json({ seeded: true });
}
