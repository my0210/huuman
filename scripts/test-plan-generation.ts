/**
 * Plan generation test script.
 *
 * Usage:
 *   npx tsx scripts/test-plan-generation.ts              # full test (real API call)
 *   npx tsx scripts/test-plan-generation.ts --schema-only # schema validation only (no API call)
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { zodToJsonSchema } from 'zod-to-json-schema';
import { planJsonSchema, domainSessionsJsonSchema, introJsonSchema, planZodSchema, validatePlan, type PlanOutput, type SessionOutput } from '../lib/ai/planSchema';
import { getPlanGenerationPrompt, getDomainPlanPrompt, getIntroPlanPrompt } from '../lib/ai/prompts';
import type { UserProfile, DomainBaselines, Domain } from '../lib/types';
import { DOMAINS } from '../lib/types';

const ANTHROPIC_UNSUPPORTED_KEYWORDS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'propertyNames',
  'patternProperties',
  'additionalItems',
];

const MOCK_BASELINES: DomainBaselines = {
  cardio: { activities: ['running', 'cycling'], weeklyMinutes: '60_120', canSustain45min: true },
  strength: { trainingTypes: ['free_weights'], daysPerWeek: 2, liftFamiliarity: 'all', setup: ['gym'] },
  nutrition: { pattern: 'loosely_healthy', restrictions: [] },
  sleep: { hours: '7_8', bedtime: '10_11pm', sleepIssues: 'no' },
  mindfulness: { experience: 'tried_few_times' },
};

const MOCK_PROFILE: UserProfile = {
  id: 'test-user',
  email: 'test@example.com',
  age: 35,
  weightKg: 80,
  domainBaselines: MOCK_BASELINES,
  goals: { primary: ['longevity', 'strength'] },
  constraints: {
    schedule: { blockedTimes: [], preferredWorkoutTimes: ['morning'] },
    equipment: { gymAccess: true, homeEquipment: [], outdoorAccess: true },
    limitations: { injuries: [], medical: [] },
  },
  onboardingCompleted: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let failed = false;

function pass(msg: string) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); failed = true; }
function info(msg: string) { console.log(`  \x1b[33m→\x1b[0m ${msg}`); }

// ---------------------------------------------------------------------------
// Schema validation (no API call)
// ---------------------------------------------------------------------------

function walkSchema(obj: unknown, path: string, issues: string[]) {
  if (obj === null || typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (ANTHROPIC_UNSUPPORTED_KEYWORDS.includes(key)) {
      issues.push(`${fullPath} -- unsupported by Anthropic structured output`);
    }
    if (typeof record[key] === 'object') {
      walkSchema(record[key], fullPath, issues);
    }
  }
}

function testSchemaCompatibility() {
  console.log('\n--- Schema Compatibility ---\n');

  const schemas: [string, unknown][] = [
    ['planJsonSchema', planJsonSchema],
    ['domainSessionsJsonSchema', domainSessionsJsonSchema],
    ['introJsonSchema', introJsonSchema],
  ];

  for (const [name, schema] of schemas) {
    const rawSchema = (schema as { jsonSchema: unknown }).jsonSchema;
    const issues: string[] = [];
    walkSchema(rawSchema, '', issues);

    if (issues.length === 0) {
      pass(`No unsupported keywords in ${name}`);
    } else {
      for (const issue of issues) {
        fail(`${name}: ${issue}`);
      }
    }
  }

  try {
    const zodConverted = zodToJsonSchema(planZodSchema as any, 'planZodSchema');
    const zodIssues: string[] = [];
    walkSchema(zodConverted, '', zodIssues);

    if (zodIssues.length === 0) {
      pass('Zod validation schema clean');
    } else {
      for (const issue of zodIssues) {
        info(`Zod schema note: ${issue} (not sent to model)`);
      }
    }
  } catch {
    info('Zod-to-JSON-Schema conversion skipped (version mismatch)');
  }
}

// ---------------------------------------------------------------------------
// Prompt generation test
// ---------------------------------------------------------------------------

function testPromptGeneration() {
  console.log('\n--- Prompt Generation ---\n');

  try {
    const prompt = getPlanGenerationPrompt(MOCK_PROFILE, '2026-02-23');
    if (prompt.length > 100) {
      pass(`Full prompt generated (${prompt.length} chars)`);
    } else {
      fail('Prompt suspiciously short');
    }
    if (prompt.includes('CONVICTION RULES')) {
      pass('Contains conviction rules');
    } else {
      fail('Missing conviction rules');
    }
    if (prompt.includes('Age: 35')) {
      pass('Contains user profile data');
    } else {
      fail('Missing user profile data');
    }
    if (prompt.includes('Domain Baselines')) {
      pass('Contains domain baselines');
    } else {
      fail('Missing domain baselines');
    }
  } catch (err) {
    fail(`Full prompt generation threw: ${err}`);
  }

  for (const domain of DOMAINS) {
    try {
      const domainPrompt = getDomainPlanPrompt(domain, MOCK_PROFILE, '2026-02-23');
      if (domainPrompt.length > 50 && domainPrompt.includes('CONVICTION RULES')) {
        pass(`${domain} domain prompt generated (${domainPrompt.length} chars)`);
      } else {
        fail(`${domain} domain prompt too short or missing conviction rules`);
      }
    } catch (err) {
      fail(`${domain} domain prompt threw: ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Full generation test (real API call)
// ---------------------------------------------------------------------------

const EXPECTED_DOMAINS = ['cardio', 'strength', 'nutrition', 'mindfulness', 'sleep'];

async function testFullGeneration() {
  console.log('\n--- Full Plan Generation – Parallel (API call) ---\n');

  const { generateObject } = await import('ai');
  const { anthropic } = await import('@ai-sdk/anthropic');

  const model = anthropic('claude-sonnet-4-6');

  info('Generating 5 domains in parallel with Claude Sonnet 4.6...');
  const startTime = Date.now();

  let allSessions: SessionOutput[];
  try {
    const domainResults = await Promise.all(
      DOMAINS.map(async (domain) => {
        const domainStart = Date.now();
        const prompt = getDomainPlanPrompt(domain, MOCK_PROFILE, '2026-02-23');
        const result = await generateObject({
          model,
          schema: domainSessionsJsonSchema,
          prompt,
        });
        const raw = result.object as { sessions: Array<{ domain: string; dayOfWeek: number; title: string; detail: string | Record<string, unknown>; sortOrder: number }> };
        const elapsed = ((Date.now() - domainStart) / 1000).toFixed(1);
        info(`${domain} completed in ${elapsed}s (${raw.sessions.length} sessions)`);
        return raw.sessions.map((s, i) => ({
          domain: domain as SessionOutput['domain'],
          dayOfWeek: s.dayOfWeek,
          title: s.title,
          detail: (typeof s.detail === 'string' ? JSON.parse(s.detail) : s.detail) as Record<string, unknown>,
          sortOrder: s.sortOrder ?? i,
        }));
      }),
    );
    allSessions = domainResults.flat();
  } catch (err) {
    fail(`Parallel generation threw: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  let introMessage: string;
  try {
    const titles = allSessions.map(s => s.title);
    const introPrompt = getIntroPlanPrompt(MOCK_PROFILE, '2026-02-23', titles);
    const introResult = await generateObject({ model, schema: introJsonSchema, prompt: introPrompt });
    introMessage = (introResult.object as { introMessage: string }).introMessage;
  } catch (err) {
    fail(`Intro generation threw: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  pass(`Full parallel generation completed in ${totalElapsed}s`);

  const plan: PlanOutput = { introMessage, sessions: allSessions };

  const parseResult = planZodSchema.safeParse(plan);
  if (parseResult.success) {
    pass('Output passes Zod validation schema');
  } else {
    fail(`Zod validation failed: ${parseResult.error.message}`);
  }

  if (plan.introMessage && plan.introMessage.length > 10) {
    pass(`Intro message: "${plan.introMessage.slice(0, 80)}..."`);
  } else {
    fail('Missing or empty introMessage');
  }

  info(`Total sessions: ${plan.sessions.length}`);

  const domainCounts: Record<string, number> = {};
  for (const s of plan.sessions) {
    domainCounts[s.domain] = (domainCounts[s.domain] ?? 0) + 1;
  }

  for (const domain of EXPECTED_DOMAINS) {
    if (domainCounts[domain] && domainCounts[domain] > 0) {
      pass(`${domain}: ${domainCounts[domain]} sessions`);
    } else {
      fail(`${domain}: 0 sessions (expected at least 1)`);
    }
  }

  const invalidDays = plan.sessions.filter((s) => s.dayOfWeek < 0 || s.dayOfWeek > 6);
  if (invalidDays.length === 0) {
    pass('All dayOfWeek values in 0-6 range');
  } else {
    fail(`${invalidDays.length} sessions with invalid dayOfWeek`);
  }

  const emptyDetails = plan.sessions.filter((s) => Object.keys(s.detail).length === 0);
  if (emptyDetails.length === 0) {
    pass('All sessions have non-empty detail objects');
  } else {
    fail(`${emptyDetails.length} sessions with empty detail`);
  }

  const validation = validatePlan(plan.sessions);
  if (validation.valid) {
    pass('Passes conviction validation');
  } else {
    for (const issue of validation.issues) {
      info(`Conviction issue: ${issue}`);
    }
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const schemaOnly = process.argv.includes('--schema-only');

  console.log('=== huuman Plan Generation Tests ===');

  testSchemaCompatibility();
  testPromptGeneration();

  if (!schemaOnly) {
    if (!process.env.ANTHROPIC_API_KEY) {
      fail('ANTHROPIC_API_KEY not set. Run with --schema-only or set the key in .env.local');
    } else {
      const plan = await testFullGeneration();
      if (plan) {
        // Save output for rendering tests
        const fs = await import('fs');
        fs.writeFileSync(
          'scripts/.last-plan-output.json',
          JSON.stringify(plan, null, 2),
        );
        info('Plan output saved to scripts/.last-plan-output.json');
      }
    }
  } else {
    info('Skipping API call (--schema-only mode)');
  }

  console.log('\n' + (failed ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mPASSED\x1b[0m') + '\n');
  process.exit(failed ? 1 : 0);
}

main();
