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
    parts: sanitizeParts(msg.parts as UIMessage['parts']),
    createdAt: new Date(msg.created_at),
  }));
}

function sanitizeParts(parts: UIMessage['parts']): UIMessage['parts'] {
  return parts.map((p) => {
    if (p.type === 'tool-invocation' && !('args' in p && p.args != null)) {
      return { ...p, args: {} } as unknown as typeof p;
    }
    const raw = p as Record<string, unknown>;
    if (typeof raw.type === 'string' && raw.type.startsWith('tool-') && !raw.toolCallId) {
      return { ...raw, toolCallId: generateId() } as unknown as typeof p;
    }
    return p;
  });
}

/**
 * Converts DB messages to UIMessages with only text/file parts,
 * suitable for passing to the AI agent. Tool and step-start parts
 * are stripped because legacy stored tool parts produce malformed
 * tool_use/tool_result sequences that Claude rejects.
 */
export function convertToModelUIMessages(dbMessages: DBMessage[]): UIMessage[] {
  const noEmpty = dbMessages.filter((msg) => {
    const parts = msg.parts as unknown[];
    return parts && parts.length > 0;
  });
  const cleaned = trimOrphanedUserMessages(noEmpty);
  return cleaned.reduce<UIMessage[]>((acc, msg) => {
    const textParts = (msg.parts as UIMessage['parts']).filter((p) => {
      const t = (p as Record<string, unknown>).type as string;
      return t === 'text' || t === 'file';
    });
    if (textParts.length > 0) {
      acc.push({
        id: msg.id,
        role: msg.role as UIMessage['role'],
        parts: textParts,
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
