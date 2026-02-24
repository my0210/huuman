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
}

export function validatePlan(sessions: SessionOutput[]): ValidationResult {
  const issues: string[] = [];

  const cardioSessions = sessions.filter(s => s.domain === 'cardio');
  const strengthSessions = sessions.filter(s => s.domain === 'strength');

  function parseZone(raw: unknown): number | null {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const match = raw.match(/(\d)/);
      return match ? Number(match[1]) : null;
    }
    return null;
  }

  for (const cs of cardioSessions) {
    const detail = cs.detail;
    const zone = parseZone(detail.zone);
    const targetMinutes = typeof detail.targetMinutes === 'number'
      ? detail.targetMinutes
      : typeof detail.duration === 'string'
        ? parseInt(detail.duration as string, 10) || undefined
        : undefined;

    if (zone === 2 && targetMinutes && targetMinutes < 45) {
      issues.push(`Zone 2 session "${cs.title}" is ${targetMinutes} min -- minimum is 45 min.`);
    }
    if (zone && zone !== 2 && zone !== 5) {
      issues.push(`Session "${cs.title}" uses Zone ${zone} -- only Zone 2 and Zone 5 allowed.`);
    }
  }

  const z2Sessions = cardioSessions.filter(s => parseZone(s.detail.zone) === 2);
  const z5Sessions = cardioSessions.filter(s => parseZone(s.detail.zone) === 5);

  if (z5Sessions.length > 1) {
    issues.push(`${z5Sessions.length} Zone 5 sessions -- maximum is 1 per week.`);
  }

  function parseMinutes(d: Record<string, unknown>): number {
    if (typeof d.targetMinutes === 'number') return d.targetMinutes;
    if (typeof d.duration === 'string') return parseInt(d.duration, 10) || 0;
    if (typeof d.duration === 'number') return d.duration;
    return 0;
  }

  const totalCardioMin = cardioSessions.reduce((sum, s) => sum + parseMinutes(s.detail), 0);
  const z2Min = z2Sessions.reduce((sum, s) => sum + parseMinutes(s.detail), 0);

  if (totalCardioMin > 0) {
    const z2Pct = (z2Min / totalCardioMin) * 100;
    if (z2Pct < 70) {
      issues.push(`Zone 2 is ${Math.round(z2Pct)}% of volume -- should be ~80%.`);
    }
  }

  for (const ss of strengthSessions) {
    const d = ss.detail;
    const hasWarmUp = d.warmUp || d.warm_up || d.warmup;
    const hasCoolDown = d.coolDown || d.cool_down || d.cooldown;
    if (!hasWarmUp) issues.push(`Strength session "${ss.title}" missing warm-up.`);
    if (!hasCoolDown) issues.push(`Strength session "${ss.title}" missing cool-down.`);
  }

  return { valid: issues.length === 0, issues };
}
