import { DomainConviction } from '@/lib/types';

export const mindfulnessConviction: DomainConviction = {
  domain: 'mindfulness',

  weeklyGoals: [
    { metric: 'Mindfulness minutes', target: 60, unit: 'min' },
  ],

  dailyHabits: [],

  sessionRules: [
    {
      type: 'meditation',
      minDuration: 5,
      maxDuration: 30,
      frequencyPerWeek: { min: 3, max: 7 },
      rules: [
        'Guided or unguided meditation',
        'Focus on breath awareness, body scan, or loving-kindness',
        'Start with 5-10 min for beginners, progress to 15-20 min',
      ],
    },
    {
      type: 'breathwork',
      minDuration: 3,
      maxDuration: 15,
      frequencyPerWeek: { min: 0, max: 7 },
      rules: [
        'Box breathing (4-4-4-4), physiological sigh, or 4-7-8 breathing',
        'Can be combined with or replace meditation on a given day',
      ],
    },
    {
      type: 'journaling',
      minDuration: 5,
      maxDuration: 20,
      frequencyPerWeek: { min: 0, max: 3 },
      rules: [
        'Gratitude journaling, reflective writing, or structured prompts',
        'Optional complement to meditation/breathwork',
      ],
    },
  ],

  promptRules: [
    'MINDFULNESS CONVICTION: Prescribe evidence-based mindfulness practices.',
    'Weekly target: 60 minutes of mindfulness practice.',
    'Supported types: meditation, breathwork, journaling. Vary across the week.',
    'Start beginners with short sessions (5-10 min). Progress over weeks.',
    'Provide specific instructions for each session (e.g., "10 min breath-focus meditation: sit comfortably, focus on the breath at the nostrils...").',
    'Breathwork sessions can integrate a timer (the app has a built-in timer).',
    'NOTE: More detailed mindfulness convictions will be added in future versions.',
  ],
};
