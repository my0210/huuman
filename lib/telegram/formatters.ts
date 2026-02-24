import { escapeHtml, type InlineKeyboard } from './api';

const esc = escapeHtml;

const SESSION_DOMAINS = ['cardio', 'strength', 'mindfulness'];

export interface FormattedResponse {
  text: string;
  replyMarkup?: { inline_keyboard: InlineKeyboard };
}

// ─── Tool formatters ─────────────────────────────────────────────────────────

export function formatTodayPlan(data: Record<string, unknown>): FormattedResponse[] {
  const allSessions = data.sessions as Array<Record<string, unknown>>;
  const sessions = (allSessions ?? []).filter(s => SESSION_DOMAINS.includes(s.domain as string));
  const date = data.date as string;

  if (!sessions || sessions.length === 0) {
    return [{ text: 'No sessions planned for today.' }];
  }

  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const messages: FormattedResponse[] = [];

  const completed = sessions.filter((s) => s.status === 'completed');
  const pending = sessions.filter((s) => s.status !== 'completed');

  const headerLines = [`<b>${esc(dayName)}</b> — ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`];
  if (completed.length > 0) {
    for (const s of completed) {
      headerLines.push(`✓ ${domainIcon(s.domain as string)} ${esc(String(s.title))}`);
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
    const brief = sessionBrief(s);
    const text = brief
      ? `${domainIcon(s.domain as string)} <b>${esc(String(s.title))}</b>\n${esc(brief)}`
      : `${domainIcon(s.domain as string)} <b>${esc(String(s.title))}</b>`;
    messages.push({
      text,
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
  const allSessions = data.sessions as Array<Record<string, unknown>>;
  const sessions = (allSessions ?? []).filter(s => SESSION_DOMAINS.includes(s.domain as string));
  const plan = data.plan as Record<string, unknown> | null;
  const briefs = data.trackingBriefs as Record<string, unknown> | null;

  if (sessions.length === 0) {
    return { text: 'No plan this week. Ask me to generate one.' };
  }

  const lines: string[] = [];
  if (plan?.intro_message) {
    lines.push(`<i>${esc(String(plan.intro_message))}</i>`, '');
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
      .map((s) => {
        const done = s.status === 'completed' ? ' ✓' : '';
        return `  ${domainIcon(s.domain as string)} ${esc(String(s.title))}${done}`;
      })
      .join('\n');
    lines.push(`<b>${esc(dayName)}</b>\n${items}`);
  }

  if (briefs) {
    const nut = briefs.nutrition as Record<string, unknown> | undefined;
    const slp = briefs.sleep as Record<string, unknown> | undefined;
    const parts: string[] = [];
    if (nut?.calorieTarget) parts.push(`${nut.calorieTarget} kcal · ${nut.proteinTargetG}g protein`);
    if (slp?.targetHours) parts.push(`${slp.targetHours}h sleep · Bed ${slp.bedtimeWindow}`);
    if (parts.length > 0) {
      lines.push('', '<b>Daily targets</b>');
      for (const p of parts) lines.push(`  ${esc(p)}`);
    }
  }

  return { text: lines.join('\n') };
}

export function formatSession(data: Record<string, unknown>): FormattedResponse {
  const session = data.session as Record<string, unknown>;
  if (!session) return { text: 'Session not found.' };

  const domain = session.domain as string;
  const detail = (typeof session.detail === 'string' ? JSON.parse(session.detail) : session.detail) as Record<string, unknown>;
  const lines = [`${domainIcon(domain)} <b>${esc(String(session.title))}</b>`];

  if (domain === 'cardio') {
    const meta: string[] = [];
    if (detail.zone) meta.push(`Zone ${detail.zone}`);
    if (detail.targetMinutes) meta.push(`${detail.targetMinutes} min`);
    if (detail.targetHR || detail.targetHr) meta.push(String(detail.targetHR ?? detail.targetHr));
    if (meta.length > 0) lines.push(esc(meta.join(' · ')));
    if (detail.warmUp || detail.warm_up) lines.push(`<i>Warm-up:</i> ${esc(String(detail.warmUp ?? detail.warm_up))}`);
    if (detail.coolDown || detail.cool_down) lines.push(`<i>Cool-down:</i> ${esc(String(detail.coolDown ?? detail.cool_down))}`);
    if (detail.notes || detail.pacing) lines.push(esc(String(detail.notes ?? detail.pacing)));
  } else if (domain === 'strength') {
    if (detail.focus) lines.push(`Focus: ${esc(String(detail.focus))}`);
    if (detail.warmUp || detail.warm_up) lines.push(`<i>Warm-up:</i> ${esc(String(detail.warmUp ?? detail.warm_up))}`);
    const exercises = (detail.exercises as Array<Record<string, unknown>>) ?? [];
    for (const ex of exercises) {
      const name = String(ex.name ?? ex.exercise ?? 'Exercise');
      const sets = ex.sets ?? '?';
      const reps = ex.reps ?? '?';
      const weight = ex.weight ?? ex.targetWeight ?? '';
      const restVal = ex.rest ?? (ex.restSeconds ? `${ex.restSeconds}s` : '');
      const parts = [`${sets}×${reps}`];
      if (weight) parts.push(String(weight));
      if (restVal) parts.push(`${restVal} rest`);
      lines.push(`<b>${esc(name)}</b>  ${esc(parts.join(' · '))}`);
      if (ex.cues) lines.push(`  <i>${esc(String(ex.cues))}</i>`);
    }
    if (detail.coolDown || detail.cool_down) lines.push(`<i>Cool-down:</i> ${esc(String(detail.coolDown ?? detail.cool_down))}`);
  } else if (domain === 'mindfulness') {
    const meta: string[] = [];
    if (detail.type) meta.push(String(detail.type));
    if (detail.targetMinutes || detail.duration) meta.push(`${detail.targetMinutes ?? detail.duration} min`);
    if (meta.length > 0) lines.push(esc(meta.join(' · ')));
    if (detail.guidelines || detail.instructions) lines.push(esc(String(detail.guidelines ?? detail.instructions)));
  } else if (domain === 'nutrition') {
    const meta: string[] = [];
    if (detail.calories) meta.push(`${detail.calories} cal`);
    if (detail.proteinGrams || detail.protein) meta.push(`${detail.proteinGrams ?? detail.protein}g protein`);
    if (meta.length > 0) lines.push(esc(meta.join(' · ')));
    if (detail.guidelines) lines.push(esc(String(detail.guidelines)));
    const meals = (detail.mealIdeas as string[]) ?? [];
    if (meals.length > 0) {
      lines.push('');
      lines.push('<b>Meal ideas</b>');
      for (const m of meals) lines.push(`  • ${esc(m)}`);
    }
  } else if (domain === 'sleep') {
    const meta: string[] = [];
    if (detail.targetHours) meta.push(`${detail.targetHours}h`);
    if (detail.bedtimeWindow) meta.push(`Bed: ${detail.bedtimeWindow}`);
    if (detail.wakeWindow) meta.push(`Wake: ${detail.wakeWindow}`);
    if (meta.length > 0) lines.push(esc(meta.join(' · ')));
    if (detail.guidelines) lines.push(esc(String(detail.guidelines)));
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

export function formatCompletion(data: Record<string, unknown>): FormattedResponse[] {
  if (data.error) return [{ text: `Error: ${esc(String(data.error))}` }];

  const session = data.session as Record<string, unknown> | undefined;
  const title = String(session?.title ?? 'Session');
  const domain = session?.domain as string | undefined;

  const note = domain ? COMPLETION_NOTES[domain] ?? '' : '';
  const lines = [`✓ ${domain ? domainIcon(domain) + ' ' : ''}<b>${esc(title)}</b>`];
  if (note) lines.push(note);

  const weekProgress = data.weekProgress as Array<Record<string, unknown>> | undefined;
  if (weekProgress) {
    const done = weekProgress.reduce((s, d) => s + Number(d.completed ?? 0), 0);
    const total = weekProgress.reduce((s, d) => s + Number(d.total ?? 0), 0);
    lines.push(`\n<b>This week:</b> ${done}/${total} complete`);
  }

  const messages: FormattedResponse[] = [{ text: lines.join('\n') }];

  const nextSession = data.nextSession as Record<string, unknown> | undefined;
  if (nextSession) messages.push(nextSessionCard(nextSession));

  return messages;
}

export function formatProgress(data: Record<string, unknown>): FormattedResponse {
  const progress = data.progress as Array<Record<string, unknown>>;
  if (!progress) return { text: 'No progress data.' };

  const lines = ['<b>This week</b>', ''];
  for (const d of progress) {
    const pct = Number(d.completionRate ?? 0);
    const bar = progressBar(pct);
    lines.push(`${domainIcon(d.domain as string)} ${esc(String(d.label))}  ${bar}  ${d.completed}/${d.total}`);
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
  if (data.error) return { text: `Error: ${esc(String(data.error))}` };

  const logged = data.logged as Record<string, unknown> | undefined;
  if (!logged) return { text: '✓ Logged.' };

  const parts: string[] = [];
  if (logged.steps_actual != null) parts.push(`Steps: ${Number(logged.steps_actual).toLocaleString()}`);
  if (logged.nutrition_on_plan != null) parts.push(`Nutrition: ${logged.nutrition_on_plan ? 'on plan' : 'off plan'}`);
  if (logged.sleep_hours != null) parts.push(`Sleep: ${logged.sleep_hours}h`);

  if (parts.length === 0) return { text: '✓ Logged.' };
  return { text: `✓ <b>Logged</b>\n${parts.join(' · ')}` };
}

export function formatTimer(data: Record<string, unknown>): FormattedResponse {
  const mins = data.minutes as number;
  const label = String(data.label ?? 'Timer');
  return { text: `<b>${esc(label)}</b>\nSet a timer for ${mins} minutes and begin when ready.` };
}

export function formatAdapt(data: Record<string, unknown>): FormattedResponse[] {
  if (data.error) return [{ text: `Error: ${esc(String(data.error))}` }];
  const action = data.action as string;
  const session = data.session as Record<string, unknown> | null;
  const domain = session?.domain as string | undefined;
  const icon = domain ? domainIcon(domain) + ' ' : '';
  const title = esc(String(session?.title ?? 'session'));

  let text: string;
  if (action === 'skipped') {
    text = `${icon}<b>${title}</b> — skipped.\nWe'll adjust the week.`;
  } else if (action === 'rescheduled') {
    const newDate = data.newDate as string | undefined;
    const dayLabel = newDate
      ? new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
      : 'later';
    text = `${icon}<b>${title}</b> → ${esc(dayLabel)}.\nSame session, fresh legs.`;
  } else {
    const reason = String(data.reason ?? '');
    text = `${icon}<b>${title}</b> — updated.\n${esc(reason)}`;
  }

  const messages: FormattedResponse[] = [{ text }];

  const nextSession = data.nextSession as Record<string, unknown> | undefined;
  if (nextSession) messages.push(nextSessionCard(nextSession));

  return messages;
}

export function formatPlanGenerated(data: Record<string, unknown>): FormattedResponse {
  if (data.error) return { text: `Plan generation failed: ${esc(String(data.error))}` };
  return {
    text: '✓ <b>Your weekly plan is ready.</b>',
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

function nextSessionCard(session: Record<string, unknown>): FormattedResponse {
  const brief = sessionBrief(session);
  const subtitle = brief ? `\n${esc(brief)}` : '';
  return {
    text: `Next: ${domainIcon(session.domain as string)} <b>${esc(String(session.title))}</b>${subtitle}`,
    replyMarkup: {
      inline_keyboard: [[
        { text: 'Done', callback_data: `act:complete:${session.id}` },
        { text: 'Skip', callback_data: `act:skip:${session.id}` },
        { text: 'Details', callback_data: `act:detail:${session.id}` },
      ]],
    },
  };
}

const COMPLETION_NOTES: Record<string, string> = {
  cardio: 'Aerobic work in the bank.',
  strength: 'Strength work done.',
  mindfulness: 'Good practice.',
};

function sessionBrief(session: Record<string, unknown>): string {
  const domain = session.domain as string;
  let detail: Record<string, unknown> | null = null;
  try {
    detail = (typeof session.detail === 'string' ? JSON.parse(session.detail) : session.detail) as Record<string, unknown> | null;
  } catch { return ''; }
  if (!detail) return '';

  if (domain === 'cardio') {
    const p: string[] = [];
    if (detail.targetMinutes) p.push(`${detail.targetMinutes} min`);
    if (detail.zone) p.push(`Zone ${detail.zone}`);
    if (detail.targetHR || detail.targetHr) p.push(String(detail.targetHR ?? detail.targetHr));
    return p.join(' · ');
  }
  if (domain === 'strength') {
    const p: string[] = [];
    if (detail.focus) p.push(String(detail.focus));
    const exercises = (detail.exercises as Array<Record<string, unknown>>) ?? [];
    if (exercises.length > 0) {
      const names = exercises.slice(0, 3).map(e => String(e.name ?? e.exercise ?? '')).filter(Boolean);
      if (names.length > 0) p.push(names.join(', '));
    }
    return p.join(' · ');
  }
  if (domain === 'mindfulness') {
    const p: string[] = [];
    if (detail.type) p.push(String(detail.type));
    if (detail.targetMinutes || detail.duration) p.push(`${detail.targetMinutes ?? detail.duration} min`);
    return p.join(' · ');
  }
  if (domain === 'nutrition') {
    const p: string[] = [];
    if (detail.calories) p.push(`${detail.calories} cal`);
    if (detail.proteinGrams || detail.protein) p.push(`${detail.proteinGrams ?? detail.protein}g protein`);
    return p.join(' · ');
  }
  if (domain === 'sleep') {
    const p: string[] = [];
    if (detail.targetHours) p.push(`${detail.targetHours}h`);
    if (detail.bedtimeWindow) p.push(`Bed ${detail.bedtimeWindow}`);
    return p.join(' · ');
  }
  return '';
}

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
