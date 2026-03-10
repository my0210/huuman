import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTools } from '@/lib/ai/tools';
import type { AppSupabaseClient } from '@/lib/types';

function createPhotoMockSupabase(options: {
  insertData?: Record<string, unknown>;
  insertError?: { message: string };
  selectData?: Record<string, unknown>[];
  selectError?: { message: string };
  countResult?: number;
} = {}): AppSupabaseClient {
  const {
    insertData = { id: 'photo-1' },
    insertError,
    selectData = [],
    selectError,
    countResult = 1,
  } = options;

  const chainable = () => {
    const builder: Record<string, unknown> = {};
    let mode: 'insert' | 'select' = 'select';

    const methods = ['eq', 'neq', 'in', 'gte', 'lte', 'or', 'order', 'limit'];
    for (const m of methods) {
      builder[m] = () => builder;
    }

    builder.select = (...args: unknown[]) => {
      const opts = args[1] as Record<string, unknown> | undefined;
      if (opts?.count === 'exact' && opts?.head === true) {
        return { data: null, error: null, count: countResult };
      }
      if (mode === 'insert') {
        return builder;
      }
      mode = 'select';
      return builder;
    };

    builder.insert = (row: unknown) => {
      void row;
      mode = 'insert';
      return builder;
    };

    builder.single = () => {
      if (mode === 'insert') {
        return { data: insertError ? null : insertData, error: insertError ?? null };
      }
      return { data: selectData[0] ?? null, error: selectError ?? null };
    };

    builder.then = (resolve: (v: unknown) => void) => {
      if (selectError) return resolve({ data: null, error: selectError });
      return resolve({ data: selectData, error: null, count: countResult });
    };

    return builder;
  };

  return {
    from: () => chainable(),
  } as unknown as AppSupabaseClient;
}

describe('save_progress_photo', () => {
  it('saves with today as default date', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'pp-1' }, 3);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_progress_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({
      imageUrl: 'https://storage.example.com/photo.jpg',
      analysis: 'Good posture, visible deltoid definition',
    });

    expect(result.saved).toBe(true);
    expect(result.id).toBe('pp-1');
    expect(result.imageUrl).toBe('https://storage.example.com/photo.jpg');
    expect(result.totalCount).toBe(3);
    expect(result.capturedAt).toBeTruthy();
    expect(typeof result.capturedAt).toBe('string');
  });

  it('uses provided capturedAt for past-dated photos', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'pp-2' }, 5);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_progress_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({
      imageUrl: 'https://storage.example.com/old.jpg',
      analysis: 'Baseline photo',
      capturedAt: '2025-12-01',
    });

    expect(result.capturedAt).toBe('2025-12-01');
    expect(insertedRows[0]?.captured_at).toBe('2025-12-01');
  });

  it('passes notes through when provided', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'pp-3' }, 1);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_progress_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    await exec({
      imageUrl: 'https://storage.example.com/pic.jpg',
      analysis: 'Analysis text',
      notes: '12 weeks into cut',
    });

    expect(insertedRows[0]?.notes).toBe('12 weeks into cut');
  });

  it('returns error on insert failure', async () => {
    const supabase = createPhotoMockSupabase({ insertError: { message: 'DB error' } });
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_progress_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({
      imageUrl: 'https://example.com/fail.jpg',
      analysis: 'test',
    });

    expect(result.error).toBe('DB error');
  });
});

describe('save_meal_photo', () => {
  it('saves with today as default date', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'mp-1' }, 0);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_meal_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({
      imageUrl: 'https://storage.example.com/meal.jpg',
      description: 'Grilled chicken with rice',
      estimatedCalories: 650,
      estimatedProteinG: 45,
      mealType: 'lunch',
    });

    expect(result.saved).toBe(true);
    expect(result.id).toBe('mp-1');
    expect(result.capturedAt).toBeTruthy();
  });

  it('uses provided capturedAt for past meals', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'mp-2' }, 0);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_meal_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({
      imageUrl: 'https://storage.example.com/yesterday.jpg',
      description: 'Pasta dinner',
      capturedAt: '2026-03-08',
    });

    expect(result.capturedAt).toBe('2026-03-08');
    expect(insertedRows[0]?.captured_at).toBe('2026-03-08');
  });

  it('stores all optional nutritional fields', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'mp-3' }, 0);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_meal_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    await exec({
      imageUrl: 'https://example.com/food.jpg',
      description: 'Steak and vegetables',
      estimatedCalories: 800,
      estimatedProteinG: 55,
      mealType: 'dinner',
    });

    expect(insertedRows[0]?.estimated_calories).toBe(800);
    expect(insertedRows[0]?.estimated_protein_g).toBe(55);
    expect(insertedRows[0]?.meal_type).toBe('dinner');
  });

  it('handles missing optional fields gracefully', async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = createTrackingSupabase(insertedRows, { id: 'mp-4' }, 0);
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.save_meal_photo as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    await exec({
      imageUrl: 'https://example.com/snack.jpg',
      description: 'A bowl of mixed nuts',
    });

    expect(insertedRows[0]?.estimated_calories).toBeNull();
    expect(insertedRows[0]?.estimated_protein_g).toBeNull();
    expect(insertedRows[0]?.meal_type).toBeNull();
  });
});

describe('get_progress_photos', () => {
  it('returns mapped photos with camelCase keys', async () => {
    const supabase = createPhotoMockSupabase({
      selectData: [
        { id: 'p1', image_url: 'https://example.com/1.jpg', ai_analysis: 'Analysis 1', notes: null, captured_at: '2026-03-01' },
        { id: 'p2', image_url: 'https://example.com/2.jpg', ai_analysis: 'Analysis 2', notes: 'Week 4', captured_at: '2026-02-15' },
      ],
    });
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.get_progress_photos as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({});
    const photos = result.photos as Record<string, unknown>[];

    expect(photos).toHaveLength(2);
    expect(photos[0]).toEqual({
      id: 'p1',
      imageUrl: 'https://example.com/1.jpg',
      analysis: 'Analysis 1',
      notes: null,
      capturedAt: '2026-03-01',
    });
    expect(photos[1]?.notes).toBe('Week 4');
  });

  it('returns empty array when no photos exist', async () => {
    const supabase = createPhotoMockSupabase({ selectData: [] });
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.get_progress_photos as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({});
    expect(result.photos).toEqual([]);
    expect(result.count).toBe(0);
  });
});

describe('get_meal_photos', () => {
  it('computes daily totals from returned photos', async () => {
    const supabase = createPhotoMockSupabase({
      selectData: [
        { id: 'm1', image_url: 'u1', description: 'Eggs', estimated_calories: 350, estimated_protein_g: 25, meal_type: 'breakfast', captured_at: '2026-03-09' },
        { id: 'm2', image_url: 'u2', description: 'Chicken', estimated_calories: 650, estimated_protein_g: 45, meal_type: 'lunch', captured_at: '2026-03-09' },
      ],
    });
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.get_meal_photos as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({});
    const totals = result.dailyTotals as Record<string, number>;

    expect(totals.meals).toBe(2);
    expect(totals.calories).toBe(1000);
    expect(totals.proteinG).toBe(70);
  });

  it('handles null calorie/protein in totals', async () => {
    const supabase = createPhotoMockSupabase({
      selectData: [
        { id: 'm1', image_url: 'u1', description: 'Uploaded directly', estimated_calories: null, estimated_protein_g: null, meal_type: null, captured_at: '2026-03-09' },
        { id: 'm2', image_url: 'u2', description: 'Salad', estimated_calories: 300, estimated_protein_g: null, meal_type: 'lunch', captured_at: '2026-03-09' },
      ],
    });
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const exec = (tools.get_meal_photos as unknown as { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }).execute;

    const result = await exec({});
    const totals = result.dailyTotals as Record<string, number>;

    expect(totals.meals).toBe(2);
    expect(totals.calories).toBe(300);
    expect(totals.proteinG).toBe(0);
  });
});

describe('tool registration', () => {
  it('registers all 24 tools including photo and history tools', () => {
    const supabase = createPhotoMockSupabase();
    const tools = createTools('user-1', supabase, 'conv-1', 'UTC');
    const names = Object.keys(tools);

    expect(names).toContain('save_progress_photo');
    expect(names).toContain('get_progress_photos');
    expect(names).toContain('save_meal_photo');
    expect(names).toContain('get_meal_photos');
    expect(names).toContain('search_chat_history');
    expect(names).toContain('log_weight');
    expect(names).toHaveLength(25);
  });
});

// =============================================================================
// Tracking mock that captures inserted rows
// =============================================================================

function createTrackingSupabase(
  capturedRows: Record<string, unknown>[],
  insertReturn: Record<string, unknown>,
  countReturn: number,
): AppSupabaseClient {
  const chainable = () => {
    const builder: Record<string, unknown> = {};
    let mode: 'insert' | 'select' | 'count' = 'select';
    let pendingRow: Record<string, unknown> | null = null;

    const passthrough = ['eq', 'neq', 'in', 'gte', 'lte', 'or', 'order', 'limit'];
    for (const m of passthrough) {
      builder[m] = () => builder;
    }

    builder.insert = (row: Record<string, unknown>) => {
      pendingRow = row;
      mode = 'insert';
      return builder;
    };

    builder.select = (...args: unknown[]) => {
      const opts = args[1] as Record<string, unknown> | undefined;
      if (opts?.count === 'exact' && opts?.head === true) {
        mode = 'count';
        const countChain: Record<string, unknown> = {};
        const countMethods = ['eq', 'neq', 'in', 'gte', 'lte', 'or', 'order', 'limit'];
        for (const cm of countMethods) {
          countChain[cm] = () => countChain;
        }
        countChain.then = (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: null, count: countReturn });
        return countChain;
      }
      return builder;
    };

    builder.single = () => {
      if (mode === 'insert' && pendingRow) {
        capturedRows.push(pendingRow);
        return { data: insertReturn, error: null };
      }
      return { data: null, error: null };
    };

    builder.then = (resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null, count: countReturn });

    return builder;
  };

  return { from: () => chainable() } as unknown as AppSupabaseClient;
}
