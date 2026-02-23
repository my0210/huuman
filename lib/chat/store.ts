import 'server-only';
import type { UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import type { DBMessage } from '@/lib/types';

export async function getOrCreateConversation(userId: string): Promise<string> {
  const supabase = await createClient();

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

export async function loadMessages(conversationId: string): Promise<DBMessage[]> {
  const supabase = await createClient();

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
): Promise<void> {
  const valid = messages.filter((msg) => msg.id && msg.id.length > 0);
  if (valid.length === 0) return;

  const supabase = await createClient();

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
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts: msg.parts as UIMessage['parts'],
    createdAt: new Date(msg.created_at),
  }));
}
