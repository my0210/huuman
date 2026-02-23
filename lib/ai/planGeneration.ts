import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { UserProfile, getWeekStart } from '@/lib/types';
import { getPlanGenerationPrompt } from './prompts';
import { planJsonSchema, validatePlan, type PlanOutput } from './planSchema';
import { addDays, format } from 'date-fns';

export { planJsonSchema, planZodSchema as planSchema, validatePlan } from './planSchema';
export type { SessionOutput, PlanOutput } from './planSchema';

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

  let plan: PlanOutput;
  try {
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: planJsonSchema,
      prompt,
    });
    const raw = result.object as { introMessage: string; sessions: Array<{ domain: string; dayOfWeek: number; title: string; detail: unknown; sortOrder: number }> };
    plan = {
      introMessage: raw.introMessage,
      sessions: raw.sessions.map((s) => {
        let detail: Record<string, unknown>;
        if (typeof s.detail === 'string') {
          try { detail = JSON.parse(s.detail); } catch { detail = {}; }
        } else if (s.detail && typeof s.detail === 'object') {
          detail = s.detail as Record<string, unknown>;
        } else {
          detail = {};
        }
        return {
          ...s,
          domain: s.domain as PlanOutput['sessions'][number]['domain'],
          detail,
        };
      }),
    };
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

    let detail = s.detail;
    if (typeof detail === 'string') {
      try { detail = JSON.parse(detail); } catch { /* keep as-is */ }
    }

    return {
      plan_id: planRow.id,
      user_id: userId,
      domain: s.domain,
      day_of_week: s.dayOfWeek,
      scheduled_date: scheduledDate,
      title: s.title,
      status: 'pending',
      detail,
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
