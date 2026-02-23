import { randomBytes } from 'crypto';
import { convertToModelMessages } from 'ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserScopedClient } from '@/lib/supabase/scoped';
import { loadUserProfile } from '@/lib/core/user';
import { createCoachAgent } from '@/lib/ai/agent';
import { createTools } from '@/lib/ai/tools';
import { getOrCreateConversation, loadMessages, saveMessages, convertToUIMessages } from '@/lib/chat/store';
import {
  verifyWebhookSecret,
  sendMessage,
  sendChatAction,
  sendLongMessage,
  answerCallbackQuery,
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
    await sendMessage(chatId, `Log in at huuman.vercel.app with your email (${userProfile?.email ?? 'your registered email'}). Use "Sign in with magic link" -- no password needed.`);
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

// ─── Agent invocation ────────────────────────────────────────────────────────

async function handleAgentMessage(chatId: number, userId: string, text: string): Promise<void> {
  if (activeLocks.has(userId)) {
    await sendMessage(chatId, 'Still thinking about your last message...');
    return;
  }

  activeLocks.add(userId);

  try {
    await sendChatAction(chatId);

    const userClient = await createUserScopedClient(userId);
    const chatConvoId = await getOrCreateConversation(userId, userClient);
    const dbMessages = await loadMessages(chatConvoId, userClient);
    const uiMessages = convertToUIMessages(dbMessages);

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
      await sendLongMessage(chatId, result.text);
    }

    const assistantParts: unknown[] = [];
    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        const tr = toolResult as unknown as { toolName: string; input: unknown; output: unknown; toolCallId: string };
        assistantParts.push({
          type: 'tool-invocation',
          toolName: tr.toolName,
          toolCallId: tr.toolCallId,
          args: tr.input,
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
    activeLocks.delete(userId);
  }
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
      await sendFormatted(chatId, formatToolOutput('complete_session', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, 'Done!');
    } else if (action === 'skip') {
      const result = await (tools.adapt_plan as unknown as ToolExec).execute({ sessionId, action: 'skip', reason: 'Skipped via Telegram' }, execOpts);
      await sendFormatted(chatId, formatToolOutput('adapt_plan', result as Record<string, unknown>));
      await answerCallbackQuery(queryId, 'Skipped');
    } else if (action === 'detail') {
      const result = await (tools.show_session as unknown as ToolExec).execute({ sessionId }, execOpts);
      await sendFormatted(chatId, formatToolOutput('show_session', result as Record<string, unknown>));
      await answerCallbackQuery(queryId);
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
