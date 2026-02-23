import type { SupabaseClient } from '@supabase/supabase-js';

export type AppSupabaseClient = SupabaseClient;

// =============================================================================
// Domain
// =============================================================================

export type Domain = 'cardio' | 'strength' | 'nutrition' | 'mindfulness' | 'sleep';

export const DOMAINS: Domain[] = ['cardio', 'strength', 'nutrition', 'mindfulness', 'sleep'];

export const DOMAIN_META: Record<Domain, { label: string; icon: string; color: string }> = {
  cardio:      { label: 'Cardio',      icon: 'heart',     color: '#ef4444' },
  strength:    { label: 'Strength',    icon: 'dumbbell',  color: '#f97316' },
  nutrition:   { label: 'Nutrition',   icon: 'leaf',      color: '#22c55e' },
  mindfulness: { label: 'Mindfulness', icon: 'brain',     color: '#06b6d4' },
  sleep:       { label: 'Sleep',       icon: 'moon',      color: '#8b5cf6' },
};

// =============================================================================
// User
// =============================================================================

export interface CardioBaseline {
  activities: string[];
  weeklyMinutes: '0' | 'under_60' | '60_120' | '120_plus';
  canSustain45min: boolean;
}

export type StrengthSetup = 'home' | 'gym';

export type StrengthTrainingType = 'bodyweight' | 'free_weights' | 'machines';

export interface StrengthBaseline {
  trainingTypes: StrengthTrainingType[];
  daysPerWeek: number;
  liftFamiliarity: 'none' | 'some' | 'all';
  setup: StrengthSetup[];
}

export interface NutritionBaseline {
  pattern: 'no_structure' | 'loosely_healthy' | 'track_macros';
  restrictions: string[];
}

export interface SleepBaseline {
  hours: 'under_6' | '6_7' | '7_8' | '8_plus';
  bedtime: 'before_10pm' | '10_11pm' | '11pm_midnight' | 'after_midnight';
  sleepIssues: 'no' | 'sometimes' | 'often';
}

export interface MindfulnessBaseline {
  experience: 'never' | 'tried_few_times' | 'occasional' | 'regular';
}

export interface DomainBaselines {
  cardio: CardioBaseline;
  strength: StrengthBaseline;
  nutrition: NutritionBaseline;
  sleep: SleepBaseline;
  mindfulness: MindfulnessBaseline;
}

export interface UserProfile {
  id: string;
  email: string;
  age?: number;
  weightKg?: number;
  domainBaselines?: DomainBaselines;
  goals: UserGoals;
  constraints: UserConstraints;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserGoals {
  primary: string[];
  freeText?: string;
}

export interface UserConstraints {
  schedule: {
    workHours?: string;
    blockedTimes: BlockedTime[];
    preferredWorkoutTimes: ('morning' | 'lunch' | 'afternoon' | 'evening')[];
  };
  equipment: {
    gymAccess: boolean;
    homeEquipment: string[];
    outdoorAccess: boolean;
  };
  limitations: {
    injuries: string[];
    medical: string[];
  };
}

export interface BlockedTime {
  day: DayOfWeek;
  time: string;
  reason: string;
}

// =============================================================================
// Weekly Plan
// =============================================================================

export type PlanStatus = 'active' | 'completed' | 'archived';

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStart: string; // ISO date (Monday)
  status: PlanStatus;
  introMessage: string;
  sessions: PlannedSession[];
  createdAt: string;
}

// =============================================================================
// Planned Session (discriminated union on domain)
// =============================================================================

export type SessionStatus = 'pending' | 'completed' | 'skipped';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

export interface PlannedSessionBase {
  id: string;
  planId: string;
  domain: Domain;
  dayOfWeek: DayOfWeek;
  scheduledDate: string; // ISO date
  title: string;
  status: SessionStatus;
  sortOrder: number;
  completedAt?: string;
  completedDetail?: Record<string, unknown>;
}

// -- Cardio ------------------------------------------------------------------

export interface CardioSessionDetail {
  zone: 2 | 5;
  targetMinutes: number;
  activityType: 'walk' | 'run' | 'bike' | 'swim' | 'row' | 'elliptical' | 'other';
  targetHrRange?: { min: number; max: number };
  warmUp: string;
  coolDown: string;
  cues: string[];
}

export interface CardioSession extends PlannedSessionBase {
  domain: 'cardio';
  detail: CardioSessionDetail;
}

// -- Strength ----------------------------------------------------------------

export interface Exercise {
  name: string;
  sets: number;
  reps: string; // e.g. "8-12" or "5"
  targetWeight?: string; // e.g. "70kg" or "bodyweight"
  restSeconds: number;
  cues: string[];
}

export interface StrengthSessionDetail {
  focus: 'upper' | 'lower' | 'full' | 'push' | 'pull';
  exercises: Exercise[];
  warmUp: string;
  coolDown: string;
  notes: string;
}

export interface StrengthSession extends PlannedSessionBase {
  domain: 'strength';
  detail: StrengthSessionDetail;
}

// -- Mindfulness -------------------------------------------------------------

export interface MindfulnessSessionDetail {
  type: 'meditation' | 'breathwork' | 'journaling';
  durationMinutes: number;
  guided: boolean;
  instructions: string;
}

export interface MindfulnessSession extends PlannedSessionBase {
  domain: 'mindfulness';
  detail: MindfulnessSessionDetail;
}

// -- Nutrition ---------------------------------------------------------------

export interface NutritionDayDetail {
  calorieTarget?: number;
  proteinTargetG?: number;
  guidelines: string[];
  mealIdeas: string[];
}

export interface NutritionSession extends PlannedSessionBase {
  domain: 'nutrition';
  detail: NutritionDayDetail;
}

// -- Sleep -------------------------------------------------------------------

export interface SleepTargetDetail {
  targetHours: number;
  bedtimeWindow: string; // e.g. "22:00-22:30"
  wakeWindow: string;    // e.g. "06:00-06:30"
  windDownRoutine: string[];
}

export interface SleepSession extends PlannedSessionBase {
  domain: 'sleep';
  detail: SleepTargetDetail;
}

// -- Union -------------------------------------------------------------------

export type PlannedSession =
  | CardioSession
  | StrengthSession
  | MindfulnessSession
  | NutritionSession
  | SleepSession;

// Helper to extract detail type by domain
export type SessionDetailFor<D extends Domain> =
  D extends 'cardio' ? CardioSessionDetail :
  D extends 'strength' ? StrengthSessionDetail :
  D extends 'mindfulness' ? MindfulnessSessionDetail :
  D extends 'nutrition' ? NutritionDayDetail :
  D extends 'sleep' ? SleepTargetDetail :
  never;

// =============================================================================
// Daily Habits (tracked daily, not as sessions)
// =============================================================================

export interface DailyHabitLog {
  id: string;
  userId: string;
  date: string; // ISO date
  stepsActual?: number;
  stepsTarget: number; // default 10000
  nutritionOnPlan?: boolean;
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

// =============================================================================
// Chat / Conversation
// =============================================================================

export interface Conversation {
  id: string;
  userId: string;
  createdAt: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  parts: unknown[];
  attachments: unknown[];
  created_at: string;
}

// =============================================================================
// Conviction types (used by lib/convictions/)
// =============================================================================

export interface WeeklyGoal {
  metric: string;
  target: number;
  unit: string;
}

export interface DailyHabit {
  name: string;
  target: number;
  unit: string;
}

export interface SessionRule {
  type: string;
  minDuration?: number;
  maxDuration?: number;
  frequencyPerWeek: { min: number; max: number };
  rules: string[];
}

export interface DomainConviction {
  domain: Domain;
  weeklyGoals: WeeklyGoal[];
  dailyHabits: DailyHabit[];
  sessionRules: SessionRule[];
  promptRules: string[];
}

// =============================================================================
// Helpers
// =============================================================================

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
