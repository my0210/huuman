import 'server-only';
import type { UIMessage } from 'ai';
import { generateId } from 'ai';
import type { AppSupabaseClient, DBMessage } from '@/lib/types';

export async function getOrCreateConversation(userId: string, supabase: AppSupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }

  return created.id;
}

export async function loadMessages(conversationId: string, supabase: AppSupabaseClient): Promise<DBMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data ?? []) as DBMessage[];
}

export async function saveMessages(
  conversationId: string,
  messages: Array<{ id: string; role: string; parts: unknown[]; attachments?: unknown[] }>,
  supabase: AppSupabaseClient,
): Promise<void> {
  const valid = messages.filter((msg) => msg.id && msg.id.length > 0);
  if (valid.length === 0) return;

  const rows = valid.map((msg) => ({
    id: msg.id,
    conversation_id: conversationId,
    role: msg.role,
    parts: msg.parts,
    attachments: msg.attachments ?? [],
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('messages')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[ChatStore] Failed to save messages:', error.message);
  }
}

export function convertToUIMessages(dbMessages: DBMessage[]): UIMessage[] {
  const noEmpty = dbMessages.filter((msg) => {
    const parts = msg.parts as unknown[];
    return parts && parts.length > 0;
  });
  const cleaned = trimOrphanedUserMessages(noEmpty);
  return cleaned.map((msg) => ({
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts: sanitizeParts(stripLargeFiles(msg.parts as UIMessage['parts'])),
    createdAt: new Date(msg.created_at),
  }));
}

const BASE64_THRESHOLD = 50_000;

function stripLargeFiles(parts: UIMessage['parts']): UIMessage['parts'] {
  return parts.map((p) => {
    const raw = p as Record<string, unknown>;
    if (raw.type === 'file' && typeof raw.url === 'string' && raw.url.length > BASE64_THRESHOLD) {
      return { ...raw, url: '', stripped: true } as unknown as typeof p;
    }
    return p;
  });
}

function sanitizeParts(parts: UIMessage['parts']): UIMessage['parts'] {
  return parts.map((p) => {
    const raw = p as Record<string, unknown>;

    if (raw.type === 'tool-invocation' && typeof raw.toolName === 'string') {
      raw.type = `tool-${raw.toolName}`;
      if (!('args' in raw && raw.args != null)) raw.args = {};
      if (!raw.toolCallId) raw.toolCallId = generateId();
      return raw as unknown as typeof p;
    }

    if (typeof raw.type === 'string' && raw.type.startsWith('tool-') && !raw.toolCallId) {
      return { ...raw, toolCallId: generateId() } as unknown as typeof p;
    }
    return p;
  });
}

/**
 * Converts DB messages to UIMessages suitable for passing to the AI agent.
 * Text and file parts are kept as-is. Tool parts are converted to short text
 * summaries so the agent knows which tools it called (and key results) without
 * the full output payloads that would blow the context window.
 */
export function convertToModelUIMessages(dbMessages: DBMessage[]): UIMessage[] {
  const noEmpty = dbMessages.filter((msg) => {
    const parts = msg.parts as unknown[];
    return parts && parts.length > 0;
  });
  const cleaned = trimOrphanedUserMessages(noEmpty);
  return cleaned.reduce<UIMessage[]>((acc, msg) => {
    const modelParts: UIMessage['parts'] = [];
    for (const p of msg.parts as UIMessage['parts']) {
      const raw = p as Record<string, unknown>;
      const t = raw.type as string;
      if (t === 'text' || t === 'file') {
        modelParts.push(p);
      } else if (typeof t === 'string' && t.startsWith('tool-')) {
        const summary = summarizeToolPart(raw);
        if (summary) {
          modelParts.push({ type: 'text', text: summary } as UIMessage['parts'][number]);
        }
      }
    }
    if (modelParts.length > 0) {
      acc.push({
        id: msg.id,
        role: msg.role as UIMessage['role'],
        parts: modelParts,
        createdAt: new Date(msg.created_at),
      } as UIMessage);
    }
    return acc;
  }, []);
}

function summarizeToolPart(raw: Record<string, unknown>): string | null {
  const toolName = (raw.type as string).replace('tool-', '');
  const output = raw.output as Record<string, unknown> | undefined;
  if (!output) return `[Called ${toolName}]`;

  switch (toolName) {
    case 'generate_plan':
      return `[Called generate_plan → ${output.isDraft ? 'draft' : 'active'} plan created, ${Array.isArray(output.sessions) ? output.sessions.length : '?'} sessions]`;
    case 'show_today_plan':
      return output.needsNewPlan
        ? '[Called show_today_plan → no plan for this week]'
        : `[Called show_today_plan → ${output.hasPlan ? 'plan shown' : 'no plan'}]`;
    case 'show_week_plan':
      return `[Called show_week_plan → ${output.hasPlan ? 'plan shown' : 'no plan'}]`;
    case 'show_progress':
      return '[Called show_progress → progress shown]';
    case 'confirm_plan':
      return `[Called confirm_plan → ${output.confirmed ? 'confirmed' : output.error ?? 'failed'}]`;
    case 'save_context':
      return '[Called save_context → saved]';
    case 'save_feedback':
      return '[Called save_feedback → saved]';
    default:
      return `[Called ${toolName}]`;
  }
}

function trimOrphanedUserMessages(messages: DBMessage[]): DBMessage[] {
  const result: DBMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (
      messages[i].role === 'user' &&
      i + 1 < messages.length &&
      messages[i + 1].role === 'user'
    ) {
      continue;
    }
    result.push(messages[i]);
  }
  return result;
}
