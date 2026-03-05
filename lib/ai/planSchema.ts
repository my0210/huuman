import { z } from 'zod';
import { jsonSchema } from 'ai';

export const domainSessionsJsonSchema = jsonSchema({
  type: 'object',
  properties: {
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: ['cardio', 'strength', 'mindfulness'] },
          dayOfWeek: { type: 'number', description: 'Day of week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat' },
          title: { type: 'string' },
          detail: { type: 'string', description: 'A valid JSON string containing the domain-specific session detail object. MUST be a non-empty JSON object (not "{}"). See the prompt for required fields per domain.' },
          sortOrder: { type: 'number' },
        },
        required: ['domain', 'dayOfWeek', 'title', 'detail', 'sortOrder'],
        additionalProperties: false,
      },
    },
  },
  required: ['sessions'],
  additionalProperties: false,
});

export const trackingBriefsJsonSchema = jsonSchema({
  type: 'object',
  properties: {
    nutrition: {
      type: 'object',
      properties: {
        calorieTarget: { type: 'number', description: 'Daily calorie target' },
        proteinTargetG: { type: 'number', description: 'Daily protein target in grams' },
        guidelines: {
          type: 'array',
          items: { type: 'string' },
          description: '2-3 personalized nutrition guidelines for this person',
        },
      },
      required: ['calorieTarget', 'proteinTargetG', 'guidelines'],
      additionalProperties: false,
    },
    sleep: {
      type: 'object',
      properties: {
        targetHours: { type: 'number', description: 'Nightly sleep target in hours' },
        bedtimeWindow: { type: 'string', description: 'Recommended bedtime window e.g. "22:00-22:30"' },
        wakeWindow: { type: 'string', description: 'Recommended wake window e.g. "06:00-06:30"' },
      },
      required: ['targetHours', 'bedtimeWindow', 'wakeWindow'],
      additionalProperties: false,
    },
  },
  required: ['nutrition', 'sleep'],
  additionalProperties: false,
});

export const introJsonSchema = jsonSchema({
  type: 'object',
  properties: {
    introMessage: { type: 'string', description: 'Personal 1-2 sentence coach brief for the week' },
  },
  required: ['introMessage'],
  additionalProperties: false,
});

export const planJsonSchema = jsonSchema({
  type: 'object',
  properties: {
    introMessage: { type: 'string', description: 'Personal greeting referencing the user situation and the week ahead' },
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: ['cardio', 'strength', 'mindfulness'] },
          dayOfWeek: { type: 'number', description: 'Day of week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat' },
          title: { type: 'string' },
          detail: { type: 'string', description: 'A valid JSON string containing the domain-specific session detail object. MUST be a non-empty JSON object (not "{}"). See the prompt for required fields per domain.' },
          sortOrder: { type: 'number' },
        },
        required: ['domain', 'dayOfWeek', 'title', 'detail', 'sortOrder'],
        additionalProperties: false,
      },
    },
  },
  required: ['introMessage', 'sessions'],
  additionalProperties: false,
});

export interface SessionOutput {
  domain: 'cardio' | 'strength' | 'mindfulness';
  dayOfWeek: number;
  title: string;
  detail: Record<string, unknown>;
  sortOrder: number;
}

export interface PlanOutput {
  introMessage: string;
  sessions: SessionOutput[];
}

export const planZodSchema = z.object({
  introMessage: z.string(),
  sessions: z.array(z.object({
    domain: z.enum(['cardio', 'strength', 'mindfulness']),
    dayOfWeek: z.number(),
    title: z.string(),
    detail: z.record(z.string(), z.unknown()),
    sortOrder: z.number(),
  })),
});

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  summary: {
    cardio: { sessions: number; z2Sessions: number; z5Sessions: number; totalMinutes: number };
    strength: { sessions: number };
    mindfulness: { sessions: number; totalMinutes: number };
  };
}

function parseZone(raw: unknown): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/(\d)/);
    return match ? Number(match[1]) : null;
  }
  return null;
}

function parseMinutes(d: Record<string, unknown>): number {
  if (typeof d.targetMinutes === 'number') return d.targetMinutes;
  if (typeof d.duration === 'string') return parseInt(d.duration, 10) || 0;
  if (typeof d.duration === 'number') return d.duration;
  return 0;
}

function hasKey(d: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some(k => d[k] != null && d[k] !== '');
}

export function validatePlan(sessions: SessionOutput[]): ValidationResult {
  const issues: string[] = [];

  const cardioSessions = sessions.filter(s => s.domain === 'cardio');
  const strengthSessions = sessions.filter(s => s.domain === 'strength');
  const mindfulnessSessions = sessions.filter(s => s.domain === 'mindfulness');

  // ---- Cardio conviction checks ----
  const z2Sessions = cardioSessions.filter(s => parseZone(s.detail.zone) === 2);
  const z5Sessions = cardioSessions.filter(s => parseZone(s.detail.zone) === 5);
  const totalCardioMin = cardioSessions.reduce((sum, s) => sum + parseMinutes(s.detail), 0);
  const z2Min = z2Sessions.reduce((sum, s) => sum + parseMinutes(s.detail), 0);

  for (const cs of cardioSessions) {
    const zone = parseZone(cs.detail.zone);
    const mins = parseMinutes(cs.detail);

    if (zone === 2 && mins > 0 && mins < 45) {
      issues.push(`Zone 2 session "${cs.title}" is ${mins} min -- minimum is 45 min.`);
    }
    if (zone && zone !== 2 && zone !== 5) {
      issues.push(`Session "${cs.title}" uses Zone ${zone} -- only Zone 2 and Zone 5 allowed.`);
    }
    if (!hasKey(cs.detail, 'warmUp', 'warm_up', 'warmup')) {
      issues.push(`Cardio session "${cs.title}" missing warm-up.`);
    }
    if (!hasKey(cs.detail, 'coolDown', 'cool_down', 'cooldown')) {
      issues.push(`Cardio session "${cs.title}" missing cool-down.`);
    }
  }

  if (z2Sessions.length < 3) issues.push(`${z2Sessions.length} Zone 2 sessions -- minimum is 3.`);
  if (z2Sessions.length > 4) issues.push(`${z2Sessions.length} Zone 2 sessions -- maximum is 4.`);
  if (z5Sessions.length > 1) issues.push(`${z5Sessions.length} Zone 5 sessions -- maximum is 1 per week.`);
  if (z5Sessions.length < 1) issues.push(`No Zone 5 session -- exactly 1 per week required.`);
  if (totalCardioMin < 150) issues.push(`Total cardio volume is ${totalCardioMin} min -- minimum is 150 min.`);
  if (totalCardioMin > 0 && z2Min > 0) {
    const z2Pct = (z2Min / totalCardioMin) * 100;
    if (z2Pct < 70) issues.push(`Zone 2 is ${Math.round(z2Pct)}% of volume -- should be ~80%.`);
  }

  // ---- Strength conviction checks ----
  if (strengthSessions.length < 2) issues.push(`${strengthSessions.length} strength session(s) -- minimum is 2.`);
  if (strengthSessions.length > 3) issues.push(`${strengthSessions.length} strength sessions -- maximum is 3.`);

  for (const ss of strengthSessions) {
    const d = ss.detail;
    if (!hasKey(d, 'warmUp', 'warm_up', 'warmup')) issues.push(`Strength session "${ss.title}" missing warm-up.`);
    if (!hasKey(d, 'coolDown', 'cool_down', 'cooldown')) issues.push(`Strength session "${ss.title}" missing cool-down.`);
    const exercises = d.exercises ?? d.exercise;
    if (!exercises || (Array.isArray(exercises) && exercises.length === 0)) {
      issues.push(`Strength session "${ss.title}" has no exercises defined.`);
    }
  }

  // ---- Mindfulness conviction checks ----
  const totalMindMin = mindfulnessSessions.reduce((sum, s) => sum + parseMinutes(s.detail), 0);
  if (mindfulnessSessions.length < 3) issues.push(`${mindfulnessSessions.length} mindfulness session(s) -- minimum is 3.`);
  if (totalMindMin < 60) issues.push(`Total mindfulness volume is ${totalMindMin} min -- minimum is 60 min.`);
  for (const ms of mindfulnessSessions) {
    if (!hasKey(ms.detail, 'type')) issues.push(`Mindfulness session "${ms.title}" missing type.`);
  }

  // ---- Session quality (all domains) ----
  for (const s of sessions) {
    if (!s.detail || Object.keys(s.detail).length === 0) {
      issues.push(`Session "${s.title}" has empty detail.`);
    }
  }

  // ---- Structural soundness ----
  const strengthDays = strengthSessions.map(s => s.dayOfWeek).sort((a, b) => a - b);
  for (let i = 1; i < strengthDays.length; i++) {
    const gap = strengthDays[i] - strengthDays[i - 1];
    if (gap === 1 || (gap === 0)) {
      issues.push(`Back-to-back strength sessions on consecutive days (days ${strengthDays[i - 1]} and ${strengthDays[i]}).`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      cardio: { sessions: cardioSessions.length, z2Sessions: z2Sessions.length, z5Sessions: z5Sessions.length, totalMinutes: totalCardioMin },
      strength: { sessions: strengthSessions.length },
      mindfulness: { sessions: mindfulnessSessions.length, totalMinutes: totalMindMin },
    },
  };
}

/**
 * Validate sessions loaded from the DB (which include scheduledDate).
 * Runs the same checks as validatePlan, plus date-aware structural checks.
 */
export function validatePlanFromDB(
  sessions: (SessionOutput & { scheduledDate?: string })[],
): ValidationResult {
  const result = validatePlan(sessions);

  if (sessions.some(s => s.scheduledDate)) {
    const z5Dates = sessions
      .filter(s => s.domain === 'cardio' && parseZone(s.detail.zone) === 5 && s.scheduledDate)
      .map(s => s.scheduledDate!);
    const strengthDates = sessions
      .filter(s => s.domain === 'strength' && s.scheduledDate)
      .map(s => s.scheduledDate!);

    for (const z5Date of z5Dates) {
      const z5Time = new Date(z5Date + 'T00:00:00').getTime();
      const hasAdjacentStrength = strengthDates.some(sd => {
        const diff = Math.abs(new Date(sd + 'T00:00:00').getTime() - z5Time);
        return diff === 0;
      });
      if (hasAdjacentStrength) {
        result.issues.push(`Zone 5 cardio and strength scheduled on same day (${z5Date}) -- consider spacing.`);
      }
    }
  }

  result.valid = result.issues.length === 0;
  return result;
}
