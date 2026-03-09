import { describe, expect, it } from 'vitest';
import {
  validatePlan,
  validatePlanFromDB,
  type SessionOutput,
  type ValidationResult,
} from '@/lib/ai/planSchema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cardio(overrides: Partial<SessionOutput & { detail: Record<string, unknown> }> = {}): SessionOutput {
  return {
    domain: 'cardio',
    dayOfWeek: 1,
    title: 'Zone 2 Run',
    detail: { zone: 2, targetMinutes: 50, warmUp: '5 min jog', coolDown: '5 min walk' },
    sortOrder: 0,
    ...overrides,
  };
}

function strength(overrides: Partial<SessionOutput & { detail: Record<string, unknown> }> = {}): SessionOutput {
  return {
    domain: 'strength',
    dayOfWeek: 2,
    title: 'Upper Body',
    detail: {
      focus: 'upper',
      exercises: [{ name: 'Bench Press', sets: 3, reps: '8-10' }],
      warmUp: '5 min mobility',
      coolDown: '5 min stretch',
    },
    sortOrder: 0,
    ...overrides,
  };
}

function mindfulness(overrides: Partial<SessionOutput & { detail: Record<string, unknown> }> = {}): SessionOutput {
  return {
    domain: 'mindfulness',
    dayOfWeek: 3,
    title: 'Morning Meditation',
    detail: { type: 'meditation', targetMinutes: 20 },
    sortOrder: 0,
    ...overrides,
  };
}

function validPlan(): SessionOutput[] {
  return [
    cardio({ dayOfWeek: 1, title: 'Z2 Run', detail: { zone: 2, targetMinutes: 50, warmUp: 'jog', coolDown: 'walk' } }),
    cardio({ dayOfWeek: 3, title: 'Z2 Bike', detail: { zone: 2, targetMinutes: 50, warmUp: 'spin', coolDown: 'stretch' } }),
    cardio({ dayOfWeek: 5, title: 'Z2 Walk', detail: { zone: 2, targetMinutes: 50, warmUp: 'walk', coolDown: 'walk' } }),
    cardio({ dayOfWeek: 6, title: 'Z5 Intervals', detail: { zone: 5, targetMinutes: 25, warmUp: 'jog', coolDown: 'walk' } }),
    strength({ dayOfWeek: 2, title: 'Upper Body' }),
    strength({ dayOfWeek: 4, title: 'Lower Body', detail: { focus: 'lower', exercises: [{ name: 'Squat' }], warmUp: 'mobility', coolDown: 'stretch' } }),
    mindfulness({ dayOfWeek: 1, title: 'AM Meditation', detail: { type: 'meditation', targetMinutes: 20 } }),
    mindfulness({ dayOfWeek: 3, title: 'Breathwork', detail: { type: 'breathwork', targetMinutes: 20 } }),
    mindfulness({ dayOfWeek: 5, title: 'PM Meditation', detail: { type: 'meditation', targetMinutes: 20 } }),
  ];
}

// ---------------------------------------------------------------------------
// validatePlan
// ---------------------------------------------------------------------------

describe('validatePlan', () => {
  it('passes a well-formed plan', () => {
    const result = validatePlan(validPlan());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns correct summary counts', () => {
    const result = validatePlan(validPlan());
    expect(result.summary.cardio.sessions).toBe(4);
    expect(result.summary.cardio.z2Sessions).toBe(3);
    expect(result.summary.cardio.z5Sessions).toBe(1);
    expect(result.summary.strength.sessions).toBe(2);
    expect(result.summary.mindfulness.sessions).toBe(3);
  });

  // -- Cardio conviction checks --

  it('flags Zone 2 sessions under 45 minutes', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 2, targetMinutes: 30, warmUp: 'jog', coolDown: 'walk' } });
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('minimum is 45 min'));
  });

  it('flags invalid zone numbers', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 3, targetMinutes: 50, warmUp: 'jog', coolDown: 'walk' } });
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('Zone 3'));
    expect(result.issues).toContainEqual(expect.stringContaining('only Zone 2 and Zone 5'));
  });

  it('accepts string zone values like "Zone 2"', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 'Zone 2', targetMinutes: 50, warmUp: 'jog', coolDown: 'walk' } });
    const result = validatePlan(sessions);
    expect(result.issues.filter(i => i.includes('Zone'))).toHaveLength(0);
  });

  it('flags missing warm-up on cardio', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 2, targetMinutes: 50, coolDown: 'walk' } });
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('missing warm-up'));
  });

  it('flags missing cool-down on cardio', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 2, targetMinutes: 50, warmUp: 'jog' } });
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('missing cool-down'));
  });

  it('accepts warm_up / cool_down key variants', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 2, targetMinutes: 50, warm_up: 'jog', cool_down: 'walk' } });
    const result = validatePlan(sessions);
    const warmCoolIssues = result.issues.filter(i => i.includes('warm') || i.includes('cool'));
    expect(warmCoolIssues).toHaveLength(0);
  });

  it('flags fewer than 3 Zone 2 sessions', () => {
    const sessions = validPlan().filter(s => !(s.domain === 'cardio' && s.detail.zone === 2));
    sessions.push(cardio({ detail: { zone: 2, targetMinutes: 90, warmUp: 'jog', coolDown: 'walk' } }));
    sessions.push(cardio({ detail: { zone: 2, targetMinutes: 90, warmUp: 'jog', coolDown: 'walk' } }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('2 Zone 2 sessions'));
  });

  it('flags more than 1 Zone 5 session', () => {
    const sessions = validPlan();
    sessions.push(cardio({ dayOfWeek: 0, title: 'Extra Z5', detail: { zone: 5, targetMinutes: 20, warmUp: 'jog', coolDown: 'walk' } }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('2 Zone 5 sessions'));
  });

  it('flags total cardio under 150 min', () => {
    const sessions = [
      cardio({ detail: { zone: 2, targetMinutes: 30, warmUp: 'a', coolDown: 'b' } }),
      cardio({ detail: { zone: 2, targetMinutes: 30, warmUp: 'a', coolDown: 'b' } }),
      cardio({ detail: { zone: 2, targetMinutes: 30, warmUp: 'a', coolDown: 'b' } }),
      cardio({ detail: { zone: 5, targetMinutes: 20, warmUp: 'a', coolDown: 'b' } }),
      ...validPlan().filter(s => s.domain !== 'cardio'),
    ];
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('minimum is 150 min'));
  });

  // -- Strength conviction checks --

  it('flags fewer than 2 strength sessions', () => {
    const sessions = validPlan().filter(s => s.domain !== 'strength');
    sessions.push(strength({ dayOfWeek: 2 }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('1 strength session'));
  });

  it('flags back-to-back strength on consecutive days', () => {
    const sessions = validPlan().filter(s => s.domain !== 'strength');
    sessions.push(strength({ dayOfWeek: 2 }));
    sessions.push(strength({ dayOfWeek: 3 }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('Back-to-back strength'));
  });

  it('flags strength sessions without exercises', () => {
    const sessions = validPlan();
    const idx = sessions.findIndex(s => s.domain === 'strength');
    sessions[idx] = strength({ detail: { focus: 'upper', warmUp: 'a', coolDown: 'b' } });
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('no exercises'));
  });

  // -- Mindfulness conviction checks --

  it('flags fewer than 3 mindfulness sessions', () => {
    const sessions = validPlan().filter(s => s.domain !== 'mindfulness');
    sessions.push(mindfulness({ detail: { type: 'meditation', targetMinutes: 30 } }));
    sessions.push(mindfulness({ detail: { type: 'breathwork', targetMinutes: 30 } }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('2 mindfulness session'));
  });

  it('flags total mindfulness under 60 min', () => {
    const sessions = validPlan().filter(s => s.domain !== 'mindfulness');
    sessions.push(mindfulness({ detail: { type: 'meditation', targetMinutes: 10 } }));
    sessions.push(mindfulness({ detail: { type: 'breathwork', targetMinutes: 5 } }));
    sessions.push(mindfulness({ detail: { type: 'meditation', targetMinutes: 5 } }));
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('minimum is 60 min'));
  });

  // -- Session quality --

  it('flags sessions with empty detail', () => {
    const sessions = validPlan();
    sessions[0] = { ...sessions[0], detail: {} };
    const result = validatePlan(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('empty detail'));
  });

  // -- Duration parsing --

  it('parses duration from string field', () => {
    const sessions = validPlan();
    sessions[0] = cardio({ detail: { zone: 2, duration: '50 minutes', warmUp: 'jog', coolDown: 'walk' } });
    const result = validatePlan(sessions);
    expect(result.summary.cardio.totalMinutes).toBeGreaterThanOrEqual(150);
  });
});

// ---------------------------------------------------------------------------
// validatePlanFromDB -- date-aware checks
// ---------------------------------------------------------------------------

describe('validatePlanFromDB', () => {
  it('flags Zone 5 and strength on the same day', () => {
    const sessions = validPlan().map((s, i) => ({ ...s, scheduledDate: `2026-03-0${i + 1}` }));
    const z5Idx = sessions.findIndex(s => s.domain === 'cardio' && s.detail.zone === 5);
    const strIdx = sessions.findIndex(s => s.domain === 'strength');
    sessions[strIdx] = { ...sessions[strIdx], scheduledDate: sessions[z5Idx].scheduledDate };

    const result = validatePlanFromDB(sessions);
    expect(result.issues).toContainEqual(expect.stringContaining('Zone 5 cardio and strength scheduled on same day'));
  });

  it('passes when Zone 5 and strength are on different days', () => {
    const sessions = validPlan().map((s, i) => ({ ...s, scheduledDate: `2026-03-${String(i + 1).padStart(2, '0')}` }));
    const result = validatePlanFromDB(sessions);
    const sameDay = result.issues.filter(i => i.includes('same day'));
    expect(sameDay).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// JSON schema structural checks (Anthropic compatibility)
// ---------------------------------------------------------------------------

describe('JSON schemas (Anthropic compat)', () => {
  const FORBIDDEN_KEYWORDS = ['minimum', 'maximum', 'propertyNames', 'patternProperties'];

  function checkSchema(schema: unknown, path = ''): string[] {
    const violations: string[] = [];
    if (typeof schema !== 'object' || schema === null) return violations;

    const obj = schema as Record<string, unknown>;

    for (const kw of FORBIDDEN_KEYWORDS) {
      if (kw in obj) violations.push(`${path || 'root'} has "${kw}"`);
    }

    if (obj.type === 'object' && obj.properties && !('additionalProperties' in obj)) {
      violations.push(`${path || 'root'} missing additionalProperties`);
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        violations.push(...checkSchema(value, `${path}.${key}`));
      }
    }

    return violations;
  }

  it('domainSessionsJsonSchema has no Anthropic-rejected keywords', async () => {
    const { domainSessionsJsonSchema } = await import('@/lib/ai/planSchema');
    const raw = (domainSessionsJsonSchema as unknown as { jsonSchema: unknown }).jsonSchema;
    expect(checkSchema(raw)).toEqual([]);
  });

  it('trackingBriefsJsonSchema has no Anthropic-rejected keywords', async () => {
    const { trackingBriefsJsonSchema } = await import('@/lib/ai/planSchema');
    const raw = (trackingBriefsJsonSchema as unknown as { jsonSchema: unknown }).jsonSchema;
    expect(checkSchema(raw)).toEqual([]);
  });

  it('planJsonSchema has no Anthropic-rejected keywords', async () => {
    const { planJsonSchema } = await import('@/lib/ai/planSchema');
    const raw = (planJsonSchema as unknown as { jsonSchema: unknown }).jsonSchema;
    expect(checkSchema(raw)).toEqual([]);
  });
});
