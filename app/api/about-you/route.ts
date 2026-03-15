import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayISO, getWeekStart, SESSION_DOMAINS, DOMAIN_META, type Domain } from '@/lib/types';
import { formatSingleDomainBaseline } from '@/lib/onboarding/formatBaselines';
import type { DomainBaselines } from '@/lib/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = getTodayISO();
  const weekStart = getWeekStart();
  const weekEnd = (() => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const monthStart = today.slice(0, 7) + '-01';

  try {
    const [
      { data: profile },
      { data: plan },
      { data: monthSessions },
      { data: habits },
      { data: contextItems },
      { data: weightEntries },
      { data: progressPhotos, count: progressPhotoCount },
      { data: mealPhotos },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('email, age, weight_kg, domain_baselines, avatar_url, display_name, created_at')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('weekly_plans')
        .select('id, intro_message, tracking_briefs, week_start')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('planned_sessions')
        .select('domain, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', today)
        .in('domain', SESSION_DOMAINS),
      supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', today)
        .order('date', { ascending: true }),
      supabase
        .from('user_context')
        .select('id, category, content, scope, expires_at, source, created_at')
        .eq('user_id', user.id)
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gte.${today}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('weight_entries')
        .select('date, weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(12),
      supabase
        .from('progress_photos')
        .select('id, image_url', { count: 'exact' })
        .eq('user_id', user.id)
        .order('captured_at', { ascending: false })
        .limit(1),
      supabase
        .from('meal_photos')
        .select('estimated_calories, estimated_protein_g')
        .eq('user_id', user.id)
        .gte('captured_at', (() => {
          const d = new Date(today + 'T00:00:00');
          d.setDate(d.getDate() - 6);
          return d.toISOString().slice(0, 10);
        })())
        .lte('captured_at', today),
    ]);

    // Fetch week sessions filtered by plan_id (plan sessions) + extras (is_extra=true)
    let weekSessions: Record<string, unknown>[] = [];
    if (plan) {
      const [{ data: planSessions }, { data: extraSessions }] = await Promise.all([
        supabase
          .from('planned_sessions')
          .select('id, domain, title, scheduled_date, status')
          .eq('plan_id', plan.id)
          .eq('is_extra', false)
          .in('domain', SESSION_DOMAINS)
          .neq('status', 'skipped')
          .order('scheduled_date')
          .order('sort_order'),
        supabase
          .from('planned_sessions')
          .select('id, domain, title, scheduled_date, status')
          .eq('user_id', user.id)
          .eq('is_extra', true)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .in('domain', SESSION_DOMAINS)
          .neq('status', 'skipped')
          .order('scheduled_date'),
      ]);
      weekSessions = [...(planSessions ?? []), ...(extraSessions ?? [])] as Record<string, unknown>[];
    }

    const briefs = plan?.tracking_briefs as { nutrition?: { calorieTarget?: number; proteinTargetG?: number; guidelines?: string[] }; sleep?: { targetHours?: number; bedtimeWindow?: string; wakeWindow?: string } } | null;

    const habitRows = habits ?? [];
    const sleepEntries = habitRows.filter(h => (h as Record<string, unknown>).sleep_hours != null);
    const avgSleepHours = sleepEntries.length > 0
      ? Math.round(sleepEntries.reduce((s, h) => s + Number((h as Record<string, unknown>).sleep_hours), 0) / sleepEntries.length * 10) / 10
      : null;
    const nutritionEntries = habitRows.filter(h => (h as Record<string, unknown>).nutrition_on_plan != null);
    const nutritionDaysOnPlan = nutritionEntries.filter(h => (h as Record<string, unknown>).nutrition_on_plan === true).length;

    const sessionCounts = SESSION_DOMAINS.map(d => ({
      domain: d,
      count: (monthSessions ?? []).filter(s => (s as Record<string, unknown>).domain === d).length,
    })).filter(s => s.count > 0);

    const weight = weightEntries ?? [];
    const currentWeight = weight.length > 0 ? Number((weight[0] as Record<string, unknown>).weight_kg) : null;
    const earliest = weight.length > 1 ? weight[weight.length - 1] as Record<string, unknown> : null;
    const deltaKg = currentWeight != null && earliest
      ? Math.round((currentWeight - Number(earliest.weight_kg)) * 10) / 10
      : null;

    const meals = mealPhotos ?? [];
    const mealsWithCals = meals.filter(m => (m as Record<string, unknown>).estimated_calories != null);
    const avgCalories = mealsWithCals.length > 0
      ? Math.round(mealsWithCals.reduce((s, m) => s + Number((m as Record<string, unknown>).estimated_calories), 0) / mealsWithCals.length)
      : null;
    const mealsWithProtein = meals.filter(m => (m as Record<string, unknown>).estimated_protein_g != null);
    const avgProtein = mealsWithProtein.length > 0
      ? Math.round(mealsWithProtein.reduce((s, m) => s + Number((m as Record<string, unknown>).estimated_protein_g), 0) / mealsWithProtein.length)
      : null;

    const myNotes = [
      ...(contextItems ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        content: r.content as string,
        category: r.category as string,
        date: new Date(r.created_at as string).toISOString().slice(0, 10),
        source: r.source as string,
        scope: r.scope as string,
        expiresAt: (r.expires_at as string) ?? null,
        deletable: true,
      })),
      ...formatBaselineNotes(profile?.domain_baselines as DomainBaselines | null, profile?.created_at as string | null),
      ...formatAgeNote(profile?.age as number | null, profile?.created_at as string | null),
    ];

    return NextResponse.json({
      yourPlan: {
        coachRationale: (plan?.intro_message as string) ?? null,
        trackingBriefs: briefs ?? null,
        sessions: weekSessions.map((s) => ({
          id: s.id as string,
          domain: s.domain as string,
          title: s.title as string,
          scheduledDate: s.scheduled_date as string,
          status: s.status as string,
        })),
        habits: {
          avgSleepHours,
          nutritionDaysOnPlan,
          daysTracked: habitRows.length,
        },
        hasPlan: !!plan,
      },
      myNotes,
      yourNumbers: {
        weight: {
          entries: weight.map((e: Record<string, unknown>) => ({
            date: e.date as string,
            weightKg: Number(e.weight_kg),
          })),
          current: currentWeight,
          deltaKg,
          earliestDate: earliest ? (earliest.date as string) : null,
        },
        sessions: sessionCounts,
        nutrition: {
          avgCalories,
          avgProtein,
          daysLogged: meals.length,
        },
        progressPhotoCount: progressPhotoCount ?? 0,
        latestProgressPhotoUrl: progressPhotos?.[0]
          ? (progressPhotos[0] as Record<string, unknown>).image_url as string
          : null,
      },
    });
  } catch (err) {
    console.error('[AboutYou] Failed to load:', err);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

const BASELINE_CATEGORIES: Record<Domain, string> = {
  cardio: 'physical',
  strength: 'physical',
  mindfulness: 'behavioral',
  nutrition: 'schedule',
  sleep: 'schedule',
};

function formatBaselineNotes(
  baselines: DomainBaselines | null,
  createdAt: string | null,
): Array<{ id: string; content: string; category: string; date: string; source: string; scope: string; expiresAt: null; deletable: false }> {
  if (!baselines) return [];
  const date = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : 'unknown';
  const domains: Domain[] = ['cardio', 'strength', 'mindfulness', 'nutrition', 'sleep'];
  return domains.map(d => ({
    id: `baseline-${d}`,
    content: `${DOMAIN_META[d].label}: ${formatSingleDomainBaseline(d, baselines)}`,
    category: BASELINE_CATEGORIES[d],
    date,
    source: 'onboarding',
    scope: 'permanent',
    expiresAt: null,
    deletable: false as const,
  }));
}

function formatAgeNote(
  age: number | null,
  createdAt: string | null,
): Array<{ id: string; content: string; category: string; date: string; source: string; scope: string; expiresAt: null; deletable: false }> {
  if (!age) return [];
  const date = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : 'unknown';
  return [{
    id: 'profile-age',
    content: `Age ${age}`,
    category: 'physical',
    date,
    source: 'onboarding',
    scope: 'permanent',
    expiresAt: null,
    deletable: false as const,
  }];
}
