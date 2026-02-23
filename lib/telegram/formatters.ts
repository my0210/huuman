import type { InlineKeyboard } from './api';

export interface FormattedResponse {
  text: string;
  replyMarkup?: { inline_keyboard: InlineKeyboard };
}

// ─── Tool formatters ─────────────────────────────────────────────────────────

export function formatTodayPlan(data: Record<string, unknown>): FormattedResponse[] {
  const sessions = data.sessions as Array<Record<string, unknown>>;
  const date = data.date as string;

  if (!sessions || sessions.length === 0) {
    return [{ text: 'No sessions planned for today.' }];
  }

  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const messages: FormattedResponse[] = [];

  const completed = sessions.filter((s) => s.status === 'completed');
  const pending = sessions.filter((s) => s.status !== 'completed');

  const headerLines = [`${dayName} -- ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`];
  if (completed.length > 0) {
    for (const s of completed) {
      headerLines.push(`${domainIcon(s.domain as string)} ${s.title} (done)`);
    }
  }

  const habits = data.habits as Record<string, unknown> | null;
  if (habits?.steps_actual != null) {
    const actual = Number(habits.steps_actual);
    const target = Number(habits.steps_target ?? 10000);
    headerLines.push(`\nSteps: ${actual.toLocaleString()} / ${(target / 1000).toFixed(0)}k`);
  }

  messages.push({ text: headerLines.join('\n') });

  for (const s of pending) {
    messages.push({
      text: `${domainIcon(s.domain as string)} ${s.title}`,
      replyMarkup: {
        inline_keyboard: [[
          { text: 'Done', callback_data: `act:complete:${s.id}` },
          { text: 'Skip', callback_data: `act:skip:${s.id}` },
          { text: 'Details', callback_data: `act:detail:${s.id}` },
        ]],
      },
    });
  }

  return messages;
}

export function formatWeekPlan(data: Record<string, unknown>): FormattedResponse {
  const sessions = data.sessions as Array<Record<string, unknown>>;
  const plan = data.plan as Record<string, unknown> | null;

  if (!sessions || sessions.length === 0) {
    return { text: 'No plan this week. Ask me to generate one.' };
  }

  const lines: string[] = [];
  if (plan?.intro_message) {
    lines.push(String(plan.intro_message), '');
  }

  const byDay: Record<string, Array<Record<string, unknown>>> = {};
  for (const s of sessions) {
    const date = s.scheduled_date as string;
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(s);
  }

  for (const [date, daySessions] of Object.entries(byDay).sort()) {
    const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const items = daySessions
      .map((s) => `${domainIcon(s.domain as string)} ${s.title}${s.status === 'completed' ? ' (done)' : ''}`)
      .join('\n  ');
    lines.push(`${dayName}: \n  ${items}`);
  }

  return { text: lines.join('\n') };
}

export function formatSession(data: Record<string, unknown>): FormattedResponse {
  const session = data.session as Record<string, unknown>;
  if (!session) return { text: 'Session not found.' };

  const domain = session.domain as string;
  const detail = (typeof session.detail === 'string' ? JSON.parse(session.detail) : session.detail) as Record<string, unknown>;
  const lines = [`${domainIcon(domain)} ${session.title}`];

  if (domain === 'cardio') {
    if (detail.zone) lines.push(`Zone ${detail.zone}`);
    if (detail.targetMinutes) lines.push(`Duration: ${detail.targetMinutes} min`);
    if (detail.targetHR || detail.targetHr) lines.push(`HR: ${detail.targetHR ?? detail.targetHr}`);
    if (detail.warmUp || detail.warm_up) lines.push(`Warm-up: ${detail.warmUp ?? detail.warm_up}`);
    if (detail.coolDown || detail.cool_down) lines.push(`Cool-down: ${detail.coolDown ?? detail.cool_down}`);
    if (detail.notes || detail.pacing) lines.push(`${detail.notes ?? detail.pacing}`);
  } else if (domain === 'strength') {
    if (detail.focus) lines.push(`Focus: ${detail.focus}`);
    if (detail.warmUp || detail.warm_up) lines.push(`Warm-up: ${detail.warmUp ?? detail.warm_up}`);
    const exercises = (detail.exercises as Array<Record<string, unknown>>) ?? [];
    for (const ex of exercises) {
      const name = ex.name ?? ex.exercise ?? 'Exercise';
      const sets = ex.sets ?? '?';
      const reps = ex.reps ?? '?';
      const weight = ex.weight ?? ex.targetWeight ?? '';
      const rest = ex.rest ?? ex.restSeconds ? `${ex.rest ?? ex.restSeconds}s rest` : '';
      lines.push(`  ${name}: ${sets}x${reps} ${weight} ${rest}`.trim());
      if (ex.cues) lines.push(`    ${ex.cues}`);
    }
    if (detail.coolDown || detail.cool_down) lines.push(`Cool-down: ${detail.coolDown ?? detail.cool_down}`);
  } else if (domain === 'mindfulness') {
    if (detail.type) lines.push(`Type: ${detail.type}`);
    if (detail.targetMinutes || detail.duration) lines.push(`Duration: ${detail.targetMinutes ?? detail.duration} min`);
    if (detail.guidelines || detail.instructions) lines.push(`${detail.guidelines ?? detail.instructions}`);
  } else if (domain === 'nutrition') {
    if (detail.calories) lines.push(`Calories: ${detail.calories}`);
    if (detail.proteinGrams || detail.protein) lines.push(`Protein: ${detail.proteinGrams ?? detail.protein}g`);
    if (detail.guidelines) lines.push(`${detail.guidelines}`);
    const meals = (detail.mealIdeas as string[]) ?? [];
    if (meals.length > 0) {
      lines.push('Meal ideas:');
      for (const m of meals) lines.push(`  - ${m}`);
    }
  } else if (domain === 'sleep') {
    if (detail.targetHours) lines.push(`Target: ${detail.targetHours}h`);
    if (detail.bedtimeWindow) lines.push(`Bedtime: ${detail.bedtimeWindow}`);
    if (detail.wakeWindow) lines.push(`Wake: ${detail.wakeWindow}`);
    if (detail.guidelines) lines.push(`${detail.guidelines}`);
  }

  const keyboard: InlineKeyboard = [];
  if (session.status !== 'completed') {
    keyboard.push([
      { text: 'Done', callback_data: `act:complete:${session.id}` },
      { text: 'Skip', callback_data: `act:skip:${session.id}` },
    ]);
  }

  return {
    text: lines.join('\n'),
    replyMarkup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  };
}

export function formatCompletion(data: Record<string, unknown>): FormattedResponse {
  if (data.error) return { text: `Error: ${data.error}` };
  const session = data.session as Record<string, unknown> | undefined;
  const title = session?.title ?? 'Session';
  return { text: `Done: ${title}` };
}

export function formatProgress(data: Record<string, unknown>): FormattedResponse {
  const progress = data.progress as Array<Record<string, unknown>>;
  if (!progress) return { text: 'No progress data.' };

  const lines = ['This week:'];
  for (const d of progress) {
    const pct = Number(d.completionRate ?? 0);
    const bar = progressBar(pct);
    lines.push(`${domainIcon(d.domain as string)} ${d.label}: ${bar} ${d.completed}/${d.total}`);
  }

  const steps = data.steps as Array<Record<string, unknown>>;
  if (steps && steps.length > 0) {
    const total = steps.reduce((s, d) => s + Number(d.steps ?? 0), 0);
    const avg = Math.round(total / steps.length);
    lines.push(`\nSteps avg: ${avg.toLocaleString()}/day`);
  }

  return { text: lines.join('\n') };
}

export function formatDailyHabit(data: Record<string, unknown>): FormattedResponse {
  if (data.error) return { text: `Error: ${data.error}` };
  return { text: 'Logged.' };
}

export function formatTimer(data: Record<string, unknown>): FormattedResponse {
  const mins = data.minutes as number;
  const label = data.label as string;
  return { text: `${label}\nSet a timer for ${mins} minutes and begin when ready.` };
}

export function formatAdapt(data: Record<string, unknown>): FormattedResponse {
  if (data.error) return { text: `Error: ${data.error}` };
  const action = data.action as string;
  const session = data.session as Record<string, unknown> | null;
  const reason = data.reason as string;
  const labels: Record<string, string> = { skipped: 'Skipped', rescheduled: 'Rescheduled', modified: 'Updated' };
  return { text: `${labels[action] ?? action}: ${session?.title ?? 'session'}\n${reason}` };
}

export function formatPlanGenerated(data: Record<string, unknown>): FormattedResponse {
  if (data.error) return { text: `Plan generation failed: ${data.error}` };
  return {
    text: 'Your weekly plan is ready!',
    replyMarkup: {
      inline_keyboard: [[{ text: 'Show today', callback_data: 'cmd:today' }]],
    },
  };
}

/**
 * Routes a tool name + output to the appropriate formatter.
 */
export function formatToolOutput(toolName: string, output: Record<string, unknown>): FormattedResponse | FormattedResponse[] | null {
  switch (toolName) {
    case 'show_today_plan': return formatTodayPlan(output);
    case 'show_week_plan': return formatWeekPlan(output);
    case 'show_session': return formatSession(output);
    case 'complete_session': return formatCompletion(output);
    case 'show_progress': return formatProgress(output);
    case 'log_daily': return formatDailyHabit(output);
    case 'start_timer': return formatTimer(output);
    case 'adapt_plan': return formatAdapt(output);
    case 'generate_plan': return formatPlanGenerated(output);
    default: return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function domainIcon(domain: string): string {
  const icons: Record<string, string> = {
    cardio: '❤️',
    strength: '🏋️',
    mindfulness: '🧠',
    nutrition: '🥗',
    sleep: '🌙',
  };
  return icons[domain] ?? '•';
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 20);
  return '█'.repeat(filled) + '░'.repeat(5 - filled);
}
