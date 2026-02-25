import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AppSupabaseClient, UserProfile, TrackingBriefs, SessionDomain } from '@/lib/types';
import { getWeekStart, getTodayISO, SESSION_DOMAINS } from '@/lib/types';
import { loadUserProfile } from '@/lib/core/user';
import { getDomainPlanPrompt, getIntroPlanPrompt, getTrackingBriefsPrompt } from './prompts';
import {
  planJsonSchema,
  domainSessionsJsonSchema,
  trackingBriefsJsonSchema,
  introJsonSchema,
  validatePlan,
  type PlanOutput,
  type SessionOutput,
} from './planSchema';
import { addDays, format } from 'date-fns';

export { planJsonSchema, planZodSchema as planSchema, validatePlan } from './planSchema';
export type { SessionOutput, PlanOutput } from './planSchema';

const model = anthropic('claude-sonnet-4-6');

// =============================================================================
// Per-domain generation
// =============================================================================

async function generateDomainSessions(
  domain: SessionDomain,
  profile: UserProfile,
  weekStart: string,
  startFromDate?: string,
  planningContext?: string,
): Promise<SessionOutput[]> {
  const prompt = getDomainPlanPrompt(domain, profile, weekStart, startFromDate, planningContext);

  const result = await generateObject({
    model,
    schema: domainSessionsJsonSchema,
    prompt,
  });

  const raw = result.object as { sessions: Array<{ domain: string; dayOfWeek: number; title: string; detail: unknown; sortOrder: number }> };

  return raw.sessions.map((s, i) => {
    let detail: Record<string, unknown>;
    if (typeof s.detail === 'string') {
      try { detail = JSON.parse(s.detail); } catch { detail = {}; }
    } else if (s.detail && typeof s.detail === 'object') {
      detail = s.detail as Record<string, unknown>;
    } else {
      detail = {};
    }
    return {
      domain: domain as SessionOutput['domain'],
      dayOfWeek: s.dayOfWeek,
      title: s.title,
      detail,
      sortOrder: s.sortOrder ?? i,
    };
  });
}

async function generateTrackingBriefs(
  profile: UserProfile,
): Promise<TrackingBriefs> {
  const prompt = getTrackingBriefsPrompt(profile);

  const result = await generateObject({
    model,
    schema: trackingBriefsJsonSchema,
    prompt,
  });

  return result.object as TrackingBriefs;
}

async function generateIntroMessage(
  profile: UserProfile,
  weekStart: string,
  sessions: SessionOutput[],
): Promise<string> {
  const titles = sessions.map(s => s.title);
  const prompt = getIntroPlanPrompt(profile, weekStart, titles);

  const result = await generateObject({
    model,
    schema: introJsonSchema,
    prompt,
  });

  return (result.object as { introMessage: string }).introMessage;
}

// =============================================================================
// Orchestrator
// =============================================================================

export interface GeneratePlanOptions {
  weekStart?: string;
  draft?: boolean;
  planningContext?: string;
}

export async function generateWeeklyPlan(
  userId: string,
  supabase: AppSupabaseClient,
  weekStartOrOptions?: string | GeneratePlanOptions,
): Promise<{ success: boolean; planId?: string; isDraft?: boolean; error?: string }> {
  const opts: GeneratePlanOptions = typeof weekStartOrOptions === 'string'
    ? { weekStart: weekStartOrOptions }
    : weekStartOrOptions ?? {};

  const profile = await loadUserProfile(userId, supabase);

  if (!profile) {
    return { success: false, error: 'User profile not found' };
  }

  const weekStart = opts.weekStart ?? getWeekStart();
  const today = getTodayISO();
  const startFromDate = today > weekStart ? today : undefined;

  let allSessions: SessionOutput[];
  let introMessage: string;
  let trackingBriefs: TrackingBriefs;
  try {
    const [domainResults, briefs] = await Promise.all([
      Promise.all(
        SESSION_DOMAINS.map(domain => generateDomainSessions(domain, profile, weekStart, startFromDate, opts.planningContext)),
      ),
      generateTrackingBriefs(profile),
    ]);
    allSessions = domainResults.flat();
    trackingBriefs = briefs;

    introMessage = await generateIntroMessage(profile, weekStart, allSessions);
  } catch (err) {
    console.error('[PlanGen] Parallel generation failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'AI generation failed' };
  }

  const plan: PlanOutput = { introMessage, sessions: allSessions };

  const validation = validatePlan(plan.sessions);
  if (!validation.valid) {
    console.warn('[PlanGen] Validation issues:', validation.issues);
  }

  const planStatus = opts.draft ? 'draft' : 'active';

  const { data: planRow, error: planError } = await supabase
    .from('weekly_plans')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        status: planStatus,
        intro_message: plan.introMessage,
        tracking_briefs: trackingBriefs,
        generation_context: { validation: validation.issues, planningContext: opts.planningContext },
      },
      { onConflict: 'user_id,week_start' },
    )
    .select()
    .single();

  if (planError || !planRow) {
    return { success: false, error: planError?.message ?? 'Failed to create plan' };
  }

  const { count: completedCount } = await supabase
    .from('planned_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planRow.id)
    .eq('status', 'completed');

  if (startFromDate && (completedCount ?? 0) > 0) {
    await supabase
      .from('planned_sessions')
      .delete()
      .eq('plan_id', planRow.id)
      .gte('scheduled_date', startFromDate)
      .eq('status', 'pending');
  } else {
    await supabase
      .from('planned_sessions')
      .delete()
      .eq('plan_id', planRow.id);
  }

  const weekStartDate = new Date(weekStart + 'T00:00:00');
  const sessionsToInsert = plan.sessions.map((s) => {
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
      sort_order: SESSION_DOMAINS.indexOf(s.domain as SessionDomain) * 100 + (s.sortOrder ?? 0),
    };
  }).filter((s) => s.scheduled_date >= today);

  const { error: sessionsError } = await supabase
    .from('planned_sessions')
    .insert(sessionsToInsert);

  if (sessionsError) {
    return { success: false, error: sessionsError.message };
  }

  return { success: true, planId: planRow.id, isDraft: opts.draft ?? false };
}
