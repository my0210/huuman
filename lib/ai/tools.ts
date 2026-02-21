import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getWeekStart, getTodayISO, DOMAINS, Domain, DOMAIN_META } from '@/lib/types';

/**
 * Creates all chat tools with the userId baked in via closure.
 * Call this in the API route after authenticating the user.
 */
export function createTools(userId: string) {

  const show_today_plan = tool({
    description:
      'Show the user their planned sessions for today. Call this when greeting the user, when they ask "what should I do today", or at the start of any conversation.',
    inputSchema: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const today = getTodayISO();
      const weekStart = getWeekStart();

      const { data: sessions } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .order('sort_order');

      const { data: habits } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      return {
        date: today,
        weekStart,
        sessions: sessions ?? [],
        habits: habits ?? null,
        hasPlan: (sessions?.length ?? 0) > 0,
      };
    },
  });

  const show_week_plan = tool({
    description:
      'Show the full weekly plan. Use when the user asks about their week, wants an overview, or says "show my plan".',
    inputSchema: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const weekStart = getWeekStart();

      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      const { data: sessions } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStart)
        .order('scheduled_date')
        .order('sort_order');

      return {
        weekStart,
        plan: plan ?? null,
        sessions: sessions ?? [],
        hasPlan: plan !== null,
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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const { data: allSessions } = await supabase
        .from('planned_sessions')
        .select('domain, status')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStart);

      return { session, weekProgress: computeWeekProgress(allSessions ?? []) };
    },
  });

  const show_progress = tool({
    description:
      'Show weekly progress across all 5 domains. Use when the user asks about progress or wants a status check.',
    inputSchema: z.object({}),
    execute: async () => {
      const supabase = await createClient();
      const weekStart = getWeekStart();

      const { data: sessions } = await supabase
        .from('planned_sessions')
        .select('domain, status')
        .eq('user_id', userId)
        .gte('scheduled_date', weekStart);

      const { data: habits } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStart);

      return {
        weekStart,
        progress: computeWeekProgress(sessions ?? []),
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
      const supabase = await createClient();
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
      'Modify upcoming planned sessions. Use when the user can\'t make a session, wants to reschedule, swap days, or change the plan.',
    inputSchema: z.object({
      sessionId: z.string().describe('Session to modify'),
      action: z.enum(['skip', 'reschedule', 'modify']),
      newDate: z.string().optional().describe('New date for reschedule (YYYY-MM-DD)'),
      newDetail: z.record(z.string(), z.unknown()).optional().describe('Updated detail for modify'),
      reason: z.string().describe('Why the change is being made'),
    }),
    execute: async ({ sessionId, action, newDate, newDetail, reason }: {
      sessionId: string;
      action: 'skip' | 'reschedule' | 'modify';
      newDate?: string;
      newDetail?: Record<string, unknown>;
      reason: string;
    }) => {
      const supabase = await createClient();

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
        const dayOfWeek = new Date(newDate).getDay();
        const { data } = await supabase
          .from('planned_sessions')
          .update({ scheduled_date: newDate, day_of_week: dayOfWeek })
          .eq('id', sessionId)
          .eq('user_id', userId)
          .select()
          .single();
        return { action: 'rescheduled', session: data, newDate, reason };
      }

      if (action === 'modify' && newDetail) {
        const { data } = await supabase
          .from('planned_sessions')
          .update({ detail: newDetail })
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
      'Generate a new weekly plan. Use when the user has no plan, requests a new plan, or after onboarding.',
    inputSchema: z.object({
      weekStart: z.string().optional().describe('Week start date (YYYY-MM-DD). Defaults to current week.'),
    }),
    execute: async ({ weekStart }: { weekStart?: string }) => {
      const targetWeek = weekStart ?? getWeekStart();

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weekStart: targetWeek }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { error: `Plan generation failed: ${err}` };
      }

      return await response.json();
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

  return {
    show_today_plan,
    show_week_plan,
    show_session,
    complete_session,
    show_progress,
    log_daily,
    adapt_plan,
    generate_plan,
    start_timer,
  };
}

// =============================================================================
// Helpers
// =============================================================================

interface SessionRow { domain: string; status: string }

function computeWeekProgress(sessions: SessionRow[]) {
  const byDomain: Record<string, { total: number; completed: number; skipped: number }> = {};
  for (const d of DOMAINS) {
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
