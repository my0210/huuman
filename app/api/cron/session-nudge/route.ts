import { createAdminClient } from '@/lib/supabase/admin';
import { createUserScopedClient } from '@/lib/supabase/scoped';
import { createTools } from '@/lib/ai/tools';
import { sendMessage, escapeHtml } from '@/lib/telegram/api';

export const maxDuration = 60;

const DOMAIN_ICON: Record<string, string> = {
  cardio: '❤️',
  strength: '🏋️',
  mindfulness: '🧠',
};

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
      const execOpts = { toolCallId: 'nudge', messages: [] as never[], abortSignal: new AbortController().signal };
      const todayResult = await (tools.show_today_plan as unknown as ToolExec).execute({}, execOpts);
      const data = todayResult as Record<string, unknown>;

      const sessions = (data.sessions as Array<Record<string, unknown>>) ?? [];
      const pending = sessions.filter(s => s.status !== 'completed' && s.status !== 'skipped');

      if (pending.length === 0) continue;

      for (const s of pending) {
        const icon = DOMAIN_ICON[s.domain as string] ?? '•';
        const title = escapeHtml(String(s.title));
        await sendMessage(chatId, `${icon} <b>${title}</b> still on the board today.`, {
          reply_markup: {
            inline_keyboard: [[
              { text: 'Done', callback_data: `act:complete:${s.id}` },
              { text: 'Skip', callback_data: `act:skip:${s.id}` },
              { text: '→ Tomorrow', callback_data: `act:tomorrow:${s.id}` },
            ]],
          },
        });
      }

      sent++;
    } catch (error) {
      console.error(`[Cron] Failed to send nudge to user ${user.id}:`, error);
    }
  }

  return Response.json({ sent, total: users.length });
}
