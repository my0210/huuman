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
import { planJsonSchema, planZodSchema, validatePlan, type PlanOutput, type SessionOutput } from '../lib/ai/planSchema';
import { getPlanGenerationPrompt } from '../lib/ai/prompts';
import type { UserProfile, DomainBaselines } from '../lib/types';

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

  const rawSchema = (planJsonSchema as { jsonSchema: unknown }).jsonSchema;
  const issues: string[] = [];
  walkSchema(rawSchema, '', issues);

  if (issues.length === 0) {
    pass('No unsupported JSON Schema keywords in planJsonSchema');
  } else {
    for (const issue of issues) {
      fail(issue);
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
      pass(`Prompt generated (${prompt.length} chars)`);
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
    fail(`Prompt generation threw: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Full generation test (real API call)
// ---------------------------------------------------------------------------

const EXPECTED_DOMAINS = ['cardio', 'strength', 'nutrition', 'mindfulness', 'sleep'];

async function testFullGeneration() {
  console.log('\n--- Full Plan Generation (API call) ---\n');

  const { generateObject } = await import('ai');
  const { anthropic } = await import('@ai-sdk/anthropic');

  const prompt = getPlanGenerationPrompt(MOCK_PROFILE, '2026-02-23');

  info('Calling Claude Sonnet 4.6 with generateObject...');
  const startTime = Date.now();

  let plan: PlanOutput;
  try {
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: planJsonSchema,
      prompt,
    });
    const raw = result.object as { introMessage: string; sessions: Array<{ domain: string; dayOfWeek: number; title: string; detail: string | Record<string, unknown>; sortOrder: number }> };
    plan = {
      introMessage: raw.introMessage,
      sessions: raw.sessions.map((s) => ({
        ...s,
        domain: s.domain as PlanOutput['sessions'][number]['domain'],
        detail: typeof s.detail === 'string' ? JSON.parse(s.detail) : s.detail,
      })),
    };
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    pass(`Generation completed in ${elapsed}s`);
  } catch (err) {
    fail(`generateObject threw: ${err instanceof Error ? err.message : err}`);
    return null;
  }

  // Validate with Zod schema
  const parseResult = planZodSchema.safeParse(plan);
  if (parseResult.success) {
    pass('Output passes Zod validation schema');
  } else {
    fail(`Zod validation failed: ${parseResult.error.message}`);
  }

  // Check intro message
  if (plan.introMessage && plan.introMessage.length > 10) {
    pass(`Intro message: "${plan.introMessage.slice(0, 80)}..."`);
  } else {
    fail('Missing or empty introMessage');
  }

  // Check session count
  info(`Total sessions: ${plan.sessions.length}`);

  // Check all 5 domains present
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

  // Check dayOfWeek values
  const invalidDays = plan.sessions.filter((s) => s.dayOfWeek < 0 || s.dayOfWeek > 6);
  if (invalidDays.length === 0) {
    pass('All dayOfWeek values in 0-6 range');
  } else {
    fail(`${invalidDays.length} sessions with invalid dayOfWeek`);
  }

  // Check detail objects are non-empty
  const emptyDetails = plan.sessions.filter((s) => Object.keys(s.detail).length === 0);
  if (emptyDetails.length === 0) {
    pass('All sessions have non-empty detail objects');
  } else {
    fail(`${emptyDetails.length} sessions with empty detail`);
  }

  // Run conviction validation
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
