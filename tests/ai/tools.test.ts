import { describe, expect, it } from 'vitest';
import { createTools } from '@/lib/ai/tools';
import { createMockSupabase } from '../mocks/supabase';

const EXPECTED_TOOLS = [
  'show_today_plan',
  'show_week_plan',
  'show_session',
  'complete_session',
  'log_session',
  'show_progress',
  'log_daily',
  'adapt_plan',
  'delete_session',
  'generate_plan',
  'confirm_plan',
  'start_timer',
  'save_context',
  'save_feedback',
  'get_sessions',
  'get_habits',
  'get_context',
  'validate_plan',
  'search_youtube',
  'search_chat_history',
  'save_progress_photo',
  'get_progress_photos',
  'save_meal_photo',
  'get_meal_photos',
] as const;

describe('createTools', () => {
  const supabase = createMockSupabase();
  const tools = createTools('user-123', supabase, 'conv-1', 'UTC');

  it('returns all 24 registered tools', () => {
    const names = Object.keys(tools).sort();
    expect(names).toEqual([...EXPECTED_TOOLS].sort());
    expect(names).toHaveLength(24);
  });

  it('every tool has a description and execute function', () => {
    for (const [name, t] of Object.entries(tools)) {
      const tool = t as { description?: string; execute?: unknown };
      expect(tool.description, `${name} missing description`).toBeTruthy();
      expect(typeof tool.execute, `${name} missing execute`).toBe('function');
    }
  });

  it('start_timer returns correct shape without DB calls', async () => {
    const result = await (tools.start_timer as unknown as { execute: (args: Record<string, unknown>) => Promise<unknown> })
      .execute({ minutes: 10, label: 'Breathwork' });

    expect(result).toEqual({
      minutes: 10,
      label: 'Breathwork',
      autoTrigger: true,
    });
  });

  it('start_timer uses default label when none provided', async () => {
    const result = await (tools.start_timer as unknown as { execute: (args: Record<string, unknown>) => Promise<unknown> })
      .execute({ minutes: 3 });

    expect(result).toEqual({
      minutes: 3,
      label: '3 min session',
      autoTrigger: true,
    });
  });
});
