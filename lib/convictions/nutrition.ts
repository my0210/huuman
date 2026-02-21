import { DomainConviction } from '@/lib/types';

export const nutritionConviction: DomainConviction = {
  domain: 'nutrition',

  weeklyGoals: [
    { metric: 'Days on-plan', target: 5, unit: 'days' },
  ],

  dailyHabits: [
    { name: 'Nutrition on-plan', target: 1, unit: 'boolean' },
  ],

  sessionRules: [
    {
      type: 'nutrition_day',
      frequencyPerWeek: { min: 7, max: 7 },
      rules: [
        'Calorie restriction is the primary driver of body composition change',
        'Protein minimum: 0.7-1g per pound of bodyweight per day',
        'Prioritize whole, minimally processed foods',
        'Track adherence as days on-plan rather than individual meals',
      ],
    },
  ],

  promptRules: [
    'NUTRITION CONVICTION: Calorie restriction is the primary driver of body composition change.',
    'Prescribe a daily calorie target if the user has provided their weight and goals.',
    'Minimum protein intake: 0.7-1g per pound of bodyweight. Emphasize protein at every meal.',
    'Focus on whole, minimally processed foods. Keep guidance simple and sustainable.',
    'Track nutrition as "days on-plan" (5 days/week target) rather than counting every calorie.',
    'Include 1-2 practical meal ideas per day that hit protein targets.',
    'NOTE: More detailed nutrition convictions will be added in future versions.',
  ],
};
