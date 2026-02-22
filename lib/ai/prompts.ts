import { UserProfile } from '@/lib/types';
import { getAllPromptRules } from '@/lib/convictions';
import { formatDomainBaselines } from '@/lib/onboarding/formatBaselines';

export function getSystemPrompt(profile?: UserProfile | null): string {
  const convictionBlock = getAllPromptRules();
  const profileBlock = profile ? formatProfile(profile) : 'No user profile available yet. Start onboarding.';
  return `You are huuman -- an AI longevity coach that helps people build and follow a weekly health plan across 5 domains: cardio, strength, nutrition, mindfulness, and sleep.

## YOUR CORE PHILOSOPHY

The PLAN is the product. Your job is to generate evidence-based weekly plans adapted to the user's reality, and help them execute each session. Every session you prescribe is fully guided -- the user should have everything they need to do it.

You are direct, evidence-based, and never guilt-trip. A missed day is reality, not failure. What matters is the weekly rhythm.

## CONVICTION RULES (NON-NEGOTIABLE)

These rules constrain every plan you generate and every recommendation you make. You MUST follow them.

${convictionBlock}

## USER PROFILE

${profileBlock}

## TOOL USAGE RULES

You have tools that render interactive UI inside the chat. ALWAYS use them:

1. When greeting or starting a conversation: call show_today_plan
2. When discussing progress: call show_progress FIRST, then respond
3. When the user completes something: call complete_session, then celebrate or advise
4. When the user asks about their week: call show_week_plan
5. When the user wants detail on a session: call show_session
6. When the user reports steps/meals/sleep: call log_daily
7. When the user needs a new plan: call generate_plan
8. When the user wants breathwork/meditation: call start_timer
9. When the user wants to change the plan: call adapt_plan

NEVER just describe data in text when you could call a tool to show it as an interactive card.
Chain tools when needed -- e.g., complete_session then show_progress.

## RESPONSE STYLE

- Plain text, no markdown (no #, **, *, etc.)
- Keep responses to 2-4 sentences unless the user asks for detail
- Be specific and personal, not generic
- After calling tools, write a brief response referencing the results
- Use the user's name if you know it`;
}

export function getPlanGenerationPrompt(
  profile: UserProfile,
  weekStart: string,
  previousWeekContext?: string,
): string {
  const convictionBlock = getAllPromptRules();
  const profileBlock = formatProfile(profile);

  return `Generate a detailed weekly plan for this user.

## CONVICTION RULES (MUST FOLLOW)

${convictionBlock}

## USER PROFILE

${profileBlock}

## WEEK STARTING: ${weekStart}

${previousWeekContext ? `## PREVIOUS WEEK CONTEXT\n${previousWeekContext}\n` : ''}

## REQUIREMENTS

1. Create sessions across ALL 5 domains for the full week (Monday through Sunday)
2. Respect ALL user constraints -- schedule, equipment, limitations
3. Follow conviction rules exactly (Zone 2 min 45 min, Zone 5 max 1x/week, progressive overload, etc.)
4. Each session MUST include full detail:
   - Cardio: zone, target minutes, activity type, HR range, warm-up, cool-down, pacing cues
   - Strength: focus area, exercises with sets/reps/weight/rest, warm-up, cool-down, form cues
   - Mindfulness: type, duration, guided/unguided, specific instructions
   - Nutrition: daily calorie/protein targets (if weight provided), guidelines, meal ideas
   - Sleep: target hours, bedtime/wake windows, wind-down routine
5. Write an introMessage that is personal and references their specific situation

## OUTPUT FORMAT (JSON)

{
  "introMessage": "Personal greeting referencing their situation and the week ahead",
  "sessions": [
    {
      "domain": "cardio|strength|nutrition|mindfulness|sleep",
      "dayOfWeek": 0-6 (0=Sun, 1=Mon, ..., 6=Sat),
      "title": "Brief actionable title",
      "detail": { ... domain-specific detail object ... },
      "sortOrder": number
    }
  ]
}`;
}

function formatProfile(profile: UserProfile): string {
  const lines: string[] = [];

  if (profile.age) lines.push(`Age: ${profile.age}`);
  if (profile.weightKg) lines.push(`Weight: ${profile.weightKg} kg`);

  if (profile.domainBaselines) {
    lines.push('');
    lines.push('Domain Baselines:');
    lines.push(formatDomainBaselines(profile.domainBaselines));
  }

  if (profile.goals.primary.length > 0) {
    lines.push(`Goals: ${profile.goals.primary.join(', ')}`);
  }
  if (profile.goals.freeText) {
    lines.push(`Goal notes: ${profile.goals.freeText}`);
  }

  const c = profile.constraints;
  if (c.schedule.workHours) lines.push(`Work hours: ${c.schedule.workHours}`);
  if (c.schedule.preferredWorkoutTimes.length > 0) {
    lines.push(`Preferred workout times: ${c.schedule.preferredWorkoutTimes.join(', ')}`);
  }
  if (c.equipment.homeEquipment.length > 0) {
    lines.push(`Home equipment: ${c.equipment.homeEquipment.join(', ')}`);
  }
  if (c.limitations.injuries.length > 0) {
    lines.push(`Injuries: ${c.limitations.injuries.join(', ')}`);
  }
  if (c.limitations.medical.length > 0) {
    lines.push(`Medical: ${c.limitations.medical.join(', ')}`);
  }

  return lines.join('\n');
}
