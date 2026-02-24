import { DomainConviction } from '@/lib/types';

export const strengthConviction: DomainConviction = {
  domain: 'strength',

  weeklyGoals: [{ metric: 'Strength sessions', target: 3, unit: 'sessions' }],

  dailyHabits: [],

  sessionRules: [
    {
      type: 'strength',
      minDuration: 30,
      maxDuration: 45,
      frequencyPerWeek: { min: 2, max: 3 },
      rules: [
        'Minimum effective dose: 2–3 sessions/week, 30–45 minutes. Every set earns its place. Leave better than you arrived—not destroyed.',
        'Progressive overload is non-negotiable: increase training stress over time (usually reps first, then load) within clear rep ranges.',
        'Intensity, done right: most work at ~RIR 1–2—hard enough to adapt, clean enough to repeat. No comfort-zone training, no chasing exhaustion.',
        'Safety is the highest priority: technique first, full controlled ROM, respect structure/history/recovery. Avoid high-risk ego lifting—especially as we get older.',
        'Master the core movements: squat, hinge, lunge, push (horizontal + vertical), pull (horizontal + vertical), carry, brace.',
        'Tools are means, not identity: slightly prefer bodyweight, dumbbells, and barbells for efficiency/transfer. Use machines when they\'re the smartest choice for learning, safety, joint friendliness, and targeted growth.',
        'Structure matters at every level: compounds first; appropriate reps and rest (2–4 min on big lifts, ~1 min on accessories). Multi-week blocks prioritize consistency, clarity, and planned recovery.',
        'No junk volume: no random variety that breaks progression, no sets far from productive effort, no chasing soreness, no form that quietly accumulates injury.',
      ],
    },
  ],

  promptRules: [
    'HUUMAN STRENGTH CONVICTION: We train for a long prime—strong, pain-free, and capable—for decades.',
    'Minimum effective dose: default 2–3 strength sessions/week, 30–45 minutes. The user should feel better after training, not wrecked.',
    'Safety is the highest priority: technique first, full controlled ROM, respect the user\'s structure/history/recovery. Never program ego lifting.',
    'Progressive overload is non-negotiable: increase stress over time (usually reps first, then load) within clear rep ranges.',
    'Intensity, done right: target ~RIR 1–2 for most productive sets, with clean reps and stable form. No failure on major compound lifts.',
    'Core movements first: squat, hinge, lunge, horizontal press, vertical press, horizontal pull, vertical pull, carry, brace.',
    'Tools are not identity: prefer bodyweight/DB/barbell when appropriate; use machines when smarter for learning, safety, joint friendliness, or targeted growth.',
    'Program structure: compounds early in the session; include rest guidance—2–4 min for big lifts, ~1 min for accessories (supersets allowed when they don\'t degrade technique/performance).',
    'No junk volume: avoid random variety that breaks progression, sets far from productive effort, soreness chasing, and technique breakdown.',
    "Personalization is the product: adapt to the user's body, equipment, schedule, stress, and constraints—without losing forward progress.",
  ],
};
