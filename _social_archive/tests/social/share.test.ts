import { describe, expect, it, vi } from 'vitest';
import { createSocialMockSupabase } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/social/share/route';

const USER_ID = 'user-1';

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/social/share', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/social/share', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await POST(makeReq({ type: 'session_card', detail: {} }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown card type', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {},
      }),
    );

    const res = await POST(makeReq({ type: 'unknown_card', detail: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown');
  });

  it('shares a session_card successfully', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [[{ group_id: 'g-1' }]],
          social_messages: [null],
        },
      }),
    );

    const res = await POST(makeReq({
      type: 'session_card',
      detail: { sessionId: 's-1', domain: 'strength', title: 'Upper body' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shared).toBe(true);
  });

  it('shares a sleep_card successfully', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [[{ group_id: 'g-1' }]],
          social_messages: [null],
        },
      }),
    );

    const res = await POST(makeReq({
      type: 'sleep_card',
      detail: { hours: 7.5, quality: 4 },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shared).toBe(true);
  });

  it('shares a meal_card successfully', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [[{ group_id: 'g-1' }]],
          social_messages: [null],
        },
      }),
    );

    const res = await POST(makeReq({
      type: 'meal_card',
      detail: { calories: 600, proteinG: 45 },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shared).toBe(true);
  });

  it('shares a commitment_card successfully', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          group_members: [[{ group_id: 'g-1' }]],
          social_messages: [null],
        },
      }),
    );

    const res = await POST(makeReq({
      type: 'commitment_card',
      detail: { domain: 'strength', title: 'Leg day' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shared).toBe(true);
  });
});
