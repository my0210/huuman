import type { AppSupabaseClient } from '@/lib/types';

/**
 * Chainable query mock -- every Supabase method returns `this` so
 * `.from().select().eq().maybeSingle()` chains resolve to `{ data, error }`.
 */
function createQueryBuilder(data: unknown = null) {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'upsert', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'or', 'order', 'limit',
    'single', 'maybeSingle',
  ];

  for (const m of methods) {
    builder[m] = () => builder;
  }

  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data, error: null, count: 0 });

  return builder;
}

export function createMockSupabase(overrides?: Record<string, unknown>): AppSupabaseClient {
  return {
    from: () => createQueryBuilder(overrides?.data ?? null),
    ...overrides,
  } as unknown as AppSupabaseClient;
}
