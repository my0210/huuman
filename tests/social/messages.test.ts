import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSocialMockSupabase } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET as GET_MESSAGES, POST as POST_MESSAGE } from '@/app/api/groups/[id]/messages/route';
import { POST as POST_REACTION } from '@/app/api/reactions/route';

const USER_ID = 'user-1';
const OTHER_ID = 'user-2';
const GROUP_ID = 'group-1';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// GET /api/groups/[id]/messages
// ---------------------------------------------------------------------------

describe('GET /api/groups/[id]/messages', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const req = new NextRequest(`http://localhost/api/groups/${GROUP_ID}/messages`);
    const res = await GET_MESSAGES(req, makeParams(GROUP_ID));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a group member', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [null] },
      }),
    );

    const req = new NextRequest(`http://localhost/api/groups/${GROUP_ID}/messages`);
    const res = await GET_MESSAGES(req, makeParams(GROUP_ID));
    expect(res.status).toBe(403);
  });

  it('returns paginated messages with reactions and sender info', async () => {
    const rawMessages = [
      {
        id: 'msg-1',
        group_id: GROUP_ID,
        user_id: OTHER_ID,
        message_type: 'text',
        content: 'hello',
        detail: null,
        media_url: null,
        media_duration_ms: null,
        created_at: '2026-03-10T12:00:00Z',
        sender: { display_name: 'Joshua' },
      },
      {
        id: 'msg-2',
        group_id: GROUP_ID,
        user_id: USER_ID,
        message_type: 'session_card',
        content: null,
        detail: { domain: 'strength', title: 'Upper body' },
        media_url: null,
        media_duration_ms: null,
        created_at: '2026-03-10T13:00:00Z',
        sender: { display_name: 'Mehmet' },
      },
    ];

    const reactions = [
      { message_id: 'msg-2', emoji: '🔥', user_id: OTHER_ID },
      { message_id: 'msg-2', emoji: '🔥', user_id: USER_ID },
      { message_id: 'msg-2', emoji: '👊', user_id: OTHER_ID },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [{ user_id: USER_ID }],
          social_messages: [rawMessages],
          message_reactions: [reactions],
        },
      }),
    );

    const req = new NextRequest(`http://localhost/api/groups/${GROUP_ID}/messages`);
    const res = await GET_MESSAGES(req, makeParams(GROUP_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.messages).toHaveLength(2);

    const msg1 = body.messages.find((m: { id: string }) => m.id === 'msg-1');
    expect(msg1.content).toBe('hello');
    expect(msg1.sender).toMatchObject({ display_name: 'Joshua' });

    const msg2 = body.messages.find((m: { id: string }) => m.id === 'msg-2');
    expect(msg2.reactions['🔥'].count).toBe(2);
    expect(msg2.reactions['🔥'].userReacted).toBe(true);
    expect(msg2.reactions['👊'].count).toBe(1);
    expect(msg2.reactions['👊'].userReacted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/groups/[id]/messages
// ---------------------------------------------------------------------------

describe('POST /api/groups/[id]/messages', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest(`http://localhost/api/groups/${GROUP_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST_MESSAGE(
      makeReq({ messageType: 'text', content: 'hi' }),
      makeParams(GROUP_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not a member', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [null] },
      }),
    );

    const res = await POST_MESSAGE(
      makeReq({ messageType: 'text', content: 'hi' }),
      makeParams(GROUP_ID),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when messageType is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [{ user_id: USER_ID }] },
      }),
    );

    const res = await POST_MESSAGE(
      makeReq({ content: 'hi' }),
      makeParams(GROUP_ID),
    );
    expect(res.status).toBe(400);
  });

  it('sends a text message and broadcasts', async () => {
    const inserted = {
      id: 'msg-new',
      group_id: GROUP_ID,
      user_id: USER_ID,
      message_type: 'text',
      content: 'hello team',
      created_at: '2026-03-10T14:00:00Z',
    };

    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        group_members: [{ user_id: USER_ID }],
        social_messages: [inserted],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST_MESSAGE(
      makeReq({ messageType: 'text', content: 'hello team' }),
      makeParams(GROUP_ID),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.message).toMatchObject({ id: 'msg-new', content: 'hello team' });

    const inserts = mock._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].data).toMatchObject({
      group_id: GROUP_ID,
      user_id: USER_ID,
      message_type: 'text',
      content: 'hello team',
    });
  });

  it('sends a session_card message with detail', async () => {
    const detail = { domain: 'strength', title: 'Upper body' };
    const inserted = {
      id: 'msg-card',
      group_id: GROUP_ID,
      user_id: USER_ID,
      message_type: 'session_card',
      detail,
      created_at: '2026-03-10T14:30:00Z',
    };

    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        group_members: [{ user_id: USER_ID }],
        social_messages: [inserted],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST_MESSAGE(
      makeReq({ messageType: 'session_card', detail }),
      makeParams(GROUP_ID),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.message.message_type).toBe('session_card');
  });
});

// ---------------------------------------------------------------------------
// POST /api/reactions
// ---------------------------------------------------------------------------

describe('POST /api/reactions', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/reactions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST_REACTION(makeReq({ messageId: 'msg-1', emoji: '🔥' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when messageId is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST_REACTION(makeReq({ emoji: '🔥' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when emoji is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST_REACTION(makeReq({ messageId: 'msg-1' }));
    expect(res.status).toBe(400);
  });

  it('adds a new reaction', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // First call: check existing -> null (no existing reaction)
          // Second call: insert -> null (success, no error)
          message_reactions: [null, null],
        },
      }),
    );

    const res = await POST_REACTION(makeReq({ messageId: 'msg-1', emoji: '🔥' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ added: true, emoji: '🔥' });
  });

  it('toggles off an existing reaction', async () => {
    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        // First call: check existing -> found
        // Second call: delete -> null (success)
        message_reactions: [{ id: 'r-1' }, null],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST_REACTION(makeReq({ messageId: 'msg-1', emoji: '🔥' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ added: false, emoji: '🔥' });

    const deletes = mock._calls.filter(c => c.table === 'message_reactions' && c.op === 'delete');
    expect(deletes).toHaveLength(1);
  });
});
