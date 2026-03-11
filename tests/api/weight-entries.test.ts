import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSocialMockSupabase, _error } from '../mocks/supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET, POST, DELETE } from '@/app/api/weight-entries/route';

const USER_ID = 'user-1';

function makeReq(method: 'POST' | 'DELETE', body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/weight-entries', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/weight-entries', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: null }),
    );

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('maps DB fields to API payload', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: {
          weight_entries: [[
            {
              id: 'w-1',
              date: '2026-03-10',
              weight_kg: '79.3',
              created_at: '2026-03-10T07:00:00Z',
            },
          ]],
        },
      }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.entries).toEqual([
      {
        id: 'w-1',
        date: '2026-03-10',
        weightKg: 79.3,
        createdAt: '2026-03-10T07:00:00Z',
      },
    ]);
  });
});

describe('POST /api/weight-entries', () => {
  it('returns 400 for out-of-range weight', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await POST(makeReq('POST', { weightKg: 19.9 }));
    expect(res.status).toBe(400);
  });

  it('upserts entry and syncs profile for latest date', async () => {
    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        weight_entries: [
          {
            id: 'w-2',
            date: '2026-03-11',
            weight_kg: '80.1',
            created_at: '2026-03-11T07:00:00Z',
          },
          { date: '2026-03-11' },
        ],
        user_profiles: [null],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST(makeReq('POST', { weightKg: 80.1, date: '2026-03-11' }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.entry).toMatchObject({
      id: 'w-2',
      date: '2026-03-11',
      weightKg: 80.1,
    });

    const profileUpdates = mock._calls.filter((c) => c.table === 'user_profiles' && c.op === 'update');
    expect(profileUpdates).toHaveLength(1);
    expect(profileUpdates[0].data).toEqual({ weight_kg: 80.1 });
  });

  it('does not sync profile for backfilled older date', async () => {
    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        weight_entries: [
          {
            id: 'w-3',
            date: '2026-03-01',
            weight_kg: '78.4',
            created_at: '2026-03-11T07:00:00Z',
          },
          { date: '2026-03-10' },
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await POST(makeReq('POST', { weightKg: 78.4, date: '2026-03-01' }));
    expect(res.status).toBe(200);

    const profileUpdates = mock._calls.filter((c) => c.table === 'user_profiles' && c.op === 'update');
    expect(profileUpdates).toHaveLength(0);
  });
});

describe('DELETE /api/weight-entries', () => {
  it('returns 400 when id is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({ userId: USER_ID }),
    );

    const res = await DELETE(makeReq('DELETE', {}));
    expect(res.status).toBe(400);
  });

  it('re-syncs profile from latest remaining entry', async () => {
    const mock = createSocialMockSupabase({
      userId: USER_ID,
      tables: {
        weight_entries: [null, { weight_kg: '77.8' }],
        user_profiles: [null],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const res = await DELETE(makeReq('DELETE', { id: 'w-1' }));
    expect(res.status).toBe(200);

    const profileUpdates = mock._calls.filter((c) => c.table === 'user_profiles' && c.op === 'update');
    expect(profileUpdates).toHaveLength(1);
    expect(profileUpdates[0].data).toEqual({ weight_kg: 77.8 });
  });

  it('returns 500 when delete fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSocialMockSupabase({
        userId: USER_ID,
        tables: { weight_entries: [_error('delete failed')] },
      }),
    );

    const res = await DELETE(makeReq('DELETE', { id: 'w-1' }));
    expect(res.status).toBe(500);
  });
});
