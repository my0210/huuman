import { describe, expect, it } from 'vitest';
import { normalizeReactions, normalizeSender, normalizeMessage } from '@/lib/social/normalize';

describe('normalizeReactions', () => {
  it('converts object map to ReactionSummary array', () => {
    const raw = {
      '🔥': { count: 3, userReacted: true },
      '👊': { count: 1, userReacted: false },
    };

    const result = normalizeReactions(raw);
    expect(result).toEqual([
      { emoji: '🔥', count: 3, reacted: true },
      { emoji: '👊', count: 1, reacted: false },
    ]);
  });

  it('passes through an existing array unchanged', () => {
    const arr = [{ emoji: '🔥', count: 2, reacted: false }];
    expect(normalizeReactions(arr)).toBe(arr);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeReactions(undefined)).toEqual([]);
  });

  it('returns empty array for null-ish input', () => {
    expect(normalizeReactions(null as unknown as undefined)).toEqual([]);
  });

  it('handles empty object map', () => {
    expect(normalizeReactions({})).toEqual([]);
  });
});

describe('normalizeSender', () => {
  it('normalizes camelCase displayName', () => {
    expect(normalizeSender({ displayName: 'Mehmet' })).toEqual({
      displayName: 'Mehmet',
      username: undefined,
    });
  });

  it('normalizes snake_case display_name', () => {
    expect(normalizeSender({ display_name: 'Joshua' })).toEqual({
      displayName: 'Joshua',
      username: undefined,
    });
  });

  it('prefers camelCase over snake_case', () => {
    expect(normalizeSender({ displayName: 'Camel', display_name: 'Snake' }))
      .toMatchObject({ displayName: 'Camel' });
  });

  it('includes username when present', () => {
    expect(normalizeSender({ displayName: 'M', username: 'mehmet' }))
      .toEqual({ displayName: 'M', username: 'mehmet' });
  });

  it('returns undefined for null', () => {
    expect(normalizeSender(null)).toBeUndefined();
  });

  it('returns undefined for non-object', () => {
    expect(normalizeSender('string')).toBeUndefined();
    expect(normalizeSender(42)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeSender(undefined)).toBeUndefined();
  });
});

describe('normalizeMessage', () => {
  const base = {
    id: 'msg-1',
    groupId: 'g-1',
    userId: 'u-1',
    messageType: 'text',
    content: 'hello',
    createdAt: '2026-03-10T12:00:00Z',
  };

  it('maps camelCase fields directly', () => {
    const msg = normalizeMessage(base);
    expect(msg.id).toBe('msg-1');
    expect(msg.groupId).toBe('g-1');
    expect(msg.userId).toBe('u-1');
    expect(msg.messageType).toBe('text');
    expect(msg.content).toBe('hello');
    expect(msg.createdAt).toBe('2026-03-10T12:00:00Z');
  });

  it('maps snake_case fields', () => {
    const msg = normalizeMessage({
      id: 'msg-2',
      group_id: 'g-2',
      user_id: 'u-2',
      message_type: 'photo',
      media_url: 'https://example.com/pic.jpg',
      media_duration_ms: 5000,
      created_at: '2026-03-10T13:00:00Z',
    });

    expect(msg.groupId).toBe('g-2');
    expect(msg.userId).toBe('u-2');
    expect(msg.messageType).toBe('photo');
    expect(msg.mediaUrl).toBe('https://example.com/pic.jpg');
    expect(msg.mediaDurationMs).toBe(5000);
    expect(msg.createdAt).toBe('2026-03-10T13:00:00Z');
  });

  it('falls back through userId -> user_id -> senderId -> sender_id', () => {
    expect(normalizeMessage({ ...base, userId: undefined, senderId: 'via-sender' }).userId)
      .toBe('via-sender');

    expect(normalizeMessage({ ...base, userId: undefined, sender_id: 'via-snake-sender' }).userId)
      .toBe('via-snake-sender');
  });

  it('normalizes embedded sender', () => {
    const msg = normalizeMessage({ ...base, sender: { display_name: 'Josh' } });
    expect(msg.sender).toEqual({ displayName: 'Josh', username: undefined });
  });

  it('normalizes embedded reactions map', () => {
    const msg = normalizeMessage({
      ...base,
      reactions: { '🔥': { count: 2, userReacted: true } },
    });
    expect(msg.reactions).toEqual([{ emoji: '🔥', count: 2, reacted: true }]);
  });

  it('defaults optional fields to undefined', () => {
    const msg = normalizeMessage({
      id: 'msg-3',
      group_id: 'g-3',
      user_id: 'u-3',
      message_type: 'text',
      created_at: '2026-03-10T14:00:00Z',
    });

    expect(msg.content).toBeUndefined();
    expect(msg.detail).toBeUndefined();
    expect(msg.mediaUrl).toBeUndefined();
    expect(msg.mediaDurationMs).toBeUndefined();
    expect(msg.sender).toBeUndefined();
    expect(msg.reactions).toEqual([]);
  });
});
