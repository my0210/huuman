import { tool } from 'ai';
import { z } from 'zod';
import { getWeekStart, getTodayISO, DOMAINS, Domain, DOMAIN_META, SESSION_DOMAINS, type SessionDomain } from '@/lib/types';
import type { AppSupabaseClient } from '@/lib/types';
import { generateWeeklyPlan } from '@/lib/ai/planGeneration';

interface SessionRow { domain: string; status: string }

export function createTools(userId: string, supabase: AppSupabaseClient) {

  const show_today_plan = tool({
    description:
      'Show the user their planned sessions for today plus daily tracking targets. Call this when greeting the user, when they ask "what should I do today", or at the start of any conversation.',
    inputSchema: z.object({}),
    execute: async () => {
      const today = getTodayISO();
      const weekStart = getWeekStart();

      const { data: activePlan } = await supabase
        .from('weekly_plans')
        .select('id, tracking_briefs')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'active')
        .maybeSingle();

      let draftPlan: { id: string } | null = null;
      if (!activePlan) {
        const { data } = await supabase
          .from('weekly_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('week_start', weekStart)
          .eq('status', 'draft')
          .maybeSingle();
        draftPlan = data;
      }

      let sessions: Record<string, unknown>[] = [];
      if (activePlan) {
        const { data: planSessions } = await supabase
          .from('planned_sessions')
          .select('*')
          .eq('plan_id', activePlan.id)
          .eq('scheduled_date', today)
          .in('domain', SESSION_DOMAINS)
          .neq('status', 'skipped')
          .order('sort_order');
        sessions = planSessions ?? [];
      }

      const { data: extraSessions } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .eq('is_extra', true)
        .in('domain', SESSION_DOMAINS)
        .neq('status', 'skipped');
      if (extraSessions) sessions.push(...extraSessions);

      const { data: habits } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      return {
        date: today,
        weekStart,
        sessions,
        habits: habits ?? null,
        trackingBriefs: activePlan?.tracking_briefs ?? null,
        hasPlan: sessions.length > 0,
        hasActivePlanForWeek: !!activePlan,
        hasDraftPlan: !!draftPlan,
        draftPlanId: draftPlan?.id ?? null,
        needsNewPlan: !activePlan && !draftPlan,
      };
    },
  });

  const show_week_plan = tool({
    description:
      'Show the full weekly plan. Use when the user asks about their week, wants an overview, or says "show my plan".',
    inputSchema: z.object({}),
    execute: async () => {
      const weekStart = getWeekStart();

      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      let sessions: Record<string, unknown>[] = [];
      if (plan) {
        const { data: planSessions } = await supabase
          .from('planned_sessions')
          .select('*')
          .eq('plan_id', plan.id)
          .in('domain', SESSION_DOMAINS)
          .neq('status', 'skipped')
          .order('scheduled_date')
          .order('sort_order');
        sessions = planSessions ?? [];
      }

      const weekEnd = (() => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() + 6);
        return d.toISOString().slice(0, 10);
      })();
      const { data: extraSessions } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_extra', true)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .in('domain', SESSION_DOMAINS)
        .order('scheduled_date');
      if (extraSessions) sessions.push(...extraSessions);

      return {
        weekStart,
        plan: plan ?? null,
        sessions,
        trackingBriefs: plan?.tracking_briefs ?? null,
        hasPlan: plan !== null || sessions.length > 0,
      };
    },
  });

  const show_session = tool({
    description:
      'Show full detail for a specific planned session. Use when the user wants to see their workout, cardio session, or any session detail.',
    inputSchema: z.object({
      sessionId: z.string().describe('The ID of the planned session to show'),
    }),
    execute: async ({ sessionId }: { sessionId: string }) => {
      const { data: session } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (!session) return { error: 'Session not found' };
      return { session };
    },
  });

  const complete_session = tool({
    description:
      'Mark a planned session as completed. Use when the user says they finished a session, did a workout, completed their run, etc.',
    inputSchema: z.object({
      sessionId: z.string().describe('The ID of the session to complete'),
      completedDetail: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional actual values (e.g., actual duration, actual weights)'),
    }),
    execute: async ({ sessionId, completedDetail }: { sessionId: string; completedDetail?: Record<string, unknown> }) => {
      const { data: session, error } = await supabase
        .from('planned_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_detail: completedDetail ?? null,
        })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !session) {
        return { error: error?.message ?? 'Session not found' };
      }

      const weekStart = getWeekStart();
      const { data: activePlan } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'active')
        .maybeSingle();

      const weekSessions = await fetchWeekSessions(supabase, userId, weekStart, activePlan?.id ?? null);

      return { session, weekProgress: computeWeekProgress(weekSessions) };
    },
  });

  const log_session = tool({
    description:
      'Log a session the user completed that is not in their plan. Use when the user reports an activity (run, workout, meditation, etc.) that doesn\'t match any pending planned session for today.',
    inputSchema: z.object({
      domain: z.enum(['cardio', 'strength', 'mindfulness']).describe('Session domain'),
      title: z.string().describe('Short title for the session (e.g. "5K Run", "Yoga Class")'),
      scheduledDate: z.string().optional().describe('Date the session was done (YYYY-MM-DD). Defaults to today.'),
      detail: z.record(z.string(), z.unknown()).describe('Session detail (zone, duration, exercises, etc.)'),
    }),
    execute: async ({ domain, title, scheduledDate, detail }: {
      domain: SessionDomain;
      title: string;
      scheduledDate?: string;
      detail: Record<string, unknown>;
    }) => {
      const date = scheduledDate ?? getTodayISO();
      const [y, m, d] = date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const weekStart = getWeekStart(new Date(y, m - 1, d));

      const { data: activePlan } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'active')
        .maybeSingle();

      const { data: session, error } = await supabase
        .from('planned_sessions')
        .insert({
          plan_id: activePlan?.id ?? null,
          user_id: userId,
          domain,
          day_of_week: dayOfWeek,
          scheduled_date: date,
          title,
          status: 'completed',
          detail,
          completed_at: new Date().toISOString(),
          is_extra: true,
          sort_order: 0,
        })
        .select()
        .single();

      if (error || !session) {
        return { error: error?.message ?? 'Failed to log session' };
      }

      const weekSessions = await fetchWeekSessions(supabase, userId, weekStart, activePlan?.id ?? null);

      return { session, weekProgress: computeWeekProgress(weekSessions), isExtra: true };
    },
  });

  const show_progress = tool({
    description:
      'Show weekly progress across session domains. Use when the user asks about progress or wants a status check.',
    inputSchema: z.object({}),
    execute: async () => {
      const weekStart = getWeekStart();

      const { data: activePlan } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'active')
        .maybeSingle();

      const sessionRows = await fetchWeekSessions(supabase, userId, weekStart, activePlan?.id ?? null);

      const { data: habits } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStart);

      return {
        weekStart,
        progress: computeWeekProgress(sessionRows),
        steps: (habits ?? []).map((h: Record<string, unknown>) => ({
          date: h.date,
          steps: h.steps_actual ?? 0,
          target: h.steps_target ?? 10000,
        })),
      };
    },
  });

  const log_daily = tool({
    description:
      'Log daily habits: steps, nutrition on-plan, sleep hours/quality. Use when the user reports steps, meals, or sleep.',
    inputSchema: z.object({
      steps: z.number().optional().describe('Number of steps today'),
      nutritionOnPlan: z.boolean().optional().describe('Whether nutrition was on-plan'),
      sleepHours: z.number().optional().describe('Hours of sleep last night'),
      sleepQuality: z.number().min(1).max(5).optional().describe('Sleep quality 1-5'),
    }),
    execute: async ({ steps, nutritionOnPlan, sleepHours, sleepQuality }: {
      steps?: number;
      nutritionOnPlan?: boolean;
      sleepHours?: number;
      sleepQuality?: number;
    }) => {
      const today = getTodayISO();

      const updates: Record<string, unknown> = {};
      if (steps !== undefined) updates.steps_actual = steps;
      if (nutritionOnPlan !== undefined) updates.nutrition_on_plan = nutritionOnPlan;
      if (sleepHours !== undefined) updates.sleep_hours = sleepHours;
      if (sleepQuality !== undefined) updates.sleep_quality = sleepQuality;

      const { data, error } = await supabase
        .from('daily_habits')
        .upsert(
          { user_id: userId, date: today, ...updates },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single();

      if (error) return { error: error.message };
      return { logged: data };
    },
  });

  const adapt_plan = tool({
    description:
      'Modify upcoming planned sessions. Use when the user can\'t make a session, wants to reschedule, swap days, or change the plan. After adapting, call show_session to display the updated session.',
    inputSchema: z.object({
      sessionId: z.string().describe('Session to modify'),
      action: z.enum(['skip', 'reschedule', 'modify']),
      newDate: z.string().optional().describe('New date for reschedule (YYYY-MM-DD)'),
      newDetail: z.record(z.string(), z.unknown()).optional().describe('Updated detail fields for modify -- merged with existing detail, so only include changed fields'),
      newTitle: z.string().optional().describe('Updated session title (optional)'),
      reason: z.string().describe('Why the change is being made'),
    }),
    execute: async ({ sessionId, action, newDate, newDetail, newTitle, reason }: {
      sessionId: string;
      action: 'skip' | 'reschedule' | 'modify';
      newDate?: string;
      newDetail?: Record<string, unknown>;
      newTitle?: string;
      reason: string;
    }) => {
      const { data: existing } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (!existing) return { error: 'Session not found' };

      if (action === 'skip') {
        const { data } = await supabase
          .from('planned_sessions')
          .update({ status: 'skipped' })
          .eq('id', sessionId)
          .eq('user_id', userId)
          .select()
          .single();
        return { action: 'skipped', session: data, reason };
      }

      if (action === 'reschedule' && newDate) {
        const [y, m, d] = newDate.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        const { data } = await supabase
          .from('planned_sessions')
          .update({ scheduled_date: newDate, day_of_week: dayOfWeek })
          .eq('id', sessionId)
          .eq('user_id', userId)
          .select()
          .single();
        return { action: 'rescheduled', session: data, newDate, reason };
      }

      if (action === 'modify') {
        const mergedDetail = { ...(existing.detail as Record<string, unknown>), ...newDetail };
        const updates: Record<string, unknown> = { detail: mergedDetail };
        if (newTitle) updates.title = newTitle;

        const { data } = await supabase
          .from('planned_sessions')
          .update(updates)
          .eq('id', sessionId)
          .eq('user_id', userId)
          .select()
          .single();
        return { action: 'modified', session: data, reason };
      }

      return { error: 'Invalid action or missing parameters' };
    },
  });

  const generate_plan = tool({
    description:
      'Generate a new weekly plan. Use when the user has no plan, requests a new plan, wants to replan, or after onboarding. Set draft=true during the interactive planning flow so the user can review before confirming.',
    inputSchema: z.object({
      weekStart: z.string().optional().describe('Week start date (YYYY-MM-DD). Defaults to current week.'),
      draft: z.boolean().optional().describe('If true, plan is saved as draft for user review before activation.'),
      planningContext: z.string().optional().describe('Schedule/logistics context from the planning conversation (e.g. "traveling Mon-Wed, gym access Thu-Sun, prefer morning sessions").'),
    }),
    execute: async ({ weekStart, draft, planningContext }: { weekStart?: string; draft?: boolean; planningContext?: string }) => {
      const result = await generateWeeklyPlan(userId, supabase, {
        weekStart: weekStart ?? getWeekStart(),
        draft,
        planningContext,
      });

      if (!result.success || !result.planId) return result;

      if (draft) {
        const { data: plan } = await supabase
          .from('weekly_plans')
          .select('*')
          .eq('id', result.planId)
          .single();

        const { data: sessions } = await supabase
          .from('planned_sessions')
          .select('*')
          .eq('plan_id', result.planId)
          .in('domain', SESSION_DOMAINS)
          .neq('status', 'skipped')
          .order('scheduled_date')
          .order('sort_order');

        return {
          ...result,
          plan: plan ?? null,
          sessions: sessions ?? [],
          trackingBriefs: plan?.tracking_briefs ?? null,
        };
      }

      return result;
    },
  });

  const confirm_plan = tool({
    description:
      'Confirm and activate a draft weekly plan after the user has reviewed it and is happy with it.',
    inputSchema: z.object({
      planId: z.string().describe('The ID of the draft plan to confirm'),
    }),
    execute: async ({ planId }: { planId: string }) => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .update({ status: 'active' })
        .eq('id', planId)
        .eq('user_id', userId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error || !data) {
        return { error: error?.message ?? 'Plan not found or already active' };
      }

      return { confirmed: true, planId };
    },
  });

  const start_timer = tool({
    description:
      'Start the built-in breathwork or meditation timer. Use when the user wants to do breathwork, meditation, or a timed session.',
    inputSchema: z.object({
      minutes: z.number().default(5).describe('Timer duration in minutes'),
      label: z.string().optional().describe('What this timer is for'),
    }),
    execute: async ({ minutes, label }: { minutes: number; label?: string }) => {
      return {
        minutes,
        label: label ?? `${minutes} min session`,
        autoTrigger: true,
      };
    },
  });

  const save_context = tool({
    description:
      "Save or update information about the user's situation -- injuries, physical limitations, equipment, training environment, travel, or schedule changes. Each fact is saved separately with a time scope. Also use to deactivate outdated facts.",
    inputSchema: z.object({
      add: z.array(z.object({
        category: z.enum(['physical', 'environment', 'equipment', 'schedule']),
        content: z.string().describe('Clear, specific description of the fact'),
        scope: z.enum(['permanent', 'temporary']),
        expiresAt: z.string().optional().describe('ISO date when temporary items expire (YYYY-MM-DD)'),
      })).optional().describe('New context items to save'),
      removeIds: z.array(z.string()).optional().describe('IDs of context items that are no longer relevant'),
    }),
    execute: async ({ add, removeIds }: {
      add?: Array<{ category: string; content: string; scope: string; expiresAt?: string }>;
      removeIds?: string[];
    }) => {
      if (removeIds && removeIds.length > 0) {
        await supabase
          .from('user_context')
          .update({ active: false })
          .eq('user_id', userId)
          .in('id', removeIds);
      }

      if (add && add.length > 0) {
        const rows = add.map((item) => ({
          user_id: userId,
          category: item.category,
          content: item.content,
          scope: item.scope,
          expires_at: item.expiresAt ?? null,
          source: 'conversation' as const,
        }));
        await supabase.from('user_context').insert(rows);
      }

      const today = getTodayISO();
      const { data: active } = await supabase
        .from('user_context')
        .select('id, category, content, scope, expires_at')
        .eq('user_id', userId)
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gte.${today}`);

      return {
        saved: add?.length ?? 0,
        removed: removeIds?.length ?? 0,
        activeContext: active ?? [],
      };
    },
  });

  return {
    show_today_plan,
    show_week_plan,
    show_session,
    complete_session,
    log_session,
    show_progress,
    log_daily,
    adapt_plan,
    generate_plan,
    confirm_plan,
    start_timer,
    save_context,
  };
}

// =============================================================================
// Helpers
// =============================================================================

async function fetchWeekSessions(
  supabase: AppSupabaseClient,
  userId: string,
  weekStart: string,
  planId: string | null,
): Promise<SessionRow[]> {
  const rows: SessionRow[] = [];

  if (planId) {
    const { data } = await supabase
      .from('planned_sessions')
      .select('domain, status')
      .eq('plan_id', planId)
      .in('domain', SESSION_DOMAINS);
    if (data) rows.push(...(data as SessionRow[]));
  }

  const weekEnd = (() => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const { data: extras } = await supabase
    .from('planned_sessions')
    .select('domain, status')
    .eq('user_id', userId)
    .eq('is_extra', true)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)
    .in('domain', SESSION_DOMAINS);
  if (extras) rows.push(...(extras as SessionRow[]));

  return rows;
}

function computeWeekProgress(sessions: SessionRow[]) {
  const byDomain: Record<string, { total: number; completed: number; skipped: number }> = {};
  for (const d of SESSION_DOMAINS) {
    byDomain[d] = { total: 0, completed: 0, skipped: 0 };
  }
  for (const s of sessions) {
    const d = s.domain as Domain;
    if (!byDomain[d]) continue;
    byDomain[d].total++;
    if (s.status === 'completed') byDomain[d].completed++;
    if (s.status === 'skipped') byDomain[d].skipped++;
  }
  return Object.entries(byDomain).map(([domain, counts]) => ({
    domain,
    label: DOMAIN_META[domain as Domain].label,
    ...counts,
    completionRate: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
  }));
}
