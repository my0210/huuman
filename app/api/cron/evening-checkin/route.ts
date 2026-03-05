import { createAdminClient } from '@/lib/supabase/admin';
import { createUserScopedClient } from '@/lib/supabase/scoped';
import { sendMessage } from '@/lib/telegram/api';
import { getTodayISO } from '@/lib/types';

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from('user_profiles')
    .select('id, telegram_chat_id, timezone')
    .not('telegram_chat_id', 'is', null)
    .eq('onboarding_completed', true);

  if (!users || users.length === 0) {
    return Response.json({ sent: 0 });
  }

  let sent = 0;

  for (const user of users) {
    try {
      const chatId = Number(user.telegram_chat_id);
      const tz = (user.timezone as string) ?? 'UTC';
      const today = getTodayISO(tz);
      const userClient = await createUserScopedClient(user.id);

      const { data: habits } = await userClient
        .from('daily_habits')
        .select('nutrition_on_plan, steps_actual, sleep_hours')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const needsNutrition = habits?.nutrition_on_plan == null;
      const needsSteps = habits?.steps_actual == null;

      if (!needsNutrition && !needsSteps) continue;

      if (needsNutrition) {
        await sendMessage(chatId, '<b>Quick check-in</b>\n\nNutrition today?', {
          reply_markup: {
            inline_keyboard: [[
              { text: '✓ On plan', callback_data: 'checkin:nutrition:on' },
              { text: '✗ Off plan', callback_data: 'checkin:nutrition:off' },
            ]],
          },
        });
      }

      if (needsSteps) {
        await sendMessage(chatId, 'How many steps today? Tap or type.', {
          reply_markup: {
            inline_keyboard: [[
              { text: '5k', callback_data: 'checkin:steps:5000' },
              { text: '8k', callback_data: 'checkin:steps:8000' },
              { text: '10k', callback_data: 'checkin:steps:10000' },
              { text: '12k+', callback_data: 'checkin:steps:12000' },
            ]],
          },
        });
      }

      sent++;
    } catch (error) {
      console.error(`[Cron] Failed to send check-in to user ${user.id}:`, error);
    }
  }

  return Response.json({ sent, total: users.length });
}
