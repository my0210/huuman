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
 * Converts DB messages to UIMessages suitable for passing to the AI agent.
 * Text and file parts pass through directly. Completed tool parts are
 * converted to a compact text summary so the model retains cross-turn
 * knowledge of tool results. Raw tool-invocation parts are NOT passed
 * through because createAgentUIStreamResponse cannot reliably convert
 * them to model messages.
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
        continue;
      }

      if (typeof t === 'string' && t.startsWith('tool-') && raw.state === 'output-available' && raw.output) {
        const toolName = (raw.toolName ?? t.slice(5)) as string;
        const summary = summarizeToolOutput(toolName, raw.output as Record<string, unknown>);
        if (summary) {
          modelParts.push({ type: 'text', text: summary } as unknown as typeof p);
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

function summarizeToolOutput(toolName: string, output: Record<string, unknown>): string | null {
  if (output.error) return `[${toolName} error: ${output.error}]`;

  switch (toolName) {
    case 'show_today_plan': {
      const sessions = output.sessions as Record<string, unknown>[] | undefined;
      const count = sessions?.length ?? 0;
      const completed = sessions?.filter(s => s.status === 'completed').length ?? 0;
      return `[show_today_plan: ${output.date}, ${count} sessions (${completed} done), needsNewPlan=${output.needsNewPlan}, hasDraftPlan=${output.hasDraftPlan}]`;
    }
    case 'show_week_plan': {
      const sessions = output.sessions as Record<string, unknown>[] | undefined;
      return `[show_week_plan: ${output.weekStart}, ${sessions?.length ?? 0} sessions, isDraft=${output.isDraft}, hasPlan=${output.hasPlan}]`;
    }
    case 'show_progress': {
      const progress = output.progress as Record<string, unknown>[] | undefined;
      const summary = progress?.map(p => `${p.domain}:${p.completed}/${p.total}`).join(', ') ?? '';
      return `[show_progress: ${output.weekStart}, ${summary}]`;
    }
    case 'show_session':
      return `[show_session: ${JSON.stringify(output.session ?? output).slice(0, 300)}]`;
    case 'complete_session':
      return `[complete_session: done]`;
    case 'log_session':
      return `[log_session: logged extra session]`;
    case 'log_daily':
      return `[log_daily: logged]`;
    case 'adapt_plan':
      return `[adapt_plan: ${output.action}]`;
    case 'delete_session':
      return `[delete_session: deleted ${output.deleted} session(s)]`;
    case 'generate_plan':
      return `[generate_plan: success=${output.success}, isDraft=${output.isDraft}]`;
    case 'confirm_plan':
      return `[confirm_plan: confirmed=${output.confirmed}]`;
    case 'save_context':
      return `[save_context: saved ${output.saved}, removed ${output.removed}]`;
    case 'save_feedback':
      return `[save_feedback: saved]`;
    case 'validate_plan':
      return `[validate_plan: ${JSON.stringify(output.validation ?? output).slice(0, 400)}]`;
    case 'get_sessions':
      return `[get_sessions: ${output.count} results: ${JSON.stringify(output.sessions ?? []).slice(0, 400)}]`;
    case 'get_habits':
      return `[get_habits: ${JSON.stringify(output.summary ?? output).slice(0, 300)}]`;
    case 'get_context':
      return `[get_context: ${output.count} items: ${JSON.stringify(output.context ?? []).slice(0, 300)}]`;
    default:
      return `[${toolName}: done]`;
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
