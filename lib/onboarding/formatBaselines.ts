import type { DomainBaselines } from '@/lib/types';

const WEEKLY_MINUTES_LABELS: Record<string, string> = {
  '0': '0 min/week',
  under_60: 'under 60 min/week',
  '60_120': '60-120 min/week',
  '120_plus': '120+ min/week',
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  bodyweight: 'bodyweight',
  free_weights: 'free weights',
  machines: 'machines',
};

const LIFT_LABELS: Record<string, string> = {
  none: 'not familiar with barbell lifts',
  some: 'familiar with some barbell lifts',
  all: 'familiar with all main barbell lifts',
};

const PATTERN_LABELS: Record<string, string> = {
  no_structure: 'no structured eating pattern',
  loosely_healthy: 'loosely healthy eating',
  track_macros: 'tracks macros',
};

const HOURS_LABELS: Record<string, string> = {
  under_6: 'under 6 hours',
  '6_7': '6-7 hours',
  '7_8': '7-8 hours',
  '8_plus': '8+ hours',
};

const BEDTIME_LABELS: Record<string, string> = {
  before_10pm: 'before 10pm',
  '10_11pm': '10-11pm',
  '11pm_midnight': '11pm-midnight',
  after_midnight: 'after midnight',
};

const SLEEP_ISSUES_LABELS: Record<string, string> = {
  no: 'no sleep issues',
  sometimes: 'sometimes has trouble sleeping',
  often: 'often has trouble falling or staying asleep',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  never: 'no prior experience',
  tried_few_times: 'tried a few times',
  occasional: 'occasional practice',
  regular: 'regular practice',
};

export function formatDomainBaselines(baselines: DomainBaselines): string {
  const lines: string[] = [];

  const { cardio } = baselines;
  const cardioActivities = cardio.activities.length > 0
    ? cardio.activities.join(', ')
    : 'none currently';
  const cardioSustain = cardio.canSustain45min
    ? 'can sustain 45+ min at conversational pace'
    : 'cannot yet sustain 45 min at conversational pace';
  lines.push(`Cardio: ${WEEKLY_MINUTES_LABELS[cardio.weeklyMinutes] ?? cardio.weeklyMinutes}, ${cardioActivities}, ${cardioSustain}`);

  const { strength } = baselines;
  const strengthDays = strength.daysPerWeek === 0
    ? 'not currently training'
    : `${strength.daysPerWeek} day${strength.daysPerWeek > 1 ? 's' : ''}/week`;
  const setupLabel = strength.setup.length > 0
    ? `trains at ${strength.setup.join(' + ')}`
    : 'no home or gym setup';
  const trainingLabel = strength.trainingTypes.length > 0
    ? strength.trainingTypes.map((t) => TRAINING_TYPE_LABELS[t] ?? t).join(' + ')
    : 'no strength training';
  lines.push(`Strength: ${trainingLabel}, ${strengthDays}, ${LIFT_LABELS[strength.liftFamiliarity] ?? strength.liftFamiliarity}, ${setupLabel}`);

  const { nutrition } = baselines;
  const restrictions = nutrition.restrictions.length > 0
    ? nutrition.restrictions.join(', ')
    : 'no dietary restrictions';
  lines.push(`Nutrition: ${PATTERN_LABELS[nutrition.pattern] ?? nutrition.pattern}, ${restrictions}`);

  const { sleep } = baselines;
  lines.push(`Sleep: ${HOURS_LABELS[sleep.hours] ?? sleep.hours}, bedtime ${BEDTIME_LABELS[sleep.bedtime] ?? sleep.bedtime}, ${SLEEP_ISSUES_LABELS[sleep.sleepIssues] ?? sleep.sleepIssues}`);

  const { mindfulness } = baselines;
  lines.push(`Mindfulness: ${EXPERIENCE_LABELS[mindfulness.experience] ?? mindfulness.experience}`);

  return lines.join('\n');
}
