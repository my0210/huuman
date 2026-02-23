import { createAdminClient } from '@/lib/supabase/admin';
import { createUserScopedClient } from '@/lib/supabase/scoped';
import { createTools } from '@/lib/ai/tools';
import { sendMessage, sendLongMessage } from '@/lib/telegram/api';
import { formatTodayPlan } from '@/lib/telegram/formatters';

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from('user_profiles')
    .select('id, telegram_chat_id')
    .not('telegram_chat_id', 'is', null)
    .eq('onboarding_completed', true);

  if (!users || users.length === 0) {
    return Response.json({ sent: 0 });
  }

  let sent = 0;

  for (const user of users) {
    try {
      const chatId = Number(user.telegram_chat_id);
      const userClient = await createUserScopedClient(user.id);
      const tools = createTools(user.id, userClient);

      type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
      const execOpts = { toolCallId: 'cron', messages: [] as never[], abortSignal: new AbortController().signal };
      const todayResult = await (tools.show_today_plan as unknown as ToolExec).execute({}, execOpts);
      const data = todayResult as Record<string, unknown>;

      const sessions = data.sessions as Array<Record<string, unknown>> | undefined;
      if (!sessions || sessions.length === 0) continue;

      const pending = sessions.filter(s => s.status !== 'completed' && s.status !== 'skipped');
      if (pending.length === 0) continue;

      await sendMessage(chatId, '☀️ <b>Good morning</b>\nHere\'s your day.');

      const messages = formatTodayPlan(data);
      for (const msg of messages) {
        await sendLongMessage(chatId, msg.text, { reply_markup: msg.replyMarkup });
      }

      sent++;
    } catch (error) {
      console.error(`[Cron] Failed to send briefing to user ${user.id}:`, error);
    }
  }

  return Response.json({ sent, total: users.length });
}
