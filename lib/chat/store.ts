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

/**
 * Strip legacy base64 data URLs that are too large for the UI.
 * Storage URLs (https://) pass through regardless of length.
 */
function stripLargeFiles(parts: UIMessage['parts']): UIMessage['parts'] {
  return parts.map((p) => {
    const raw = p as Record<string, unknown>;
    if (
      raw.type === 'file' &&
      typeof raw.url === 'string' &&
      raw.url.startsWith('data:') &&
      raw.url.length > BASE64_THRESHOLD
    ) {
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
 * Converts DB messages to UIMessages for the AI agent.
 * Text and file parts pass through. Completed tool parts are passed through
 * in SDK-native format with providerExecuted=true so the SDK inlines both
 * tool-call and tool-result in the same assistant message. This avoids
 * generating separate role:'tool' messages that the Anthropic provider
 * doesn't map to role:'user' tool_result blocks (vercel/ai #11855).
 * Unrecognized part types (step-start etc.) are filtered out.
 */
export function convertToModelUIMessages(dbMessages: DBMessage[]): UIMessage[] {
  const noEmpty = dbMessages.filter((msg) => {
    const parts = msg.parts as unknown[];
    return parts && parts.length > 0;
  });
  const cleaned = trimOrphanedUserMessages(noEmpty);
  return cleaned.reduce<UIMessage[]>((acc, msg) => {
    const modelParts = (msg.parts as UIMessage['parts'])
      .map((p) => {
        const raw = p as Record<string, unknown>;
        const t = raw.type as string;

        if (t === 'text' || t === 'file' || t === 'reasoning') return p;

        if (typeof t === 'string' && t.startsWith('tool-')) {
          if (!raw.toolCallId) raw.toolCallId = generateId();
          if (raw.args !== undefined && raw.input === undefined) {
            raw.input = raw.args;
          }
          raw.providerExecuted = true;
          return p;
        }

        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

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
