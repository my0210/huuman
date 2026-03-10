import { describe, expect, it } from 'vitest';
import type { DBMessage } from '@/lib/types';
import { convertToModelUIMessages } from '@/lib/chat/store';

function makeMessage(
  id: string,
  role: DBMessage['role'],
  parts: unknown[],
  createdAt = '2026-03-09T00:00:00.000Z',
): DBMessage {
  return { id, conversation_id: 'conv-1', role, parts, attachments: [], created_at: createdAt };
}

const PHOTO_TOOLS = new Set([
  'show_today_plan', 'save_progress_photo', 'get_progress_photos',
  'save_meal_photo', 'get_meal_photos',
]);

describe('image URL annotation for photo tools', () => {
  it('injects [image_url: ...] text part after storage URL images', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/chat-images/user-1/photo.jpg';
    const messages: DBMessage[] = [
      makeMessage('u1', 'user', [
        { type: 'text', text: 'Here is my progress photo' },
        { type: 'file', mediaType: 'image/jpeg', url, filename: 'photo.jpg' },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const parts = converted[0].parts as Record<string, unknown>[];

    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ type: 'text', text: 'Here is my progress photo' });
    expect((parts[1] as Record<string, unknown>).type).toBe('file');
    expect(parts[2]).toEqual({ type: 'text', text: `[image_url: ${url}]` });
  });

  it('does not inject annotation for base64 data URLs below threshold', () => {
    const smallDataUrl = 'data:image/jpeg;base64,/9j/short';
    const messages: DBMessage[] = [
      makeMessage('u2', 'user', [
        { type: 'file', mediaType: 'image/jpeg', url: smallDataUrl, filename: 'small.jpg' },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const parts = converted[0].parts as Record<string, unknown>[];

    expect(parts).toHaveLength(1);
    expect((parts[0] as Record<string, unknown>).type).toBe('file');
  });

  it('replaces large base64 data URLs with text placeholder (no annotation)', () => {
    const largeDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(60000);
    const messages: DBMessage[] = [
      makeMessage('u3', 'user', [
        { type: 'file', mediaType: 'image/jpeg', url: largeDataUrl, filename: 'big.jpg' },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const parts = converted[0].parts as Record<string, unknown>[];

    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({ type: 'text', text: '[image: big.jpg]' });
  });

  it('handles multiple images in one message', () => {
    const url1 = 'https://storage.example.com/front.jpg';
    const url2 = 'https://storage.example.com/back.jpg';
    const messages: DBMessage[] = [
      makeMessage('u4', 'user', [
        { type: 'text', text: 'Front and back' },
        { type: 'file', mediaType: 'image/jpeg', url: url1, filename: 'front.jpg' },
        { type: 'file', mediaType: 'image/jpeg', url: url2, filename: 'back.jpg' },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const parts = converted[0].parts as Record<string, unknown>[];

    // text + file + annotation + file + annotation = 5 parts
    expect(parts).toHaveLength(5);
    expect(parts[2]).toEqual({ type: 'text', text: `[image_url: ${url1}]` });
    expect(parts[4]).toEqual({ type: 'text', text: `[image_url: ${url2}]` });
  });

  it('file part without URL gets no annotation', () => {
    const messages: DBMessage[] = [
      makeMessage('u5', 'user', [
        { type: 'file', mediaType: 'image/jpeg', filename: 'nourl.jpg' },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const parts = converted[0].parts as Record<string, unknown>[];

    expect(parts).toHaveLength(1);
    expect((parts[0] as Record<string, unknown>).type).toBe('file');
  });

  it('photo tool parts are kept in history with providerExecuted', () => {
    const messages: DBMessage[] = [
      makeMessage('a1', 'assistant', [
        {
          type: 'tool-save_progress_photo',
          args: { imageUrl: 'https://example.com/pic.jpg', analysis: 'Good form' },
          output: { saved: true, id: 'p1', capturedAt: '2026-03-09' },
          state: 'output-available',
        },
      ]),
    ];

    const converted = convertToModelUIMessages(messages, PHOTO_TOOLS);
    const part = converted[0].parts[0] as Record<string, unknown>;

    expect(part.type).toBe('tool-save_progress_photo');
    expect(part.providerExecuted).toBe(true);
    expect(part.input).toEqual({ imageUrl: 'https://example.com/pic.jpg', analysis: 'Good form' });
  });

  it('photo tool parts are dropped when not in registered set', () => {
    const messages: DBMessage[] = [
      makeMessage('a2', 'assistant', [
        {
          type: 'tool-save_meal_photo',
          args: { imageUrl: 'https://example.com/meal.jpg', description: 'Pizza' },
          output: { saved: true },
          state: 'output-available',
        },
      ]),
    ];

    const noPhotoTools = new Set(['show_today_plan']);
    const converted = convertToModelUIMessages(messages, noPhotoTools);

    expect(converted).toHaveLength(0);
  });
});
