import { DomainConviction } from '@/lib/types';

export const strengthConviction: DomainConviction = {
  domain: 'strength',

  weeklyGoals: [
    { metric: 'Strength sessions', target: 3, unit: 'sessions' },
  ],

  dailyHabits: [],

  sessionRules: [
    {
      type: 'strength',
      minDuration: 40,
      maxDuration: 75,
      frequencyPerWeek: { min: 2, max: 4 },
      rules: [
        'Prioritize compound movements: squat, deadlift/hinge, bench press, overhead press, row, pull-up',
        'Progressive overload: increase weight by 2.5kg or add 1-2 reps from the previous session',
        'Rest 2-3 minutes between heavy compound sets',
        'Every session must include a warm-up (5-10 min) and cool-down (5 min stretching)',
        '3-5 working sets per exercise, 6-12 rep range for hypertrophy, 3-6 for pure strength',
        'Include at least one lower body and one upper body session per week',
      ],
    },
  ],

  promptRules: [
    'STRENGTH CONVICTION: Pain-free training is the HIGHEST priority. Never program through pain.',
    'Use progressive overload: reference the user\'s last known weights and reps, then suggest slight increases (+2.5kg or +1-2 reps).',
    'Every strength session MUST include warm-up and cool-down.',
    'Focus on compound movements (squat, hinge, press, pull, carry). Isolation work is secondary.',
    'Prescribe 3 strength sessions per week (minimum 2, maximum 4).',
    'Sessions should be 40-75 minutes of actual training time.',
    'If the user reports any pain or injury, immediately modify or remove the affected movement pattern.',
    'Include rest periods in the prescription: 2-3 min for heavy compounds, 60-90s for accessories.',
  ],
};
