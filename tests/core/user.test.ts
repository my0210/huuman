import { describe, expect, it } from 'vitest';
import { loadUserProfile } from '@/lib/core/user';
import type { AppSupabaseClient } from '@/lib/types';

function createUserSupabaseMock(
  profileRow: Record<string, unknown> | null,
  contextRows: Record<string, unknown>[] = [],
): AppSupabaseClient {
  const profileBuilder = chainBuilder({ data: profileRow, error: null });
  const contextBuilder = chainBuilder({ data: contextRows, error: null });

  let callCount = 0;
  return {
    from: (table: string) => {
      if (table === 'user_profiles') return profileBuilder;
      if (table === 'user_context') return contextBuilder;
      callCount++;
      return chainBuilder({ data: null, error: null });
    },
  } as unknown as AppSupabaseClient;
}

function chainBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'or', 'order', 'limit', 'single', 'maybeSingle'];
  for (const m of methods) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(resolvedValue);
  return builder;
}

const FULL_PROFILE_ROW = {
  id: 'u-1',
  email: 'test@example.com',
  age: 35,
  weight_kg: '82.5',
  domain_baselines: {
    cardio: { activities: ['running'], weeklyMinutes: '120_plus', canSustain45min: true },
    strength: { trainingTypes: ['free_weights'], daysPerWeek: 3, liftFamiliarity: 'all', setup: ['gym'] },
    nutrition: { pattern: 'track_macros', restrictions: [] },
    sleep: { hours: '7_8', bedtime: '10_11pm', sleepIssues: 'no' },
    mindfulness: { experience: 'occasional' },
  },
  goals: { primary: ['longevity'], freeText: 'run a sub-4 marathon' },
  constraints: {
    schedule: { workHours: '9-17', blockedTimes: [], preferredWorkoutTimes: ['morning'] },
    equipment: { gymAccess: true, homeEquipment: [], outdoorAccess: true },
    limitations: { injuries: [], medical: [] },
  },
  onboarding_completed: true,
  timezone: 'Europe/Berlin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const CONTEXT_ROWS = [
  {
    id: 'ctx-1',
    category: 'physical',
    content: 'Mild left knee discomfort',
    scope: 'temporary',
    expires_at: '2026-06-01',
    active: true,
    source: 'conversation',
    created_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'ctx-2',
    category: 'equipment',
    content: 'Full home gym with rack and barbell',
    scope: 'permanent',
    expires_at: null,
    active: true,
    source: 'onboarding',
    created_at: '2026-01-02T00:00:00Z',
  },
];

describe('loadUserProfile', () => {
  it('returns null when the profile does not exist', async () => {
    const supabase = createUserSupabaseMock(null);
    const result = await loadUserProfile('nonexistent', supabase);
    expect(result).toBeNull();
  });

  it('returns a fully mapped UserProfile', async () => {
    const supabase = createUserSupabaseMock(FULL_PROFILE_ROW, CONTEXT_ROWS);
    const profile = await loadUserProfile('u-1', supabase);

    expect(profile).not.toBeNull();
    expect(profile!.id).toBe('u-1');
    expect(profile!.email).toBe('test@example.com');
    expect(profile!.age).toBe(35);
    expect(profile!.weightKg).toBe(82.5);
    expect(profile!.onboardingCompleted).toBe(true);
    expect(profile!.timezone).toBe('Europe/Berlin');
  });

  it('converts weight_kg string to number', async () => {
    const supabase = createUserSupabaseMock(FULL_PROFILE_ROW);
    const profile = await loadUserProfile('u-1', supabase);
    expect(typeof profile!.weightKg).toBe('number');
  });

  it('maps context rows to camelCase UserContextItem[]', async () => {
    const supabase = createUserSupabaseMock(FULL_PROFILE_ROW, CONTEXT_ROWS);
    const profile = await loadUserProfile('u-1', supabase);

    expect(profile!.context).toHaveLength(2);

    const physical = profile!.context.find(c => c.id === 'ctx-1')!;
    expect(physical.category).toBe('physical');
    expect(physical.content).toBe('Mild left knee discomfort');
    expect(physical.scope).toBe('temporary');
    expect(physical.expiresAt).toBe('2026-06-01');
    expect(physical.source).toBe('conversation');

    const equipment = profile!.context.find(c => c.id === 'ctx-2')!;
    expect(equipment.category).toBe('equipment');
    expect(equipment.scope).toBe('permanent');
    expect(equipment.source).toBe('onboarding');
  });

  it('returns empty context array when no context rows exist', async () => {
    const supabase = createUserSupabaseMock(FULL_PROFILE_ROW, []);
    const profile = await loadUserProfile('u-1', supabase);
    expect(profile!.context).toEqual([]);
  });

  it('maps domainBaselines, goals, and constraints from DB row', async () => {
    const supabase = createUserSupabaseMock(FULL_PROFILE_ROW);
    const profile = await loadUserProfile('u-1', supabase);

    expect(profile!.domainBaselines?.cardio.activities).toContain('running');
    expect(profile!.goals.primary).toContain('longevity');
    expect(profile!.constraints.equipment.gymAccess).toBe(true);
  });

  it('defaults timezone to UTC when DB field is null', async () => {
    const row = { ...FULL_PROFILE_ROW, timezone: null };
    const supabase = createUserSupabaseMock(row);
    const profile = await loadUserProfile('u-1', supabase);
    expect(profile!.timezone).toBe('UTC');
  });
});
