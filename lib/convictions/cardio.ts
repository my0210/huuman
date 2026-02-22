import { DomainConviction } from '@/lib/types';

export const cardioConviction: DomainConviction = {
  domain: 'cardio',

  weeklyGoals: [
    { metric: 'Total cardio volume', target: 150, unit: 'min' },
    { metric: 'Zone 2 volume share', target: 80, unit: '%' },
    { metric: 'Zone 5 sessions', target: 1, unit: 'sessions' },
  ],

  dailyHabits: [
    { name: 'Steps', target: 10000, unit: 'steps' },
  ],

  sessionRules: [
    {
      type: 'zone2',
      minDuration: 45,
      maxDuration: 90,
      frequencyPerWeek: { min: 3, max: 4 },
      rules: [
        'Conversational pace -- user should be able to hold a conversation',
        'Target HR: 60-70% of max HR (approximate with 180 minus age)',
        'Preferred modalities: walk, run, bike, swim, row',
        'Warm-up: 5 min easy pace before settling into zone',
        'Cool-down: 5 min easy pace',
      ],
    },
    {
      type: 'zone5',
      minDuration: 20,
      maxDuration: 30,
      frequencyPerWeek: { min: 1, max: 1 },
      rules: [
        'High-intensity intervals at >90% max HR',
        'Include proper warm-up (10 min) and cool-down (5 min)',
        'Format: 4x4 min at high intensity with 3-4 min recovery, OR 6-8x30s sprints with full recovery',
        'Only prescribe if user has an aerobic base (at least 4 weeks of zone 2)',
        'Skip if user reports poor recovery or fatigue',
      ],
    },
  ],

  promptRules: [
    'CARDIO CONVICTION: Follow a polarized Zone 2 / Zone 5 cardio protocol strictly.',
    'ONLY prescribe Zone 2 and Zone 5 cardio sessions. No Zone 3 or Zone 4.',
    'Zone 2 sessions MUST be at least 45 minutes. Never shorter.',
    'Approximately 80% of total weekly cardio volume must be Zone 2, 20% Zone 5.',
    'Prescribe 3-4 Zone 2 sessions per week and exactly 1 Zone 5 session per week.',
    'Include 10,000 daily steps as a daily habit to counteract sedentary lifestyle. This is separate from training sessions.',
    'Zone 2 HR target: approximately 60-70% of max HR. Use 180-age as a simple approximation for max aerobic HR.',
    'Weekly cardio volume target: 150+ minutes total.',
  ],
};
