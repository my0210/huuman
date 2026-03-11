import { describe, expect, it, vi } from 'vitest';
import { createSocialMockSupabase, _error, _count } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/social/init/route';

const USER_ID = 'user-1';

describe('GET /api/social/init', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns empty groups when user has no memberships', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [null],
          friendships: [_count(0)],
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups).toEqual([]);
    expect(body.pendingFriendRequests).toBe(0);
  });

  it('returns groups with unread counts and pending friend requests', async () => {
    const memberships = [
      { group_id: 'g-1', last_read_at: '2026-03-09T10:00:00Z', role: 'admin' },
    ];
    const groups = [
      { id: 'g-1', name: 'Gym crew', created_by: USER_ID },
    ];
    const members = [
      {
        group_id: 'g-1',
        user_id: USER_ID,
        role: 'admin',
        user_profiles: { display_name: 'Mehmet', username: null },
      },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          // fetchGroupsWithUnread calls:
          //   1. group_members.select().eq() -> memberships
          //   2. group_members.select().in() -> members (2nd call)
          // Per-group unread count query on social_messages:
          //   3. social_messages count query -> 1 unread
          // pendingResult:
          group_members: [memberships, members],
          groups: [groups],
          social_messages: [_count(1)],
          friendships: [_count(2)],
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].name).toBe('Gym crew');
    expect(body.groups[0].unreadCount).toBe(1);
    expect(body.pendingFriendRequests).toBe(2);
  });

  it('returns 500 when groups fetch fails', async () => {
    const memberships = [
      { group_id: 'g-1', last_read_at: null, role: 'member' },
    ];

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [memberships],
          groups: [_error('DB error')],
          social_messages: [_count(0)],
          friendships: [_count(0)],
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
