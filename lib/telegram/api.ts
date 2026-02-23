import { timingSafeEqual } from 'crypto';

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const API_BASE = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboard = InlineKeyboardButton[][];

export interface SendMessageOptions {
  parse_mode?: 'MarkdownV2' | 'HTML';
  reply_markup?: { inline_keyboard: InlineKeyboard };
}

interface TelegramResponse {
  ok: boolean;
  result?: Record<string, unknown>;
  description?: string;
}

// ─── Core API calls ──────────────────────────────────────────────────────────

async function call(method: string, body: Record<string, unknown>): Promise<TelegramResponse> {
  const res = await fetch(`${API_BASE()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as TelegramResponse;
  if (!data.ok) {
    console.error(`[Telegram] ${method} failed:`, data.description);
  }
  return data;
}

export async function sendMessage(
  chatId: number | bigint,
  text: string,
  options?: SendMessageOptions,
): Promise<TelegramResponse> {
  return call('sendMessage', {
    chat_id: Number(chatId),
    text,
    parse_mode: options?.parse_mode,
    reply_markup: options?.reply_markup,
  });
}

export async function editMessageText(
  chatId: number | bigint,
  messageId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<TelegramResponse> {
  return call('editMessageText', {
    chat_id: Number(chatId),
    message_id: messageId,
    text,
    parse_mode: options?.parse_mode,
    reply_markup: options?.reply_markup,
  });
}

export async function editMessageReplyMarkup(
  chatId: number | bigint,
  messageId: number,
  replyMarkup: { inline_keyboard: InlineKeyboard },
): Promise<TelegramResponse> {
  return call('editMessageReplyMarkup', {
    chat_id: Number(chatId),
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

export async function sendChatAction(
  chatId: number | bigint,
  action: 'typing' = 'typing',
): Promise<TelegramResponse> {
  return call('sendChatAction', {
    chat_id: Number(chatId),
    action,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<TelegramResponse> {
  return call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function setWebhook(
  url: string,
  secret: string,
): Promise<TelegramResponse> {
  return call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
  });
}

export async function deleteWebhook(): Promise<TelegramResponse> {
  return call('deleteWebhook', {});
}

// ─── Security ────────────────────────────────────────────────────────────────

export function verifyWebhookSecret(received: string | null): boolean {
  if (!received) return false;
  const expected = (process.env.TELEGRAM_WEBHOOK_SECRET ?? '').trim();
  if (!expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TG_LIMIT = 4096;

/**
 * Send a long message, splitting at newline boundaries if it exceeds
 * Telegram's 4096 character limit. Inline keyboard attaches to last chunk.
 */
export async function sendLongMessage(
  chatId: number | bigint,
  text: string,
  options?: SendMessageOptions,
): Promise<void> {
  if (text.length <= TG_LIMIT) {
    await sendMessage(chatId, text, options);
    return;
  }

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > TG_LIMIT) {
    const splitAt = remaining.lastIndexOf('\n', TG_LIMIT);
    const cut = splitAt > 0 ? splitAt : TG_LIMIT;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await sendMessage(chatId, chunks[i], isLast ? options : undefined);
  }
}
