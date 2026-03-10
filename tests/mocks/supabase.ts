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

// ---------------------------------------------------------------------------
// Social-flow mock: table-aware, auth-aware, tracks mutations
// ---------------------------------------------------------------------------

export interface MockCallRecord {
  table: string;
  op: 'insert' | 'update' | 'upsert' | 'delete';
  data?: unknown;
}

/**
 * Pass `{ _error: 'msg' }` as a table value to simulate a Supabase error.
 */
export const _error = (msg: string) => ({ __mockError: true, message: msg });

type TableValue = unknown;

export function createSocialMockSupabase(opts: {
  userId?: string | null;
  tables?: Record<string, TableValue | TableValue[]>;
}) {
  const calls: MockCallRecord[] = [];
  const tableCursors: Record<string, number> = {};

  function nextData(table: string): unknown {
    const idx = tableCursors[table] ?? 0;
    tableCursors[table] = idx + 1;
    const configured = opts.tables?.[table];
    if (Array.isArray(configured)) return configured[idx] ?? null;
    return configured ?? null;
  }

  function resolve(raw: unknown) {
    if (raw && typeof raw === 'object' && '__mockError' in (raw as Record<string, unknown>)) {
      return { data: null, error: { message: (raw as { message: string }).message }, count: 0 };
    }
    return { data: raw, error: null, count: 0 };
  }

  function trackedBuilder(table: string) {
    const data = nextData(table);
    const builder: Record<string, unknown> = {};
    const chainMethods = [
      'select', 'eq', 'neq', 'in', 'gte', 'lte', 'lt', 'gt',
      'or', 'not', 'order', 'limit', 'single', 'maybeSingle',
    ];

    for (const m of chainMethods) {
      builder[m] = () => builder;
    }

    builder.insert = (d: unknown) => { calls.push({ table, op: 'insert', data: d }); return builder; };
    builder.update = (d: unknown) => { calls.push({ table, op: 'update', data: d }); return builder; };
    builder.upsert = (d: unknown) => { calls.push({ table, op: 'upsert', data: d }); return builder; };
    builder.delete = () => { calls.push({ table, op: 'delete' }); return builder; };

    builder.then = (res: (v: unknown) => void) => res(resolve(data));

    return builder;
  }

  const channelSend = async () => 'ok';

  const mock = {
    auth: {
      getUser: async () => ({
        data: { user: opts.userId ? { id: opts.userId } : null },
        error: null,
      }),
    },
    from: (table: string) => trackedBuilder(table),
    channel: () => ({ send: channelSend }),
    removeChannel: () => {},
    _calls: calls,
  };

  return mock as unknown as AppSupabaseClient & { _calls: MockCallRecord[] };
}
