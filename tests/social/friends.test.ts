import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createSocialMockSupabase } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET, POST, PATCH } from '@/app/api/friends/route';
import { GET as SEARCH } from '@/app/api/friends/search/route';

const USER_ID = 'user-1';
const OTHER_ID = 'user-2';

// ---------------------------------------------------------------------------
// GET /api/friends
// ---------------------------------------------------------------------------

describe('GET /api/friends', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns categorized friends, pendingReceived, pendingSent', async () => {
    const friendships = [
      {
        id: 'f-1',
        requester_id: USER_ID,
        recipient_id: OTHER_ID,
        status: 'active',
        created_at: '2026-01-01',
        accepted_at: '2026-01-02',
        requester: { id: USER_ID, display_name: 'Mehmet', username: null, email: 'm@test.com' },
        recipient: { id: OTHER_ID, display_name: 'Joshua', username: null, email: 'j@test.com' },
      },
      {
        id: 'f-2',
        requester_id: 'user-3',
        recipient_id: USER_ID,
        status: 'pending',
        created_at: '2026-02-01',
        accepted_at: null,
        requester: { id: 'user-3', display_name: 'Sarah', username: null, email: 's@test.com' },
        recipient: { id: USER_ID, display_name: 'Mehmet', username: null, email: 'm@test.com' },
      },
      {
        id: 'f-3',
        requester_id: USER_ID,
        recipient_id: 'user-4',
        status: 'pending',
        created_at: '2026-02-05',
        accepted_at: null,
        requester: { id: USER_ID, display_name: 'Mehmet', username: null, email: 'm@test.com' },
        recipient: { id: 'user-4', display_name: 'Tom', username: null, email: 't@test.com' },
      },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID, tables: { friendships: [friendships] } }),
    );

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.friends).toHaveLength(1);
    expect(body.friends[0].friendshipId).toBe('f-1');
    expect(body.friends[0].user.display_name).toBe('Joshua');

    expect(body.pendingReceived).toHaveLength(1);
    expect(body.pendingReceived[0].friendshipId).toBe('f-2');

    expect(body.pendingSent).toHaveLength(1);
    expect(body.pendingSent[0].friendshipId).toBe('f-3');
  });
});

// ---------------------------------------------------------------------------
// POST /api/friends
// ---------------------------------------------------------------------------

describe('POST /api/friends', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/friends', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST(makeReq({ recipientId: OTHER_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when recipientId is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when trying to friend yourself', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST(makeReq({ recipientId: USER_ID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('yourself');
  });

  it('returns 409 when friendship already exists', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // First from('friendships'): existing check returns a match
          // Second: insert (won't be reached)
          friendships: [{ id: 'f-existing', status: 'active' }],
        },
      }),
    );

    const res = await POST(makeReq({ recipientId: OTHER_ID }));
    expect(res.status).toBe(409);
  });

  it('creates a new friend request', async () => {
    const newFriendship = {
      id: 'f-new',
      requester_id: USER_ID,
      recipient_id: OTHER_ID,
      status: 'pending',
    };

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // First call: existing check returns null (no match)
          // Second call: insert returns the new friendship
          friendships: [null, newFriendship],
        },
      }),
    );

    const res = await POST(makeReq({ recipientId: OTHER_ID }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.friendship).toMatchObject({ id: 'f-new', status: 'pending' });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/friends
// ---------------------------------------------------------------------------

describe('PATCH /api/friends', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/friends', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-1', action: 'accept' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when params are missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid action', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-1', action: 'block' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when friendship not found', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { friendships: [null] },
      }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-missing', action: 'accept' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when requester tries to accept', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          friendships: [
            { id: 'f-1', requester_id: USER_ID, recipient_id: OTHER_ID, status: 'pending' },
          ],
        },
      }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-1', action: 'accept' }));
    expect(res.status).toBe(403);
  });

  it('accepts a pending request as recipient', async () => {
    const accepted = {
      id: 'f-1',
      requester_id: OTHER_ID,
      recipient_id: USER_ID,
      status: 'active',
      accepted_at: '2026-03-10',
    };

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // First call: fetch the friendship
          // Second call: update returns the accepted version
          friendships: [
            { id: 'f-1', requester_id: OTHER_ID, recipient_id: USER_ID, status: 'pending' },
            accepted,
          ],
        },
      }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-1', action: 'accept' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.friendship.status).toBe('active');
  });

  it('removes a friendship', async () => {
    const removed = { id: 'f-1', status: 'removed' };

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          friendships: [
            { id: 'f-1', requester_id: USER_ID, recipient_id: OTHER_ID, status: 'active' },
            removed,
          ],
        },
      }),
    );

    const res = await PATCH(makeReq({ friendshipId: 'f-1', action: 'remove' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.friendship.status).toBe('removed');
  });
});

// ---------------------------------------------------------------------------
// GET /api/friends/search
// ---------------------------------------------------------------------------

describe('GET /api/friends/search', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await SEARCH(new NextRequest('http://localhost/api/friends/search?q=josh'));
    expect(res.status).toBe(401);
  });

  it('returns empty array for empty query', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await SEARCH(new NextRequest('http://localhost/api/friends/search?q='));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([]);
  });

  it('returns matching users by name/email', async () => {
    const results = [
      { id: OTHER_ID, display_name: 'Joshua', email: 'josh@test.com' },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { user_profiles: [results] },
      }),
    );

    const res = await SEARCH(new NextRequest('http://localhost/api/friends/search?q=josh'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].display_name).toBe('Joshua');
  });
});
