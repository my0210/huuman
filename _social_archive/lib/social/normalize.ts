import type { SocialMessage, ReactionSummary } from '@/lib/types';

export interface RawReactionMap {
  [emoji: string]: { count: number; userReacted: boolean };
}

export function normalizeReactions(raw: RawReactionMap | ReactionSummary[] | undefined): ReactionSummary[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw).map(([emoji, v]) => ({
    emoji,
    count: v.count,
    reacted: v.userReacted,
  }));
}

export function normalizeSender(sender: unknown): { displayName?: string; username?: string } | undefined {
  if (!sender || typeof sender !== 'object') return undefined;
  const s = sender as Record<string, unknown>;
  return {
    displayName: (s.displayName ?? s.display_name ?? undefined) as string | undefined,
    username: (s.username ?? undefined) as string | undefined,
  };
}

export function normalizeMessage(m: Record<string, unknown>): SocialMessage {
  return {
    id: m.id as string,
    groupId: (m.groupId ?? m.group_id) as string,
    userId: (m.userId ?? m.user_id ?? m.senderId ?? m.sender_id) as string,
    messageType: (m.messageType ?? m.message_type) as SocialMessage['messageType'],
    content: (m.content ?? undefined) as string | undefined,
    detail: (m.detail ?? undefined) as SocialMessage['detail'],
    mediaUrl: (m.mediaUrl ?? m.media_url ?? undefined) as string | undefined,
    mediaDurationMs: (m.mediaDurationMs ?? m.media_duration_ms ?? undefined) as number | undefined,
    replyToId: (m.replyToId ?? m.reply_to_id ?? undefined) as string | undefined,
    editedAt: (m.editedAt ?? m.edited_at ?? undefined) as string | undefined,
    deletedAt: (m.deletedAt ?? m.deleted_at ?? undefined) as string | undefined,
    createdAt: (m.createdAt ?? m.created_at) as string,
    sender: normalizeSender(m.sender),
    reactions: normalizeReactions(m.reactions as RawReactionMap | ReactionSummary[] | undefined),
    readCount: (m.readCount ?? m.read_count ?? 0) as number,
  };
}
