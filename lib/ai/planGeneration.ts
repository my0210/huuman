import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, getWeekStart } from '@/lib/types';
import { getPlanGenerationPrompt } from './prompts';
import { ALL_CONVICTIONS } from '@/lib/convictions';
import { addDays, format } from 'date-fns';

// =============================================================================
// Output schema (what the AI must produce)
// =============================================================================

const sessionSchema = z.object({
  domain: z.enum(['cardio', 'strength', 'nutrition', 'mindfulness', 'sleep']),
  dayOfWeek: z.number().min(0).max(6),
  title: z.string(),
  detail: z.record(z.string(), z.unknown()),
  sortOrder: z.number(),
});

const planSchema = z.object({
  introMessage: z.string(),
  sessions: z.array(sessionSchema),
});

// =============================================================================
// Validation
// =============================================================================

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

function validatePlan(sessions: z.infer<typeof sessionSchema>[]): ValidationResult {
  const issues: string[] = [];

  const cardioSessions = sessions.filter(s => s.domain === 'cardio');
  const strengthSessions = sessions.filter(s => s.domain === 'strength');

  // Cardio conviction checks
  const cardioRules = ALL_CONVICTIONS.cardio;
  for (const cs of cardioSessions) {
    const detail = cs.detail as Record<string, unknown>;
    const zone = detail.zone as number | undefined;
    const targetMinutes = detail.targetMinutes as number | undefined;

    if (zone === 2 && targetMinutes && targetMinutes < 45) {
      issues.push(`Zone 2 session "${cs.title}" is ${targetMinutes} min -- minimum is 45 min.`);
    }
    if (zone && zone !== 2 && zone !== 5) {
      issues.push(`Session "${cs.title}" uses Zone ${zone} -- only Zone 2 and Zone 5 allowed.`);
    }
  }

  const z2Sessions = cardioSessions.filter(s => (s.detail as Record<string, unknown>).zone === 2);
  const z5Sessions = cardioSessions.filter(s => (s.detail as Record<string, unknown>).zone === 5);

  if (z5Sessions.length > 1) {
    issues.push(`${z5Sessions.length} Zone 5 sessions -- maximum is 1 per week.`);
  }

  const totalCardioMin = cardioSessions.reduce((sum, s) => {
    return sum + ((s.detail as Record<string, unknown>).targetMinutes as number ?? 0);
  }, 0);
  const z2Min = z2Sessions.reduce((sum, s) => {
    return sum + ((s.detail as Record<string, unknown>).targetMinutes as number ?? 0);
  }, 0);

  if (totalCardioMin > 0) {
    const z2Pct = (z2Min / totalCardioMin) * 100;
    if (z2Pct < 70) {
      issues.push(`Zone 2 is ${Math.round(z2Pct)}% of volume -- should be ~80%.`);
    }
  }

  // Strength conviction checks
  for (const ss of strengthSessions) {
    const detail = ss.detail as Record<string, unknown>;
    if (!detail.warmUp) issues.push(`Strength session "${ss.title}" missing warm-up.`);
    if (!detail.coolDown) issues.push(`Strength session "${ss.title}" missing cool-down.`);
  }

  if (strengthSessions.length < cardioRules.sessionRules[0]?.frequencyPerWeek.min) {
    // Not blocking, just noting
  }

  return { valid: issues.length === 0, issues };
}

// =============================================================================
// Generation
// =============================================================================

export async function generateWeeklyPlan(
  userId: string,
  weekStartOverride?: string,
): Promise<{ success: boolean; planId?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch user profile
  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profileRow) {
    return { success: false, error: 'User profile not found' };
  }

  const profile: UserProfile = {
    id: profileRow.id,
    email: profileRow.email,
    age: profileRow.age,
    weightKg: profileRow.weight_kg ? Number(profileRow.weight_kg) : undefined,
    domainBaselines: profileRow.domain_baselines as UserProfile['domainBaselines'],
    goals: profileRow.goals as UserProfile['goals'],
    constraints: profileRow.constraints as UserProfile['constraints'],
    onboardingCompleted: profileRow.onboarding_completed,
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  };

  const weekStart = weekStartOverride ?? getWeekStart();
  const prompt = getPlanGenerationPrompt(profile, weekStart);

  let plan: z.infer<typeof planSchema>;
  try {
    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      schema: planSchema,
      prompt,
    });
    plan = result.object;
  } catch (err) {
    console.error('[PlanGen] Claude generateObject failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'AI generation failed' };
  }

  // Validate against convictions
  const validation = validatePlan(plan.sessions);
  if (!validation.valid) {
    console.warn('[PlanGen] Validation issues:', validation.issues);
    // We proceed but log -- in future could retry
  }

  // Store plan in DB
  const { data: planRow, error: planError } = await supabase
    .from('weekly_plans')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        status: 'active',
        intro_message: plan.introMessage,
        generation_context: { validation: validation.issues },
      },
      { onConflict: 'user_id,week_start' },
    )
    .select()
    .single();

  if (planError || !planRow) {
    return { success: false, error: planError?.message ?? 'Failed to create plan' };
  }

  // Delete existing sessions for this plan (in case of regeneration)
  await supabase
    .from('planned_sessions')
    .delete()
    .eq('plan_id', planRow.id);

  // Compute scheduled dates from weekStart + dayOfWeek
  const weekStartDate = new Date(weekStart + 'T00:00:00');
  const sessionsToInsert = plan.sessions.map((s) => {
    // dayOfWeek: 0=Sun, 1=Mon... weekStart is Monday (dayOfWeek=1)
    const daysFromMonday = s.dayOfWeek === 0 ? 6 : s.dayOfWeek - 1;
    const scheduledDate = format(addDays(weekStartDate, daysFromMonday), 'yyyy-MM-dd');

    return {
      plan_id: planRow.id,
      user_id: userId,
      domain: s.domain,
      day_of_week: s.dayOfWeek,
      scheduled_date: scheduledDate,
      title: s.title,
      status: 'pending',
      detail: s.detail,
      sort_order: s.sortOrder,
    };
  });

  const { error: sessionsError } = await supabase
    .from('planned_sessions')
    .insert(sessionsToInsert);

  if (sessionsError) {
    return { success: false, error: sessionsError.message };
  }

  return { success: true, planId: planRow.id };
}
