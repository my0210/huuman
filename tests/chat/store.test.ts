import { describe, expect, it } from 'vitest';
import type { DBMessage } from '@/lib/types';
import { convertToModelUIMessages } from '@/lib/chat/store';

function makeMessage(
  id: string,
  role: DBMessage['role'],
  parts: unknown[],
  createdAt = '2026-03-01T00:00:00.000Z',
): DBMessage {
  return {
    id,
    conversation_id: 'conv-1',
    role,
    parts,
    attachments: [],
    created_at: createdAt,
  };
}

describe('convertToModelUIMessages', () => {
  it('keeps only the latest message in same-role streaks', () => {
    const messages: DBMessage[] = [
      makeMessage('a1', 'assistant', [{ type: 'text', text: 'first assistant' }], '2026-03-01T00:00:00.000Z'),
      makeMessage('a2', 'assistant', [{ type: 'text', text: 'second assistant' }], '2026-03-01T00:00:01.000Z'),
      makeMessage('u1', 'user', [{ type: 'text', text: 'first user' }], '2026-03-01T00:00:02.000Z'),
      makeMessage('u2', 'user', [{ type: 'text', text: 'second user' }], '2026-03-01T00:00:03.000Z'),
      makeMessage('a3', 'assistant', [{ type: 'text', text: 'third assistant' }], '2026-03-01T00:00:04.000Z'),
    ];

    const converted = convertToModelUIMessages(messages);

    expect(converted.map((msg) => msg.id)).toEqual(['a2', 'u2', 'a3']);
  });

  it('drops tool parts for unregistered tools from history', () => {
    const messages: DBMessage[] = [
      makeMessage(
        'unknown-tool-only',
        'assistant',
        [{
          type: 'tool-search_web',
          args: { query: 'zone 2 benefits' },
          output: { summary: '...' },
          state: 'output-available',
        }],
      ),
      makeMessage(
        'known-tool',
        'assistant',
        [{
          type: 'tool-show_today_plan',
          args: { includeTracking: true },
          output: { hasPlan: true },
          state: 'output-available',
        }],
      ),
    ];

    const converted = convertToModelUIMessages(messages, new Set(['show_today_plan']));

    expect(converted).toHaveLength(1);
    expect(converted[0].id).toBe('known-tool');
    expect(converted[0].parts).toHaveLength(1);

    const part = converted[0].parts[0] as Record<string, unknown>;
    expect(part.type).toBe('tool-show_today_plan');
    expect(part.providerExecuted).toBe(true);
    expect(part.input).toEqual({ includeTracking: true });
    expect(typeof part.toolCallId).toBe('string');
    expect((part.toolCallId as string).length).toBeGreaterThan(0);
  });

  it('retains unknown historical tool parts when no registry is passed', () => {
    const messages: DBMessage[] = [
      makeMessage(
        'unknown-tool',
        'assistant',
        [{
          type: 'tool-search_web',
          args: { query: 'legacy tool name' },
          output: { ok: true },
          state: 'output-available',
        }],
      ),
    ];

    const converted = convertToModelUIMessages(messages);
    const part = converted[0].parts[0] as Record<string, unknown>;

    expect(converted).toHaveLength(1);
    expect(part.type).toBe('tool-search_web');
    expect(part.providerExecuted).toBe(true);
  });

  it('adds a text image_url annotation for non-data file URLs', () => {
    const imageUrl = 'https://cdn.example.com/photo.jpg';
    const messages: DBMessage[] = [
      makeMessage(
        'u1',
        'user',
        [{
          type: 'file',
          mediaType: 'image/jpeg',
          url: imageUrl,
        }],
      ),
    ];

    const converted = convertToModelUIMessages(messages);

    expect(converted).toHaveLength(1);
    expect(converted[0].parts).toHaveLength(2);
    expect(converted[0].parts[0]).toMatchObject({
      type: 'file',
      url: imageUrl,
    });
    expect(converted[0].parts[1]).toMatchObject({
      type: 'text',
      text: `[image_url: ${imageUrl}]`,
    });
  });

  it('replaces oversized base64 file URLs with image placeholder text', () => {
    const longDataUrl = `data:image/jpeg;base64,${'a'.repeat(50_001)}`;
    const messages: DBMessage[] = [
      makeMessage(
        'u1',
        'user',
        [{
          type: 'file',
          filename: 'checkin.jpg',
          url: longDataUrl,
        }],
      ),
    ];

    const converted = convertToModelUIMessages(messages);

    expect(converted).toHaveLength(1);
    expect(converted[0].parts).toHaveLength(1);
    expect(converted[0].parts[0]).toMatchObject({
      type: 'text',
      text: '[image: checkin.jpg]',
    });
  });
});
