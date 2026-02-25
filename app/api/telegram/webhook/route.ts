import { randomBytes } from 'crypto';
import { convertToModelMessages } from 'ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserScopedClient } from '@/lib/supabase/scoped';
import { loadUserProfile } from '@/lib/core/user';
import { createCoachAgent } from '@/lib/ai/agent';
import { createTools } from '@/lib/ai/tools';
import { getOrCreateConversation, loadMessages, saveMessages, convertToModelUIMessages } from '@/lib/chat/store';
import {
  verifyWebhookSecret,
  sendMessage,
  sendChatAction,
  sendLongMessage,
  answerCallbackQuery,
  escapeHtml,
} from '@/lib/telegram/api';
import { formatToolOutput, type FormattedResponse } from '@/lib/telegram/formatters';
import {
  isInOnboarding,
  startOnboarding,
  handleOnboardingCallback,
  handleOnboardingText,
} from '@/lib/telegram/onboarding';

export const maxDuration = 60;

const activeLocks = new Set<string>();

async function sendFormatted(chatId: number, formatted: FormattedResponse | FormattedResponse[] | null): Promise<void> {
  if (!formatted) return;
  const items = Array.isArray(formatted) ? formatted : [formatted];
  for (const msg of items) {
    await sendLongMessage(chatId, msg.text, { reply_markup: msg.replyMarkup });
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!verifyWebhookSecret(secret)) {
    const expected = (process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim();
    console.error('[Webhook] Secret mismatch', {
      receivedLength: secret?.length,
      expectedLength: expected.length,
      receivedFirst4: secret?.slice(0, 4),
      expectedFirst4: expected.slice(0, 4),
    });
    return new Response('Forbidden', { status: 403 });
  }

  const update = await req.json();

  try {
    await handleUpdate(update);
  } catch (error) {
    console.error('[Webhook] handleUpdate error:', error);
  }

  return new Response('OK', { status: 200 });
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: Record<string, unknown>): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query as Record<string, unknown>);
      return;
    }

    if (update.message) {
      await handleMessage(update.message as Record<string, unknown>);
      return;
    }
  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
  }
}

// ─── Message handler ─────────────────────────────────────────────────────────

async function handleMessage(message: Record<string, unknown>): Promise<void> {
  const chat = message.chat as Record<string, unknown>;
  const chatId = Number(chat.id);
  const text = (message.text as string ?? '').trim();

  if (!text) return;

  const admin = createAdminClient();

  if (await isInOnboarding(chatId, admin)) {
    await handleOnboardingText(chatId, text, admin);
    return;
  }

  if (text.startsWith('/start')) {
    await handleStartCommand(chatId, text, admin);
    return;
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!profile) {
    await sendMessage(chatId, 'Send /start to create your account.');
    return;
  }

  if (!profile.onboarding_completed) {
    await startOnboarding(chatId, profile.id, admin);
    return;
  }

  if (text === '/today') {
    await handleQuickCommand(chatId, profile.id, 'show_today_plan');
    return;
  }
  if (text === '/week') {
    await handleQuickCommand(chatId, profile.id, 'show_week_plan');
    return;
  }
  if (text === '/progress') {
    await handleQuickCommand(chatId, profile.id, 'show_progress');
    return;
  }
  if (text === '/web') {
    const userProfile = await loadUserProfile(profile.id, admin);
    const email = escapeHtml(userProfile?.email ?? 'your registered email');
    await sendMessage(chatId, `Log in at huuman.vercel.app with your email (<b>${email}</b>). Use "Sign in with magic link" -- no password needed.`);
    return;
  }
  if (text.startsWith('/log')) {
    await handleLogCommand(chatId, profile.id, text);
    return;
  }

  await handleAgentMessage(chatId, profile.id, text);
}

// ─── /start command ──────────────────────────────────────────────────────────

async function handleStartCommand(chatId: number, text: string, admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const parts = text.split(' ');
  const code = parts[1]?.trim();

  if (code) {
    const { data: linkCode } = await admin
      .from('telegram_link_codes')
      .select('*')
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (linkCode) {
      await admin
        .from('user_profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', linkCode.user_id);

      await admin
        .from('telegram_link_codes')
        .delete()
        .eq('code', code);

      const profile = await loadUserProfile(linkCode.user_id, admin);
      if (profile?.onboardingCompleted) {
        await sendMessage(chatId, 'Connected! You can chat with your coach here now. Send a message or try /today.');
      } else {
        await sendMessage(chatId, 'Connected! Let\'s finish setting up your plan.');
        await startOnboarding(chatId, linkCode.user_id, admin);
      }
      return;
    }
  }

  const { data: existing } = await admin
    .from('user_profiles')
    .select('id, onboarding_completed')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (existing) {
    if (existing.onboarding_completed) {
      await handleQuickCommand(chatId, existing.id, 'show_today_plan');
    } else {
      await startOnboarding(chatId, existing.id, admin);
    }
    return;
  }

  const token = randomBytes(16).toString('base64url');

  await admin.from('telegram_registration_tokens').upsert({
    token,
    telegram_chat_id: chatId,
    user_id: null,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }, { onConflict: 'token' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://huuman.vercel.app';
  const registerUrl = `${siteUrl}/auth/register?token=${token}`;

  await sendMessage(chatId, 'Welcome to huuman -- your AI longevity coach.\n\nTap below to create your account.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Create Account', url: registerUrl }]],
    },
  });
}

// ─── Quick commands (/today, /week, /progress) ───────────────────────────────

async function handleQuickCommand(chatId: number, userId: string, toolName: string): Promise<void> {
  const userClient = await createUserScopedClient(userId);
  const tools = createTools(userId, userClient);

  const toolFn = tools[toolName as keyof typeof tools];
  if (!toolFn || !('execute' in toolFn)) return;

  await sendChatAction(chatId);

  const execute = (toolFn as unknown as { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> }).execute;
  const result = await execute({}, { toolCallId: 'cmd', messages: [], abortSignal: new AbortController().signal });

  await sendFormatted(chatId, formatToolOutput(toolName, result as Record<string, unknown>));
}

// ─── /log command ─────────────────────────────────────────────────────────────

async function handleLogCommand(chatId: number, userId: string, text: string): Promise<void> {
  const parts = text.split(/\s+/).slice(1);

  if (parts.length === 0) {
    await sendMessage(chatId,
      '<b>Usage</b>\n/log 8500 — log steps\n/log sleep 7.5 — sleep hours\n/log nutrition on — on-plan\n/log nutrition off — off-plan',
    );
    return;
  }

  const userClient = await createUserScopedClient(userId);
  const tools = createTools(userId, userClient);
  type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
  const execOpts = { toolCallId: 'log', messages: [] as never[], abortSignal: new AbortController().signal };

  const logArgs: Record<string, unknown> = {};

  if (parts[0] === 'sleep' && parts[1]) {
    const hours = parseFloat(parts[1]);
    if (isNaN(hours)) {
      await sendMessage(chatId, 'Usage: /log sleep 7.5');
      return;
    }
    logArgs.sleepHours = hours;
  } else if (parts[0] === 'nutrition') {
    const value = parts[1]?.toLowerCase();
    if (value === 'on') {
      logArgs.nutritionOnPlan = true;
    } else if (value === 'off') {
      logArgs.nutritionOnPlan = false;
    } else {
      await sendMessage(chatId, 'Usage: /log nutrition on  or  /log nutrition off');
      return;
    }
  } else {
    const arg = parts[0] === 'steps' ? parts[1] : parts[0];
    const steps = parseInt(String(arg), 10);
    if (isNaN(steps)) {
      await sendMessage(chatId,
        '<b>Usage</b>\n/log 8500 — log steps\n/log sleep 7.5 — sleep hours\n/log nutrition on — on-plan\n/log nutrition off — off-plan',
      );
      return;
    }
    logArgs.steps = steps;
  }

  const result = await (tools.log_daily as unknown as ToolExec).execute(logArgs, execOpts);
  await sendFormatted(chatId, formatToolOutput('log_daily', result as Record<string, unknown>));
}

// ─── Agent invocation ────────────────────────────────────────────────────────

async function handleAgentMessage(chatId: number, userId: string, text: string): Promise<void> {
  if (activeLocks.has(userId)) {
    await sendMessage(chatId, 'Still thinking about your last message...');
    return;
  }

  activeLocks.add(userId);
  const typingInterval = setInterval(() => sendChatAction(chatId), 4000);

  try {
    await sendChatAction(chatId);

    const userClient = await createUserScopedClient(userId);
    const chatConvoId = await getOrCreateConversation(userId, userClient);
    const dbMessages = await loadMessages(chatConvoId, userClient);
    const uiMessages = convertToModelUIMessages(dbMessages);

    await saveMessages(chatConvoId, [{
      id: `tg-${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text }],
    }], userClient);

    const profile = await loadUserProfile(userId, userClient);
    const agent = createCoachAgent(userId, profile, userClient);

    const modelMessages = await convertToModelMessages(uiMessages);
    const result = await agent.generate({
      messages: modelMessages,
      timeout: { totalMs: 55000 },
    });

    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        const tr = toolResult as unknown as { toolName: string; output: unknown; toolCallId: string; input: unknown };
        await sendFormatted(chatId, formatToolOutput(tr.toolName, tr.output as Record<string, unknown>));
      }
    }

    if (result.text) {
      await sendLongMessage(chatId, escapeHtml(result.text));
    }

    const assistantParts: unknown[] = [];
    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        const tr = toolResult as unknown as { toolName: string; input: unknown; output: unknown; toolCallId: string };
        assistantParts.push({
          type: 'tool-invocation',
          toolName: tr.toolName,
          toolCallId: tr.toolCallId,
          args: tr.input ?? {},
          state: 'output-available',
          output: tr.output,
        });
      }
    }
    if (result.text) {
      assistantParts.push({ type: 'text', text: result.text });
    }

    if (assistantParts.length > 0) {
      await saveMessages(chatConvoId, [{
        id: `tg-asst-${Date.now()}`,
        role: 'assistant',
        parts: assistantParts,
      }], userClient);
    }
  } catch (error) {
    console.error('[Webhook] Agent error:', error);
    await sendMessage(chatId, 'Something went wrong. Try again in a moment.');
  } finally {
    clearInterval(typingInterval);
    activeLocks.delete(userId);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findNextTodaySession(
  tools: ReturnType<typeof createTools>,
  excludeSessionId: string,
): Promise<Record<string, unknown> | undefined> {
  type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
  const opts = { toolCallId: 'cb-next', messages: [] as never[], abortSignal: new AbortController().signal };
  const todayResult = await (tools.show_today_plan as unknown as ToolExec).execute({}, opts);
  const sessions = ((todayResult as Record<string, unknown>).sessions as Array<Record<string, unknown>>) ?? [];
  return sessions.find(s => s.status !== 'completed' && s.status !== 'skipped' && String(s.id) !== excludeSessionId);
}

// ─── Callback query handler ──────────────────────────────────────────────────

async function handleCallbackQuery(query: Record<string, unknown>): Promise<void> {
  const callbackData = query.data as string;
  const queryId = query.id as string;
  const message = query.message as Record<string, unknown>;
  const chat = message.chat as Record<string, unknown>;
  const chatId = Number(chat.id);

  const admin = createAdminClient();

  if (callbackData.startsWith('ob:')) {
    await handleOnboardingCallback(chatId, callbackData, admin);
    await answerCallbackQuery(queryId);
    return;
  }

  if (callbackData.startsWith('act:')) {
    const [, action, sessionId] = callbackData.split(':');

    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    if (!profile) {
      await answerCallbackQuery(queryId, 'Account not found.');
      return;
    }

    const userClient = await createUserScopedClient(profile.id);
    const tools = createTools(profile.id, userClient);

    const execOpts = { toolCallId: 'cb', messages: [] as never[], abortSignal: new AbortController().signal };
    type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };

    if (action === 'complete') {
      const result = await (tools.complete_session as unknown as ToolExec).execute({ sessionId }, execOpts);
      const completionData = result as Record<string, unknown>;
      const next = await findNextTodaySession(tools, sessionId);
      if (next) completionData.nextSession = next;
      await sendFormatted(chatId, formatToolOutput('complete_session', completionData));
      await answerCallbackQuery(queryId, 'Done!');
    } else if (action === 'skip') {
      const result = await (tools.adapt_plan as unknown as ToolExec).execute({ sessionId, action: 'skip', reason: 'Skipped via Telegram' }, execOpts);
      const skipData = result as Record<string, unknown>;
      const next = await findNextTodaySession(tools, sessionId);
      if (next) skipData.nextSession = next;
      await sendFormatted(chatId, formatToolOutput('adapt_plan', skipData));
      await answerCallbackQuery(queryId, 'Skipped');
    } else if (action === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const newDate = tomorrow.toISOString().split('T')[0];
      const result = await (tools.adapt_plan as unknown as ToolExec).execute(
        { sessionId, action: 'reschedule', newDate, reason: 'Moved to tomorrow' },
        execOpts,
      );
      await sendFormatted(chatId, formatToolOutput('adapt_plan', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, 'Moved to tomorrow');
    } else if (action === 'detail') {
      const result = await (tools.show_session as unknown as ToolExec).execute({ sessionId }, execOpts);
      await sendFormatted(chatId, formatToolOutput('show_session', result as Record<string, unknown>));
      await answerCallbackQuery(queryId);
    }
    return;
  }

  if (callbackData.startsWith('checkin:')) {
    const parts = callbackData.split(':');
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    if (!profile) {
      await answerCallbackQuery(queryId, 'Account not found.');
      return;
    }

    const userClient = await createUserScopedClient(profile.id);
    const tools = createTools(profile.id, userClient);
    type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
    const execOpts = { toolCallId: 'checkin', messages: [] as never[], abortSignal: new AbortController().signal };

    if (parts[1] === 'nutrition') {
      const onPlan = parts[2] === 'on';
      const result = await (tools.log_daily as unknown as ToolExec).execute({ nutritionOnPlan: onPlan }, execOpts);
      await sendFormatted(chatId, formatToolOutput('log_daily', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, onPlan ? 'On plan ✓' : 'Logged');
    } else if (parts[1] === 'steps') {
      const steps = parseInt(parts[2], 10);
      const result = await (tools.log_daily as unknown as ToolExec).execute({ steps }, execOpts);
      await sendFormatted(chatId, formatToolOutput('log_daily', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, `${(steps / 1000).toFixed(0)}k steps ✓`);
    }
    return;
  }

  if (callbackData.startsWith('draft:')) {
    const parts = callbackData.split(':');
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    if (!profile) {
      await answerCallbackQuery(queryId, 'Account not found.');
      return;
    }

    const userClient = await createUserScopedClient(profile.id);
    const tools = createTools(profile.id, userClient);
    type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
    const execOpts = { toolCallId: 'draft', messages: [] as never[], abortSignal: new AbortController().signal };

    if (parts[1] === 'confirm') {
      const planId = parts[2];
      const result = await (tools.confirm_plan as unknown as ToolExec).execute({ planId }, execOpts);
      await sendFormatted(chatId, formatToolOutput('confirm_plan', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, 'Plan confirmed!');
    } else if (parts[1] === 'move') {
      const sessionId = parts[2];
      await sendMessage(chatId, 'Which day? Pick one:', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Mon', callback_data: `draft:moveto:${sessionId}:1` },
              { text: 'Tue', callback_data: `draft:moveto:${sessionId}:2` },
              { text: 'Wed', callback_data: `draft:moveto:${sessionId}:3` },
              { text: 'Thu', callback_data: `draft:moveto:${sessionId}:4` },
            ],
            [
              { text: 'Fri', callback_data: `draft:moveto:${sessionId}:5` },
              { text: 'Sat', callback_data: `draft:moveto:${sessionId}:6` },
              { text: 'Sun', callback_data: `draft:moveto:${sessionId}:0` },
            ],
          ],
        },
      });
      await answerCallbackQuery(queryId);
    } else if (parts[1] === 'moveto') {
      const sessionId = parts[2];
      const targetDow = parseInt(parts[3], 10);
      const { data: session } = await userClient
        .from('planned_sessions')
        .select('plan_id')
        .eq('id', sessionId)
        .eq('user_id', profile.id)
        .single();

      if (session) {
        const { data: plan } = await userClient
          .from('weekly_plans')
          .select('week_start')
          .eq('id', session.plan_id)
          .single();

        if (plan) {
          const weekStart = new Date(plan.week_start + 'T00:00:00');
          const daysFromMonday = targetDow === 0 ? 6 : targetDow - 1;
          const targetDate = new Date(weekStart);
          targetDate.setDate(weekStart.getDate() + daysFromMonday);
          const newDate = targetDate.toISOString().slice(0, 10);

          const result = await (tools.adapt_plan as unknown as ToolExec).execute(
            { sessionId, action: 'reschedule', newDate, reason: 'Moved via draft review' },
            execOpts,
          );
          await sendFormatted(chatId, formatToolOutput('adapt_plan', result as Record<string, unknown>));
        }
      }
      await answerCallbackQuery(queryId, 'Moved!');
    }
    return;
  }

  if (callbackData === 'cmd:today') {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();
    if (profile) {
      await handleQuickCommand(chatId, profile.id, 'show_today_plan');
    }
    await answerCallbackQuery(queryId);
    return;
  }

  await answerCallbackQuery(queryId);
}
