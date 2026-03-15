import { tool } from 'ai';
import { z } from 'zod';
import { getWeekStart, getTodayISO, DOMAINS, Domain, DOMAIN_META, SESSION_DOMAINS, type SessionDomain } from '@/lib/types';
import type { AppSupabaseClient } from '@/lib/types';
import { generateWeeklyPlan } from '@/lib/ai/planGeneration';
import { validatePlanFromDB, type ValidationResult } from '@/lib/ai/planSchema';

interface SessionRow { domain: string; status: string }

export function createTools(userId: string, supabase: AppSupabaseClient, conversationId?: string, timezone: string = 'UTC') {

  const show_today_plan = tool({
    description:
      'Show the user their planned sessions for today plus daily tracking targets. Call this when greeting the user, when they ask "what should I do today", or at the start of any conversation.',
    inputSchema: z.object({}),
    execute: async () => {
      const today = getTodayISO(timezone);
      const weekStart = getWeekStart(timezone);

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
          .eq('is_extra', false)
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
      const weekStart = getWeekStart(timezone);

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
          .eq('is_extra', false)
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
        .neq('status', 'skipped')
        .order('scheduled_date');
      if (extraSessions) sessions.push(...extraSessions);

      return {
        weekStart,
        plan: plan ?? null,
        sessions,
        trackingBriefs: plan?.tracking_briefs ?? null,
        hasPlan: plan !== null || sessions.length > 0,
        isDraft: plan?.status === 'draft',
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

      const weekStart = getWeekStart(timezone);
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
      const date = scheduledDate ?? getTodayISO(timezone);
      const [y, m, d] = date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const weekStart = getWeekStart(timezone);

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
          plan_id: null,
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
      'Show weekly progress across all five domains. Use when the user asks about progress or wants a status check.',
    inputSchema: z.object({}),
    execute: async () => {
      const weekStart = getWeekStart(timezone);
      const today = getTodayISO(timezone);

      const { data: activePlan } = await supabase
        .from('weekly_plans')
        .select('id, tracking_briefs')
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

      const habitsArr = (habits ?? []) as Record<string, unknown>[];

      const daysSoFar = Math.min(7, Math.max(1,
        Math.floor((new Date(today + 'T12:00:00Z').getTime() - new Date(weekStart + 'T12:00:00Z').getTime()) / 86400000) + 1
      ));

      const nutritionLogged = habitsArr.filter(h => h.nutrition_on_plan != null);
      const daysOnPlan = nutritionLogged.filter(h => h.nutrition_on_plan === true).length;

      const briefs = activePlan?.tracking_briefs as { sleep?: { targetHours?: number } } | null;
      const sleepTarget = briefs?.sleep?.targetHours ?? 7;
      const sleepLogged = habitsArr.filter(h => h.sleep_hours != null);
      const daysOnSleepTarget = sleepLogged.filter(h => Number(h.sleep_hours) >= sleepTarget).length;
      const avgSleepHours = sleepLogged.length > 0
        ? Math.round(sleepLogged.reduce((s, h) => s + Number(h.sleep_hours), 0) / sleepLogged.length * 10) / 10
        : null;

      return {
        weekStart,
        hasPlan: !!activePlan,
        progress: [
          ...computeWeekProgress(sessionRows),
          {
            domain: 'nutrition',
            label: DOMAIN_META.nutrition.label,
            total: daysSoFar,
            completed: daysOnPlan,
            skipped: 0,
            completionRate: daysSoFar > 0 ? Math.round((daysOnPlan / daysSoFar) * 100) : 0,
          },
          {
            domain: 'sleep',
            label: DOMAIN_META.sleep.label,
            total: daysSoFar,
            completed: daysOnSleepTarget,
            skipped: 0,
            completionRate: daysSoFar > 0 ? Math.round((daysOnSleepTarget / daysSoFar) * 100) : 0,
          },
        ],
        avgSleepHours,
        steps: habitsArr.map(h => ({
          date: h.date,
          steps: h.steps_actual ?? 0,
          target: h.steps_target ?? 10000,
        })),
      };
    },
  });

  const log_daily = tool({
    description:
      'Log daily tracking: steps, nutrition on-plan, sleep hours/quality. Use when the user reports steps, meals, or sleep.',
    inputSchema: z.object({
      steps: z.number().optional().describe('Number of steps today'),
      nutritionOnPlan: z.boolean().optional().describe('Whether nutrition was on-plan'),
      sleepHours: z.number().optional().describe('Hours of sleep last night'),
      sleepQuality: z.number().min(1).max(5).optional().describe('Sleep quality 1-5'),
      date: z.string().optional().describe('Date to log for (YYYY-MM-DD). Defaults to today. Use when the user reports data for a past date.'),
    }),
    execute: async ({ steps, nutritionOnPlan, sleepHours, sleepQuality, date }: {
      steps?: number;
      nutritionOnPlan?: boolean;
      sleepHours?: number;
      sleepQuality?: number;
      date?: string;
    }) => {
      const targetDate = date ?? getTodayISO(timezone);

      const updates: Record<string, unknown> = {};
      if (steps !== undefined) updates.steps_actual = steps;
      if (nutritionOnPlan !== undefined) updates.nutrition_on_plan = nutritionOnPlan;
      if (sleepHours !== undefined) updates.sleep_hours = sleepHours;
      if (sleepQuality !== undefined) updates.sleep_quality = sleepQuality;

      const { data: row, error } = await supabase
        .from('daily_habits')
        .upsert(
          { user_id: userId, date: targetDate, ...updates },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single();

      if (error) return { error: error.message };
      return { logged: row };
    },
  });

  const log_weight = tool({
    description:
      'Log a body weight entry. Use when the user reports their weight (e.g. "I weigh 75 kg", "weight is 165 lbs"). Stores one entry per day.',
    inputSchema: z.object({
      weightKg: z.number().min(20).max(300).describe('Weight in kilograms'),
      date: z.string().optional().describe('Date to log for (YYYY-MM-DD). Defaults to today.'),
    }),
    execute: async ({ weightKg, date }: { weightKg: number; date?: string }) => {
      const targetDate = date ?? getTodayISO(timezone);

      const { data: entry, error } = await supabase
        .from('weight_entries')
        .upsert(
          { user_id: userId, date: targetDate, weight_kg: weightKg },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single();

      if (error) return { error: error.message };

      const { data: latest } = await supabase
        .from('weight_entries')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (latest && latest.date <= targetDate) {
        await supabase
          .from('user_profiles')
          .update({ weight_kg: weightKg })
          .eq('id', userId);
      }

      const { data: prev } = await supabase
        .from('weight_entries')
        .select('weight_kg')
        .eq('user_id', userId)
        .lt('date', targetDate)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const deltaKg = prev ? Number((weightKg - Number(prev.weight_kg)).toFixed(1)) : null;

      return { entry, deltaKg };
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

  const delete_session = tool({
    description:
      'Delete one or more sessions from the plan entirely. Accepts a single ID or an array of IDs -- always batch into ONE call. Use when the user asks to remove/delete sessions, or to clean up duplicates. Prefer adapt_plan with "skip" when the user just wants to pass on a session.',
    inputSchema: z.object({
      sessionIds: z.union([z.string(), z.array(z.string())]).optional().describe('Session ID or array of IDs to delete'),
      sessionId: z.string().optional().describe('Single session ID (use sessionIds for new calls)'),
      reason: z.string().describe('Why the sessions are being deleted'),
    }),
    execute: async ({ sessionIds, sessionId, reason }: { sessionIds?: string | string[]; sessionId?: string; reason: string }) => {
      const raw = sessionIds ?? sessionId;
      if (!raw) return { error: 'No session IDs provided' };
      const ids = Array.isArray(raw) ? raw : [raw];

      const { data: existing } = await supabase
        .from('planned_sessions')
        .select('id, title, domain, status')
        .in('id', ids)
        .eq('user_id', userId);

      if (!existing || existing.length === 0) return { error: 'No sessions found' };

      const { error } = await supabase
        .from('planned_sessions')
        .delete()
        .in('id', existing.map(s => s.id))
        .eq('user_id', userId);

      if (error) return { error: error.message };

      return { deleted: existing.length, sessions: existing, reason };
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
        weekStart: weekStart ?? getWeekStart(timezone),
        draft,
        planningContext,
      });

      if (!result.success || !result.planId) return result;

      const validationResult: ValidationResult | undefined = result.validation;

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
          validation: validationResult,
        };
      }

      return { ...result, validation: validationResult };
    },
  });

  const confirm_plan = tool({
    description:
      'Confirm and activate a draft weekly plan after the user has reviewed it and is happy with it. The planId is optional -- if omitted, the current week\'s draft is confirmed automatically.',
    inputSchema: z.object({
      planId: z.string().optional().describe('The ID of the draft plan to confirm. If omitted, confirms the current week\'s draft.'),
    }),
    execute: async ({ planId }: { planId?: string }) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let targetId = planId && UUID_RE.test(planId) ? planId : undefined;

      if (!targetId) {
        const weekStart = getWeekStart(timezone);
        const { data: draft } = await supabase
          .from('weekly_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('week_start', weekStart)
          .eq('status', 'draft')
          .maybeSingle();
        targetId = draft?.id;
      }

      if (!targetId) {
        return { error: 'No draft plan found to confirm' };
      }

      const { data, error } = await supabase
        .from('weekly_plans')
        .update({ status: 'active' })
        .eq('id', targetId)
        .eq('user_id', userId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error || !data) {
        return { error: error?.message ?? 'Plan not found or already active' };
      }

      return { confirmed: true, planId: targetId };
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
      "Save or update information about the user's situation -- injuries, physical limitations, equipment, training environment, travel, schedule changes, or behavioral patterns you've observed. Each fact is saved separately with a time scope. Also use to deactivate outdated facts.",
    inputSchema: z.object({
      add: z.array(z.object({
        category: z.enum(['physical', 'environment', 'equipment', 'schedule', 'behavioral']),
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

      const today = getTodayISO(timezone);
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

  const save_feedback = tool({
    description:
      'Save user feedback about the huuman app or coaching experience. Use when the user reports a bug, requests a feature, or shares feedback about the experience.',
    inputSchema: z.object({
      category: z.enum(['bug', 'feature_request', 'experience']),
      content: z.string().describe('Clear summary of the feedback'),
      rawQuotes: z.array(z.string()).describe(
        "The user's exact words -- copy their messages verbatim, no paraphrasing",
      ),
    }),
    execute: async ({ category, content, rawQuotes }: {
      category: 'bug' | 'feature_request' | 'experience';
      content: string;
      rawQuotes: string[];
    }) => {
      await supabase.from('user_feedback').insert({
        user_id: userId,
        category,
        content,
        raw_quotes: rawQuotes,
        conversation_id: conversationId ?? null,
      });
      return { saved: true };
    },
  });

  const get_sessions = tool({
    description:
      'Query sessions across weeks. Use to look up past sessions, check completion history, track progressive overload, or review what happened in previous weeks. Returns raw data, no UI card.',
    inputSchema: z.object({
      weekStart: z.string().optional().describe('Filter by week start date (YYYY-MM-DD). Omit for all recent sessions.'),
      domain: z.enum(['cardio', 'strength', 'mindfulness']).optional().describe('Filter by domain'),
      status: z.enum(['pending', 'completed', 'skipped']).optional().describe('Filter by status'),
      limit: z.number().optional().describe('Max results (default 20)'),
    }),
    execute: async ({ weekStart, domain, status, limit }: {
      weekStart?: string;
      domain?: SessionDomain;
      status?: string;
      limit?: number;
    }) => {
      let query = supabase
        .from('planned_sessions')
        .select('id, domain, title, scheduled_date, status, detail, completed_detail, completed_at, is_extra, plan_id')
        .eq('user_id', userId)
        .in('domain', SESSION_DOMAINS)
        .order('scheduled_date', { ascending: false })
        .limit(limit ?? 20);

      if (domain) query = query.eq('domain', domain);
      if (status) query = query.eq('status', status);

      if (weekStart) {
        const weekEnd = (() => {
          const d = new Date(weekStart + 'T00:00:00');
          d.setDate(d.getDate() + 6);
          return d.toISOString().slice(0, 10);
        })();
        query = query.gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd);
      }

      const { data, error } = await query;
      if (error) return { error: error.message };
      return { sessions: data ?? [], count: data?.length ?? 0 };
    },
  });

  const get_habits = tool({
    description:
      'Query daily habit data (steps, nutrition, sleep) over a date range. Use to check trends, averages, and adherence patterns. Returns raw data, no UI card.',
    inputSchema: z.object({
      from: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to 7 days ago.'),
      to: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
    }),
    execute: async ({ from, to }: { from?: string; to?: string }) => {
      const today = getTodayISO(timezone);
      const defaultFrom = (() => {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() - 6);
        return d.toISOString().slice(0, 10);
      })();

      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from ?? defaultFrom)
        .lte('date', to ?? today)
        .order('date', { ascending: true });

      if (error) return { error: error.message };

      const habits = data ?? [];
      const sleepEntries = habits.filter(h => h.sleep_hours != null);
      const avgSleep = sleepEntries.length > 0
        ? Math.round(sleepEntries.reduce((s, h) => s + Number(h.sleep_hours), 0) / sleepEntries.length * 10) / 10
        : null;
      const nutritionEntries = habits.filter(h => h.nutrition_on_plan != null);
      const daysOnPlan = nutritionEntries.filter(h => h.nutrition_on_plan === true).length;

      return {
        habits,
        summary: {
          days: habits.length,
          avgSleepHours: avgSleep,
          nutritionDaysOnPlan: daysOnPlan,
          nutritionDaysLogged: nutritionEntries.length,
          avgSteps: habits.filter(h => h.steps_actual).length > 0
            ? Math.round(habits.filter(h => h.steps_actual).reduce((s, h) => s + Number(h.steps_actual), 0) / habits.filter(h => h.steps_actual).length)
            : null,
        },
      };
    },
  });

  const get_context = tool({
    description:
      'Read back the user\'s active context items (injuries, equipment, environment, schedule). Use to verify what you know about this person before making recommendations or generating plans.',
    inputSchema: z.object({
      category: z.enum(['physical', 'environment', 'equipment', 'schedule']).optional().describe('Filter by category. Omit for all categories.'),
    }),
    execute: async ({ category }: { category?: string }) => {
      const today = getTodayISO(timezone);
      let query = supabase
        .from('user_context')
        .select('id, category, content, scope, expires_at, source, created_at')
        .eq('user_id', userId)
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gte.${today}`)
        .order('created_at', { ascending: false });

      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) return { error: error.message };
      return { context: data ?? [], count: data?.length ?? 0 };
    },
  });

  const validate_plan = tool({
    description:
      'Validate the current week\'s plan against conviction rules, session quality, and structural soundness. Call after generate_plan, after a series of adapt_plan changes, or anytime you want to verify the plan holds up. Returns rule-based validation results plus active user context for you to check semantic compliance (e.g., do exercises respect injuries?).',
    inputSchema: z.object({
      weekStart: z.string().optional().describe('Week to validate (YYYY-MM-DD). Defaults to current week.'),
    }),
    execute: async ({ weekStart: ws }: { weekStart?: string }) => {
      const targetWeek = ws ?? getWeekStart(timezone);
      const today = getTodayISO(timezone);

      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('id, status')
        .eq('user_id', userId)
        .eq('week_start', targetWeek)
        .in('status', ['active', 'draft'])
        .maybeSingle();

      if (!plan) return { error: 'No active or draft plan found for this week.' };

      const { data: sessions } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('plan_id', plan.id)
        .in('domain', SESSION_DOMAINS)
        .neq('status', 'skipped')
        .eq('is_extra', false);

      if (!sessions || sessions.length === 0) {
        return { error: 'No sessions found in plan.' };
      }

      const sessionOutputs = sessions.map(s => ({
        domain: s.domain as 'cardio' | 'strength' | 'mindfulness',
        dayOfWeek: s.day_of_week as number,
        title: s.title as string,
        detail: (typeof s.detail === 'string' ? JSON.parse(s.detail) : s.detail ?? {}) as Record<string, unknown>,
        sortOrder: (s.sort_order ?? 0) as number,
        scheduledDate: s.scheduled_date as string,
      }));

      const validation = validatePlanFromDB(sessionOutputs);

      const { data: context } = await supabase
        .from('user_context')
        .select('id, category, content, scope, expires_at')
        .eq('user_id', userId)
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gte.${today}`);

      return {
        weekStart: targetWeek,
        planStatus: plan.status,
        validation,
        sessionCount: sessions.length,
        activeContext: context ?? [],
        contextNote: context && context.length > 0
          ? 'Review the active context items above and verify that planned sessions respect injuries, available equipment, schedule constraints, and environment.'
          : 'No active user context. Validation covers conviction rules and session quality only.',
      };
    },
  });

  const search_youtube = tool({
    description:
      'Search YouTube for relevant videos. Use when the user asks for exercise demos, technique videos, guided meditations, breathwork guides, or any health/fitness video content. Also use proactively when recommending a session that could benefit from a visual reference.',
    inputSchema: z.object({
      query: z.string().describe('Search query (e.g. "zone 2 running form tips", "box breathing guided 5 minutes")'),
      maxResults: z.number().min(1).max(5).optional().describe('1 for a single targeted recommendation, 2-3 for giving options (default 1)'),
      videoDuration: z.enum(['any', 'short', 'medium', 'long']).optional().describe('Filter by length: short (<4 min), medium (4-20 min), long (>20 min). Omit or "any" for no filter.'),
    }),
    execute: async ({ query, maxResults, videoDuration }: { query: string; maxResults?: number; videoDuration?: string }) => {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return { error: 'YouTube search is not configured.' };

      const limit = maxResults ?? 1;

      const params: Record<string, string> = {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: String(limit),
        videoEmbeddable: 'true',
        safeSearch: 'strict',
        key: apiKey,
      };
      if (videoDuration && videoDuration !== 'any') {
        params.videoDuration = videoDuration;
      }

      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${new URLSearchParams(params)}`);
      if (!searchRes.ok) {
        return { error: 'YouTube search failed. Try again later.' };
      }
      const searchData = await searchRes.json() as {
        items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; description?: string; thumbnails?: { medium?: { url?: string } } } }>;
      };

      const videoIds = (searchData.items ?? [])
        .map(item => item.id?.videoId)
        .filter((id): id is string => !!id);

      if (videoIds.length === 0) return { videos: [], query };

      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
          part: 'contentDetails,statistics',
          id: videoIds.join(','),
          key: apiKey,
        })}`,
      );
      const detailMap = new Map<string, { duration?: string; viewCount?: string }>();
      if (detailRes.ok) {
        const detailData = await detailRes.json() as {
          items?: Array<{ id?: string; contentDetails?: { duration?: string }; statistics?: { viewCount?: string } }>;
        };
        for (const item of detailData.items ?? []) {
          if (item.id) {
            detailMap.set(item.id, {
              duration: item.contentDetails?.duration,
              viewCount: item.statistics?.viewCount,
            });
          }
        }
      }

      const videos = (searchData.items ?? [])
        .filter(item => item.id?.videoId)
        .map(item => {
          const videoId = item.id!.videoId!;
          const detail = detailMap.get(videoId);
          return {
            videoId,
            title: item.snippet?.title ?? '',
            channel: item.snippet?.channelTitle ?? '',
            description: (item.snippet?.description ?? '').slice(0, 200),
            thumbnail: item.snippet?.thumbnails?.medium?.url ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            duration: detail?.duration ?? null,
            viewCount: detail?.viewCount ?? null,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        });

      return { videos, query };
    },
  });

  const save_progress_photo = tool({
    description:
      'Save a body composition or progress photo the user just sent. Use when the user sends a physique selfie or progress photo.',
    inputSchema: z.object({
      imageUrl: z.string().describe('The image URL from the user message'),
      analysis: z.string().describe('Your visual analysis: posture, muscle definition, proportions, body fat distribution'),
      notes: z.string().optional().describe('Optional user-provided context (e.g. "12 weeks into cut")'),
      capturedAt: z.string().optional().describe('Date the photo was taken (YYYY-MM-DD). Defaults to today. Use when the user says the photo is from a past date.'),
    }),
    execute: async ({ imageUrl, analysis, notes, capturedAt }: { imageUrl: string; analysis: string; notes?: string; capturedAt?: string }) => {
      const date = capturedAt ?? getTodayISO(timezone);

      const { data, error } = await supabase
        .from('progress_photos')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          ai_analysis: analysis,
          notes: notes ?? null,
          captured_at: date,
          conversation_id: conversationId ?? null,
        })
        .select('id')
        .single();

      if (error) return { error: error.message };

      const { count } = await supabase
        .from('progress_photos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return { saved: true, id: data.id, imageUrl, totalCount: count ?? 1, capturedAt: date };
    },
  });

  const get_progress_photos = tool({
    description:
      'Query saved body composition / progress photos and their analyses. Use to compare progress over time or review past photos.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Max results (default 10)'),
    }),
    execute: async ({ limit }: { limit?: number }) => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, image_url, ai_analysis, notes, captured_at')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(limit ?? 10);

      if (error) return { error: error.message };

      return {
        photos: (data ?? []).map(p => ({
          id: p.id,
          imageUrl: p.image_url,
          analysis: p.ai_analysis,
          notes: p.notes,
          capturedAt: p.captured_at,
        })),
        count: data?.length ?? 0,
      };
    },
  });

  const save_meal_photo = tool({
    description:
      'Save a meal or food photo the user just sent. Use when the user sends a photo of food or a meal.',
    inputSchema: z.object({
      imageUrl: z.string().describe('The image URL from the user message'),
      description: z.string().describe('What you see in the photo (e.g. "Grilled chicken breast with roasted vegetables and brown rice")'),
      estimatedCalories: z.number().optional().describe('Rough calorie estimate'),
      estimatedProteinG: z.number().optional().describe('Rough protein estimate in grams'),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('Meal type, inferred from time of day and content'),
      capturedAt: z.string().optional().describe('Date the photo was taken (YYYY-MM-DD). Defaults to today. Use when the user says the photo is from a past date.'),
    }),
    execute: async ({ imageUrl, description, estimatedCalories, estimatedProteinG, mealType, capturedAt }: {
      imageUrl: string;
      description: string;
      estimatedCalories?: number;
      estimatedProteinG?: number;
      mealType?: string;
      capturedAt?: string;
    }) => {
      const date = capturedAt ?? getTodayISO(timezone);

      const { data, error } = await supabase
        .from('meal_photos')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          description,
          estimated_calories: estimatedCalories ?? null,
          estimated_protein_g: estimatedProteinG ?? null,
          meal_type: mealType ?? null,
          captured_at: date,
          conversation_id: conversationId ?? null,
        })
        .select('id')
        .single();

      if (error) return { error: error.message };

      return {
        saved: true, id: data.id, imageUrl, capturedAt: date,
        description, estimatedCalories: estimatedCalories ?? null,
        estimatedProteinG: estimatedProteinG ?? null, mealType: mealType ?? null,
      };
    },
  });

  const get_meal_photos = tool({
    description:
      "Query saved meal photos with daily calorie/protein totals. Use to check today's meal log or review past meals.",
    inputSchema: z.object({
      date: z.string().optional().describe('Date to query (YYYY-MM-DD). Defaults to today.'),
      limit: z.number().optional().describe('Max results (default 20)'),
    }),
    execute: async ({ date, limit }: { date?: string; limit?: number }) => {
      const targetDate = date ?? getTodayISO(timezone);

      const { data, error } = await supabase
        .from('meal_photos')
        .select('id, image_url, description, estimated_calories, estimated_protein_g, meal_type, captured_at')
        .eq('user_id', userId)
        .eq('captured_at', targetDate)
        .order('created_at', { ascending: true })
        .limit(limit ?? 20);

      if (error) return { error: error.message };

      const photos = (data ?? []).map(p => ({
        id: p.id,
        imageUrl: p.image_url,
        description: p.description,
        estimatedCalories: p.estimated_calories,
        estimatedProteinG: p.estimated_protein_g,
        mealType: p.meal_type,
        capturedAt: p.captured_at,
      }));

      const dailyTotals = {
        meals: photos.length,
        calories: photos.reduce((s, p) => s + (p.estimatedCalories ?? 0), 0),
        proteinG: photos.reduce((s, p) => s + (p.estimatedProteinG ?? 0), 0),
      };

      return { photos, dailyTotals };
    },
  });

  const search_chat_history = tool({
    description:
      'Search through the full conversation history with this user. Use when the user references something they said in a past conversation, asks "remember when I told you...", or when you need to recall a specific discussion. Returns matching messages with timestamps.',
    inputSchema: z.object({
      query: z.string().optional().describe('Text to search for in messages (case-insensitive). Omit to browse by date range.'),
      from: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      role: z.enum(['user', 'assistant']).optional().describe('Filter by message sender'),
      limit: z.number().optional().describe('Max results (default 20, max 50)'),
    }),
    execute: async ({ query, from, to, role, limit }: {
      query?: string;
      from?: string;
      to?: string;
      role?: 'user' | 'assistant';
      limit?: number;
    }) => {
      if (!conversationId) return { error: 'No conversation context available' };

      const maxResults = Math.min(limit ?? 20, 50);

      let dbQuery = supabase
        .from('messages')
        .select('id, role, parts, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (from) dbQuery = dbQuery.gte('created_at', `${from}T00:00:00`);
      if (to) dbQuery = dbQuery.lte('created_at', `${to}T23:59:59`);
      if (role) dbQuery = dbQuery.eq('role', role);

      const { data, error } = await dbQuery;
      if (error) return { error: error.message };

      type RawPart = { type?: string; text?: string };

      let results = (data ?? []).map(msg => {
        const textParts = (msg.parts as RawPart[])
          .filter(p => p.type === 'text' && p.text)
          .map(p => p.text!);
        return {
          role: msg.role,
          text: textParts.join('\n').slice(0, 500),
          date: msg.created_at,
        };
      }).filter(m => m.text.length > 0);

      if (query) {
        const q = query.toLowerCase();
        results = results.filter(m => m.text.toLowerCase().includes(q));
      }

      const matches = results.slice(0, maxResults).reverse();

      return {
        matches,
        totalMatches: results.length,
        showing: matches.length,
        searchedMessages: data?.length ?? 0,
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
    log_weight,
    adapt_plan,
    delete_session,
    generate_plan,
    confirm_plan,
    start_timer,
    save_context,
    save_feedback,
    get_sessions,
    get_habits,
    get_context,
    validate_plan,
    search_youtube,
    save_progress_photo,
    get_progress_photos,
    save_meal_photo,
    get_meal_photos,
    search_chat_history,
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
      .eq('is_extra', false)
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
