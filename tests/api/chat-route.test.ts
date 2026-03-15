import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  createAgentUIStreamResponse: vi.fn(),
  generateId: vi.fn(),
  createCoachAgent: vi.fn(),
  createClient: vi.fn(),
  loadMessages: vi.fn(),
  saveMessages: vi.fn(),
  convertToModelUIMessages: vi.fn(),
  loadUserProfile: vi.fn(),
  getLanguageFromCookies: vi.fn(),
  uploadBase64ChatImage: vi.fn(),
  latestStreamOptions: null as Record<string, unknown> | null,
}));

vi.mock('ai', () => ({
  createAgentUIStreamResponse: mocked.createAgentUIStreamResponse,
  generateId: mocked.generateId,
}));

vi.mock('@/lib/ai/agent', () => ({
  createCoachAgent: mocked.createCoachAgent,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocked.createClient,
}));

vi.mock('@/lib/chat/store', () => ({
  loadMessages: mocked.loadMessages,
  saveMessages: mocked.saveMessages,
  convertToModelUIMessages: mocked.convertToModelUIMessages,
}));

vi.mock('@/lib/core/user', () => ({
  loadUserProfile: mocked.loadUserProfile,
}));

vi.mock('@/lib/languages', () => ({
  getLanguageFromCookies: mocked.getLanguageFromCookies,
}));

vi.mock('@/lib/images', () => ({
  uploadBase64ChatImage: mocked.uploadBase64ChatImage,
}));

const { POST } = await import('@/app/api/chat/route');

let supabase: { auth: { getUser: ReturnType<typeof vi.fn> } };
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { cookie: 'lang=en' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.latestStreamOptions = null;

  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-1' },
        },
      }),
    },
  };

  mocked.createClient.mockResolvedValue(supabase);
  mocked.loadUserProfile.mockResolvedValue({ timezone: 'UTC' });
  mocked.getLanguageFromCookies.mockReturnValue('en');
  mocked.createCoachAgent.mockReturnValue({ tools: { show_today_plan: {} } });
  mocked.loadMessages.mockResolvedValue([]);
  mocked.convertToModelUIMessages.mockReturnValue([]);

  mocked.createAgentUIStreamResponse.mockImplementation((options: Record<string, unknown>) => {
    mocked.latestStreamOptions = options;
    return new Response('stream', { status: 200 });
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('POST /api/chat', () => {
  it('returns 401 when no authenticated user exists', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(
      makeRequest({
        id: 'chat-1',
        message: { id: 'msg-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe('Unauthorized');
    expect(mocked.saveMessages).not.toHaveBeenCalled();
    expect(mocked.createAgentUIStreamResponse).not.toHaveBeenCalled();
  });

  it('uploads base64 file parts, removes empty text, and saves normalized user parts', async () => {
    mocked.uploadBase64ChatImage.mockResolvedValue('https://cdn.example.com/chat/photo-1.jpg');

    const response = await POST(
      makeRequest({
        id: 'chat-1',
        message: {
          id: 'msg-1',
          role: 'user',
          parts: [
            { type: 'text', text: '   ' },
            { type: 'file', data: 'Zm9vYmFy', mediaType: 'image/png' },
            { type: 'text', text: 'Progress check' },
          ],
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocked.uploadBase64ChatImage).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'Zm9vYmFy',
      'image/png',
    );

    expect(mocked.saveMessages).toHaveBeenCalledTimes(1);
    expect(mocked.saveMessages).toHaveBeenCalledWith(
      'chat-1',
      [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/png',
              url: 'https://cdn.example.com/chat/photo-1.jpg',
              filename: 'photo.jpg',
            },
            { type: 'text', text: 'Progress check' },
          ],
        },
      ],
      supabase,
    );
  });

  it('strips base64 payload and flags part when upload fails', async () => {
    mocked.uploadBase64ChatImage.mockRejectedValue(new Error('upload failed'));

    const response = await POST(
      makeRequest({
        id: 'chat-2',
        message: {
          id: 'msg-2',
          role: 'user',
          parts: [
            {
              type: 'file',
              data: 'c2VjcmV0',
              mediaType: 'image/jpeg',
              filename: 'selfie.jpg',
              source: 'camera',
            },
          ],
        },
      }),
    );

    expect(response.status).toBe(200);

    const saveArgs = mocked.saveMessages.mock.calls[0]?.[1] as Array<Record<string, unknown>>;
    const savedParts = saveArgs[0]?.parts as Array<Record<string, unknown>>;

    expect(savedParts).toHaveLength(1);
    expect(savedParts[0]).toMatchObject({
      type: 'file',
      mediaType: 'image/jpeg',
      filename: 'selfie.jpg',
      source: 'camera',
      stripped: true,
    });
    expect(savedParts[0]).not.toHaveProperty('data');
  });

  it('onFinish persists only new messages with non-empty parts', async () => {
    mocked.loadMessages.mockResolvedValue([
      {
        id: 'existing-message',
        role: 'assistant',
        parts: [{ type: 'text', text: 'already stored' }],
      },
    ]);

    await POST(
      makeRequest({
        id: 'chat-3',
        message: {
          id: 'incoming-assistant-message',
          role: 'assistant',
          parts: [{ type: 'text', text: 'noop for initial save path' }],
        },
      }),
    );

    const onFinish = mocked.latestStreamOptions?.onFinish as
      | ((args: { messages: Array<{ id: string; role: string; parts: unknown[] }> }) => Promise<void>)
      | undefined;

    expect(onFinish).toBeTypeOf('function');

    await onFinish?.({
      messages: [
        { id: 'existing-message', role: 'assistant', parts: [{ type: 'text', text: 'old' }] },
        { id: 'empty-message', role: 'assistant', parts: [] },
        { id: 'new-message', role: 'assistant', parts: [{ type: 'text', text: 'new output' }] },
      ],
    });

    expect(mocked.saveMessages).toHaveBeenCalledTimes(1);
    expect(mocked.saveMessages).toHaveBeenCalledWith(
      'chat-3',
      [
        {
          id: 'new-message',
          role: 'assistant',
          parts: [{ type: 'text', text: 'new output' }],
        },
      ],
      supabase,
    );
  });
});
