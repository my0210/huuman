import { DomainConviction } from '@/lib/types';

export const sleepConviction: DomainConviction = {
  domain: 'sleep',

  weeklyGoals: [
    { metric: 'Sleep hours', target: 49, unit: 'hrs' }, // 7h x 7 nights
    { metric: 'Nights with 7+ hours', target: 7, unit: 'nights' },
  ],

  dailyHabits: [
    { name: 'Sleep logged', target: 1, unit: 'boolean' },
  ],

  sessionRules: [
    {
      type: 'sleep_target',
      frequencyPerWeek: { min: 7, max: 7 },
      rules: [
        'Target 7-9 hours of sleep per night',
        'Maintain consistent bed and wake times (±30 min variance)',
        'Wind-down routine 30-60 min before bed: dim lights, no screens, light reading or stretching',
        'Sleep environment: cool (65-68°F / 18-20°C), dark, quiet',
      ],
    },
  ],

  promptRules: [
    'SLEEP CONVICTION: Sleep is foundational. Prioritize 7-9 hours per night.',
    'Prescribe a consistent bedtime window and wake window for each day.',
    'Include a wind-down routine: 30-60 min before bed with specific steps (dim lights, no screens, light reading/stretching).',
    'Bed/wake times should be consistent across the week (±30 min).',
    'Optimal sleep environment: cool (18-20°C), dark, quiet.',
    'Weekly target: 49 hours total sleep (7h average x 7 nights).',
    'NOTE: More detailed sleep convictions will be added in future versions.',
  ],
};
