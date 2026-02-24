import type { Domain, CardioBaseline, StrengthBaseline, NutritionBaseline, SleepBaseline, MindfulnessBaseline } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

export type OptionDef = { value: string; label: string };

export type QuestionDef =
  | { id: string; label: string; kind: 'single_select'; options: OptionDef[] }
  | { id: string; label: string; kind: 'multi_select'; options: OptionDef[]; noneLabel?: string };

export type FieldDef = {
  id: string;
  label: string;
  kind: 'number';
  placeholder: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type OnboardingStep =
  | { type: 'welcome'; title: string; body: string; subtitle: string }
  | { type: 'methodology'; domain: Domain }
  | { type: 'questions'; domain?: Domain; title: string; questions: QuestionDef[] }
  | { type: 'basics'; title: string; subtitle: string; fields: FieldDef[] }
  | { type: 'build' };

export type OnboardingContextData = {
  injuries: string[];
  homeEquipment: string[];
};

export type OnboardingData = {
  cardio: CardioBaseline;
  strength: StrengthBaseline;
  nutrition: NutritionBaseline;
  sleep: SleepBaseline;
  mindfulness: MindfulnessBaseline;
  context: OnboardingContextData;
  age: string;
  weightKg: string;
};

// =============================================================================
// Initial data (defaults)
// =============================================================================

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  cardio: { activities: [], weeklyMinutes: '0', canSustain45min: false },
  strength: { trainingTypes: [], daysPerWeek: 0, liftFamiliarity: 'none', setup: [] },
  nutrition: { pattern: 'no_structure', restrictions: [] },
  sleep: { hours: '7_8', bedtime: '10_11pm', sleepIssues: 'no' },
  mindfulness: { experience: 'never' },
  context: { injuries: [], homeEquipment: [] },
  age: '',
  weightKg: '',
};

// =============================================================================
// Step definitions
// =============================================================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Step 0: Welcome
  {
    type: 'welcome',
    title: 'Welcome to huuman',
    body: 'We build your weekly plan across 5 evidence-based domains: cardio, strength, nutrition, sleep, and mindfulness.',
    subtitle: "First, we'll walk you through each domain -- the approach we follow and why. Then we'll ask where you are today so your plan starts in the right place.",
  },

  // Step 1: Cardio methodology
  { type: 'methodology', domain: 'cardio' },

  // Step 2: Cardio baseline
  {
    type: 'questions',
    domain: 'cardio',
    title: 'Your cardio baseline',
    questions: [
      {
        id: 'cardio.activities',
        label: 'What cardio do you currently do?',
        kind: 'multi_select',
        noneLabel: 'none right now',
        options: [
          { value: 'walking', label: 'walking' },
          { value: 'running', label: 'running' },
          { value: 'cycling', label: 'cycling' },
          { value: 'swimming', label: 'swimming' },
          { value: 'rowing', label: 'rowing' },
        ],
      },
      {
        id: 'cardio.weeklyMinutes',
        label: 'How many minutes of cardio per week?',
        kind: 'single_select',
        options: [
          { value: '0', label: '0 min' },
          { value: 'under_60', label: 'Under 60 min' },
          { value: '60_120', label: '60-120 min' },
          { value: '120_plus', label: '120+ min' },
        ],
      },
      {
        id: 'cardio.canSustain45min',
        label: 'Can you hold a conversation while exercising for 45+ minutes?',
        kind: 'single_select',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'Not yet' },
        ],
      },
    ],
  },

  // Step 3: Strength methodology
  { type: 'methodology', domain: 'strength' },

  // Step 4: Strength baseline
  {
    type: 'questions',
    domain: 'strength',
    title: 'Your strength baseline',
    questions: [
      {
        id: 'strength.trainingTypes',
        label: 'What kind of strength training do you do?',
        kind: 'multi_select',
        noneLabel: 'None',
        options: [
          { value: 'bodyweight', label: 'Bodyweight' },
          { value: 'free_weights', label: 'Free weights' },
          { value: 'machines', label: 'Machines' },
        ],
      },
      {
        id: 'strength.daysPerWeek',
        label: 'How many days per week?',
        kind: 'single_select',
        options: [
          { value: '0', label: '0' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3+' },
        ],
      },
      {
        id: 'strength.liftFamiliarity',
        label: 'Familiar with squat, deadlift, bench press, overhead press?',
        kind: 'single_select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'some', label: 'Some' },
          { value: 'all', label: 'Yes, all' },
        ],
      },
      {
        id: 'strength.setup',
        label: 'Where do you train?',
        kind: 'multi_select',
        noneLabel: 'Neither yet',
        options: [
          { value: 'home', label: 'Home' },
          { value: 'gym', label: 'Gym' },
        ],
      },
    ],
  },

  // Step 5: Nutrition methodology
  { type: 'methodology', domain: 'nutrition' },

  // Step 6: Nutrition baseline
  {
    type: 'questions',
    domain: 'nutrition',
    title: 'Your nutrition baseline',
    questions: [
      {
        id: 'nutrition.pattern',
        label: "What's your current eating pattern?",
        kind: 'single_select',
        options: [
          { value: 'no_structure', label: 'No particular structure' },
          { value: 'loosely_healthy', label: 'Loosely healthy' },
          { value: 'track_macros', label: 'I track macros / have a plan' },
        ],
      },
      {
        id: 'nutrition.restrictions',
        label: 'Any dietary restrictions?',
        kind: 'multi_select',
        noneLabel: 'none',
        options: [
          { value: 'vegetarian', label: 'vegetarian' },
          { value: 'vegan', label: 'vegan' },
          { value: 'dairy-free', label: 'dairy-free' },
          { value: 'gluten-free', label: 'gluten-free' },
        ],
      },
    ],
  },

  // Step 7: Sleep methodology
  { type: 'methodology', domain: 'sleep' },

  // Step 8: Sleep baseline
  {
    type: 'questions',
    domain: 'sleep',
    title: 'Your sleep baseline',
    questions: [
      {
        id: 'sleep.hours',
        label: 'How many hours do you typically sleep?',
        kind: 'single_select',
        options: [
          { value: 'under_6', label: 'Under 6 hours' },
          { value: '6_7', label: '6-7 hours' },
          { value: '7_8', label: '7-8 hours' },
          { value: '8_plus', label: '8+ hours' },
        ],
      },
      {
        id: 'sleep.bedtime',
        label: 'Usual bedtime?',
        kind: 'single_select',
        options: [
          { value: 'before_10pm', label: 'Before 10pm' },
          { value: '10_11pm', label: '10-11pm' },
          { value: '11pm_midnight', label: '11pm-midnight' },
          { value: 'after_midnight', label: 'After midnight' },
        ],
      },
      {
        id: 'sleep.sleepIssues',
        label: 'Trouble falling or staying asleep?',
        kind: 'single_select',
        options: [
          { value: 'no', label: 'No' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'often', label: 'Often' },
        ],
      },
    ],
  },

  // Step 9: Mindfulness methodology
  { type: 'methodology', domain: 'mindfulness' },

  // Step 10: Mindfulness baseline
  {
    type: 'questions',
    domain: 'mindfulness',
    title: 'Your mindfulness baseline',
    questions: [
      {
        id: 'mindfulness.experience',
        label: 'Have you tried meditation, breathwork, or journaling?',
        kind: 'single_select',
        options: [
          { value: 'never', label: 'Never tried any' },
          { value: 'tried_few_times', label: 'Tried a few times' },
          { value: 'occasional', label: 'I practice occasionally' },
          { value: 'regular', label: 'I have a regular practice' },
        ],
      },
    ],
  },

  // Step 11: Context (injuries + home equipment)
  {
    type: 'questions',
    title: 'Good to know',
    questions: [
      {
        id: 'context.injuries',
        label: 'Any current injuries or physical limitations?',
        kind: 'multi_select',
        noneLabel: 'None',
        options: [
          { value: 'shoulder', label: 'Shoulder' },
          { value: 'knee', label: 'Knee' },
          { value: 'lower_back', label: 'Lower back' },
          { value: 'hip', label: 'Hip' },
          { value: 'neck', label: 'Neck' },
          { value: 'wrist_elbow', label: 'Wrist / elbow' },
          { value: 'ankle_foot', label: 'Ankle / foot' },
        ],
      },
      {
        id: 'context.homeEquipment',
        label: 'What equipment do you have at home?',
        kind: 'multi_select',
        noneLabel: 'None',
        options: [
          { value: 'dumbbells', label: 'Dumbbells' },
          { value: 'pull_up_bar', label: 'Pull-up bar' },
          { value: 'resistance_bands', label: 'Resistance bands' },
          { value: 'kettlebell', label: 'Kettlebell' },
          { value: 'barbell_rack', label: 'Barbell + rack' },
          { value: 'bench', label: 'Bench' },
        ],
      },
    ],
  },

  // Step 12: Basics (age + weight)
  {
    type: 'basics',
    title: 'A couple more things',
    subtitle: 'Age is used to calculate your heart rate zones. Weight is used for protein and calorie targets.',
    fields: [
      { id: 'age', label: 'Age', kind: 'number', placeholder: 'e.g. 35', min: 10, max: 120 },
      { id: 'weightKg', label: 'Weight (kg)', kind: 'number', placeholder: 'e.g. 75', min: 20, max: 300, step: 0.5 },
    ],
  },

  // Step 13: Build plan
  { type: 'build' },
];

// =============================================================================
// Data accessors -- get/set values using dotted question IDs like "cardio.activities"
// =============================================================================

export function getQuestionValue(data: OnboardingData, questionId: string): string | string[] | number | boolean {
  const [domain, field] = questionId.split('.') as [keyof OnboardingData, string];
  const domainData = data[domain];
  if (typeof domainData === 'object' && domainData !== null && field in (domainData as object)) {
    return (domainData as unknown as Record<string, string | string[] | number | boolean>)[field];
  }
  return '';
}

export function setQuestionValue(data: OnboardingData, questionId: string, value: unknown): OnboardingData {
  const [domain, field] = questionId.split('.') as [keyof OnboardingData, string];
  const domainData = data[domain];
  if (typeof domainData === 'object' && domainData !== null) {
    return { ...data, [domain]: { ...(domainData as object), [field]: value } };
  }
  return data;
}

export function getFieldValue(data: OnboardingData, fieldId: string): string {
  return (data as Record<string, unknown>)[fieldId] as string ?? '';
}

export function setFieldValue(data: OnboardingData, fieldId: string, value: string): OnboardingData {
  return { ...data, [fieldId]: value };
}
