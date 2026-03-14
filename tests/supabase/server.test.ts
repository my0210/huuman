import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateServerClient = vi.fn();
const mockCreateSupabaseClient = vi.fn();
const mockHeaders = vi.fn();
const mockCookies = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateSupabaseClient(...args),
}));

vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
  cookies: () => mockCookies(),
}));

import { createClient } from '@/lib/supabase/server';

describe('createClient (server supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('uses bearer token auth client when Authorization header is provided', async () => {
    const setSession = vi.fn().mockResolvedValue({ data: {}, error: null });
    const bearerClient = { auth: { setSession } };

    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === 'Authorization' ? 'Bearer token-123' : null),
    });
    mockCreateSupabaseClient.mockReturnValue(bearerClient);

    const result = await createClient();

    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      {
        global: { headers: { Authorization: 'Bearer token-123' } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'token-123',
      refresh_token: 'token-123',
    });
    expect(mockCreateServerClient).not.toHaveBeenCalled();
    expect(result).toBe(bearerClient);
  });

  it('falls back to cookie-based server client when bearer token is not present', async () => {
    const cookieStore = {
      getAll: vi.fn().mockReturnValue([{ name: 'sb-access-token', value: 'cookie-token' }]),
      set: vi.fn(),
    };
    const serverClient = { source: 'cookie' };

    mockHeaders.mockResolvedValue({ get: () => null });
    mockCookies.mockResolvedValue(cookieStore);
    mockCreateServerClient.mockReturnValue(serverClient);

    const result = await createClient();

    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1);

    const cookieOptions = mockCreateServerClient.mock.calls[0]?.[2] as {
      cookies: {
        getAll: () => unknown[];
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void;
      };
    };

    expect(cookieOptions.cookies.getAll()).toEqual([
      { name: 'sb-access-token', value: 'cookie-token' },
    ]);

    cookieOptions.cookies.setAll([
      { name: 'sb-refresh-token', value: 'new-token', options: { path: '/', httpOnly: true } },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith('sb-refresh-token', 'new-token', {
      path: '/',
      httpOnly: true,
    });
    expect(result).toBe(serverClient);
  });

  it('ignores cookie set errors in fallback mode', async () => {
    const cookieStore = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(() => {
        throw new Error('cannot set cookies in this context');
      }),
    };

    mockHeaders.mockResolvedValue({ get: () => null });
    mockCookies.mockResolvedValue(cookieStore);
    mockCreateServerClient.mockReturnValue({ source: 'cookie' });

    await createClient();

    const cookieOptions = mockCreateServerClient.mock.calls[0]?.[2] as {
      cookies: {
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void;
      };
    };

    expect(() => {
      cookieOptions.cookies.setAll([
        { name: 'sb-any', value: 'value', options: { path: '/' } },
      ]);
    }).not.toThrow();
  });

  it('falls back to cookie client for non-bearer Authorization schemes', async () => {
    mockHeaders.mockResolvedValue({ get: () => 'Basic abc123' });
    mockCookies.mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    });
    mockCreateServerClient.mockReturnValue({ source: 'cookie' });

    await createClient();

    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
  });
});
