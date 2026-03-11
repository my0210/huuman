import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSocialMockSupabase, _error } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/groups/[id]/read/route';

const USER_ID = 'user-1';
const GROUP_ID = 'group-1';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq() {
  return new NextRequest(`http://localhost/api/groups/${GROUP_ID}/read`, { method: 'POST' });
}

describe('POST /api/groups/[id]/read', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST(makeReq(), makeParams(GROUP_ID));
    expect(res.status).toBe(401);
  });

  it('marks group as read and returns lastReadAt', async () => {
    const updated = { last_read_at: '2026-03-10T14:00:00Z' };

    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [updated] },
      }),
    );

    const res = await POST(makeReq(), makeParams(GROUP_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.lastReadAt).toBe('2026-03-10T14:00:00Z');
  });

  it('returns 500 when update fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [_error('update failed')] },
      }),
    );

    const res = await POST(makeReq(), makeParams(GROUP_ID));
    expect(res.status).toBe(500);
  });

  it('returns 404 when user is not a member', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { group_members: [null] },
      }),
    );

    const res = await POST(makeReq(), makeParams(GROUP_ID));
    expect(res.status).toBe(404);
  });
});
