/**
 * Session detail rendering test.
 *
 * Renders each domain's detail component with real AI output to verify
 * no runtime errors. Uses the plan output saved by test-plan-generation.ts.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/test-session-rendering.tsx
 *
 * Requires: scripts/.last-plan-output.json (run test-plan-generation.ts first)
 */

import { renderToString } from 'react-dom/server';
import React from 'react';
import { existsSync, readFileSync } from 'fs';

import { CardioDetail } from '../components/session/CardioDetail';
import { StrengthDetail } from '../components/session/StrengthDetail';
import { NutritionDetail } from '../components/session/NutritionDetail';
import { SleepDetail } from '../components/session/SleepDetail';
import { MindfulnessDetail } from '../components/session/MindfulnessDetail';

const PLAN_FILE = 'scripts/.last-plan-output.json';

let failed = false;

function pass(msg: string) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); failed = true; }
function info(msg: string) { console.log(`  \x1b[33m→\x1b[0m ${msg}`); }

const DOMAIN_COMPONENTS: Record<string, React.FC<{ detail: Record<string, unknown> }>> = {
  cardio: CardioDetail,
  strength: StrengthDetail,
  nutrition: NutritionDetail,
  sleep: SleepDetail,
  mindfulness: MindfulnessDetail,
};

function main() {
  console.log('=== Session Detail Rendering Tests ===\n');

  if (!existsSync(PLAN_FILE)) {
    fail(`${PLAN_FILE} not found. Run test-plan-generation.ts first.`);
    process.exit(1);
  }

  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf-8'));
  const sessions = plan.sessions as Array<{ domain: string; title: string; detail: Record<string, unknown> }>;

  info(`Testing ${sessions.length} sessions from last plan output\n`);

  const domainResults: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const session of sessions) {
    const Component = DOMAIN_COMPONENTS[session.domain];
    if (!Component) {
      fail(`No component for domain: ${session.domain}`);
      continue;
    }

    if (!domainResults[session.domain]) {
      domainResults[session.domain] = { total: 0, passed: 0, failed: 0 };
    }
    domainResults[session.domain].total++;

    try {
      const html = renderToString(React.createElement(Component, { detail: session.detail }));
      if (html.length > 0) {
        domainResults[session.domain].passed++;
      } else {
        fail(`${session.domain}: "${session.title}" rendered empty HTML`);
        domainResults[session.domain].failed++;
      }
    } catch (err) {
      fail(`${session.domain}: "${session.title}" threw: ${err instanceof Error ? err.message : err}`);
      domainResults[session.domain].failed++;
    }
  }

  console.log('\n--- Summary ---\n');
  for (const [domain, result] of Object.entries(domainResults)) {
    if (result.failed === 0) {
      pass(`${domain}: ${result.passed}/${result.total} rendered OK`);
    } else {
      fail(`${domain}: ${result.failed}/${result.total} FAILED`);
    }
  }

  console.log('\n' + (failed ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mPASSED\x1b[0m') + '\n');
  process.exit(failed ? 1 : 0);
}

main();
