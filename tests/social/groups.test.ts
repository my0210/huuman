import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSocialMockSupabase, _error } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET, POST, PATCH } from '@/app/api/groups/route';

const USER_ID = 'user-1';
const OTHER_ID = 'user-2';

// ---------------------------------------------------------------------------
// GET /api/groups
// ---------------------------------------------------------------------------

describe('GET /api/groups', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no memberships', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: null },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups).toEqual([]);
  });

  it('returns groups with unread counts and members', async () => {
    const memberships = [
      { group_id: 'g-1', last_read_at: '2026-03-09T10:00:00Z', role: 'admin' },
    ];
    const groups = [
      { id: 'g-1', name: 'Gym crew', created_by: USER_ID, created_at: '2026-01-01' },
    ];
    const members = [
      {
        group_id: 'g-1',
        user_id: USER_ID,
        role: 'admin',
        user_profiles: { id: USER_ID, display_name: 'Mehmet', username: null },
      },
      {
        group_id: 'g-1',
        user_id: OTHER_ID,
        role: 'member',
        user_profiles: { id: OTHER_ID, display_name: 'Joshua', username: null },
      },
    ];
    const messages = [
      {
        id: 'msg-1',
        group_id: 'g-1',
        user_id: OTHER_ID,
        message_type: 'text',
        content: 'hey',
        created_at: '2026-03-10T12:00:00Z',
      },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // Call 1: membership check (own memberships)
          // Call 2: all members for the groups (parallel Promise.all)
          group_members: [memberships, members],
          groups: [groups],
          social_messages: [messages],
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].name).toBe('Gym crew');
    expect(body.groups[0].members).toHaveLength(2);
    expect(body.groups[0].unreadCount).toBe(1);
    expect(body.groups[0].lastMessage).toMatchObject({ content: 'hey' });
  });
});

// ---------------------------------------------------------------------------
// POST /api/groups
// ---------------------------------------------------------------------------

describe('POST /api/groups', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/groups', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST(makeReq({ name: 'Test', memberIds: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST(makeReq({ name: '', memberIds: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when memberIds is not an array', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST(makeReq({ name: 'Crew', memberIds: 'not-array' }));
    expect(res.status).toBe(400);
  });

  it('creates group with creator as admin', async () => {
    const created = { id: 'g-new', name: 'Gym crew', created_by: USER_ID, created_at: '2026-03-10' };

    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        // Insert into groups -> returns created group
        groups: [created],
        // Insert creator into group_members (no error) + insert other member (no error)
        group_members: [null, null],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST(makeReq({ name: 'Gym crew', memberIds: [OTHER_ID] }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.group).toMatchObject({ id: 'g-new', name: 'Gym crew' });

    const memberInserts = mock._calls.filter(c => c.table === 'group_members' && c.op === 'insert');
    expect(memberInserts).toHaveLength(2);
    expect(memberInserts[0].data).toMatchObject({ user_id: USER_ID, role: 'admin' });
    expect(memberInserts[1].data).toEqual(
      expect.arrayContaining([expect.objectContaining({ user_id: OTHER_ID, role: 'member' })]),
    );
  });

  it('rolls back group on creator insert failure', async () => {
    const created = { id: 'g-fail', name: 'Bad', created_by: USER_ID, created_at: '2026-03-10' };

    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        groups: [created, null],
        group_members: [_error('RLS violation')],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST(makeReq({ name: 'Bad', memberIds: [] }));
    expect(res.status).toBe(500);

    const deletes = mock._calls.filter(c => c.table === 'groups' && c.op === 'delete');
    expect(deletes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/groups
// ---------------------------------------------------------------------------

describe('PATCH /api/groups', () => {
  function makeReq(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/groups', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await PATCH(makeReq({ groupId: 'g-1', name: 'New' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when groupId is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await PATCH(makeReq({ name: 'New' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [{ role: 'member' }],
        },
      }),
    );

    const res = await PATCH(makeReq({ groupId: 'g-1', name: 'Renamed' }));
    expect(res.status).toBe(403);
  });

  it('admin can rename group', async () => {
    const updated = { id: 'g-1', name: 'Renamed crew' };

    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        // Call 1: membership check -> admin
        // Call 2: update name -> null (no error)
        group_members: [{ role: 'admin' }],
        groups: [null, updated],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await PATCH(makeReq({ groupId: 'g-1', name: 'Renamed crew' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.group).toMatchObject({ name: 'Renamed crew' });
  });

  it('admin can add and remove members', async () => {
    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        group_members: [{ role: 'admin' }, null, null],
        groups: [null, { id: 'g-1', name: 'Crew' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await PATCH(makeReq({
      groupId: 'g-1',
      addMemberIds: ['user-3'],
      removeMemberIds: ['user-4'],
    }));
    expect(res.status).toBe(200);

    const upserts = mock._calls.filter(c => c.table === 'group_members' && c.op === 'upsert');
    expect(upserts).toHaveLength(1);

    const deletes = mock._calls.filter(c => c.table === 'group_members' && c.op === 'delete');
    expect(deletes).toHaveLength(1);
  });
});
