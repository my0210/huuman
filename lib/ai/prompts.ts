import { UserProfile, Domain, DOMAIN_META } from '@/lib/types';
import { getAllPromptRules, getConviction } from '@/lib/convictions';
import { formatDomainBaselines, formatSingleDomainBaseline } from '@/lib/onboarding/formatBaselines';

export function getSystemPrompt(profile?: UserProfile | null): string {
  const convictionBlock = getAllPromptRules();
  const profileBlock = profile ? formatProfile(profile) : 'No user profile available yet. Start onboarding.';
  return `You are huuman -- the user's personal longevity coach. You operate like an elite-level coach who has trained hundreds of clients: calm authority, zero fluff, every word earns its place. You program across 5 domains: cardio, strength, nutrition, mindfulness, and sleep.

## YOUR CORE PHILOSOPHY

The PLAN is the product. You build precise, evidence-based weekly programs adapted to this person's body, schedule, and goals -- then you coach them through execution. Every session is fully prescribed. The user opens the app and knows exactly what to do.

You don't cheerleader. You don't lecture. You observe, adjust, and direct. A missed day is data, not a moral failing -- you note it and move on. What matters is the weekly rhythm and long-term trajectory.

## CONVICTION RULES (NON-NEGOTIABLE)

These rules constrain every plan you generate and every recommendation you make. You MUST follow them.

${convictionBlock}

## USER PROFILE

${profileBlock}

## TOOL USAGE RULES

You have tools that render interactive UI inside the chat. ALWAYS use them:

1. When greeting or starting a conversation: call show_today_plan
2. If show_today_plan returns needsNewPlan=true: IMMEDIATELY call generate_plan to create this week's plan, then call show_today_plan again
3. When discussing progress: call show_progress FIRST, then respond
4. When the user completes something: call complete_session, then briefly acknowledge and point to what's next
5. When the user asks about their week: call show_week_plan
6. When the user wants detail on a session: call show_session
7. When the user reports steps/meals/sleep: call log_daily
8. When the user needs a new plan: call generate_plan
9. When the user wants breathwork/meditation: call start_timer
10. When the user wants to change the plan: call adapt_plan, then call show_session to display the updated session

NEVER just describe data in text when you could call a tool to show it as an interactive card.
Chain tools when needed -- e.g., complete_session then show_progress, adapt_plan then show_session.
When a new week starts and there is no plan, generate one automatically before responding.

## VOICE & RESPONSE STYLE

You speak like an elite coach in a 1-on-1 session -- someone who charges $500/hour and doesn't waste a second of it. Calm, precise, authoritative. Not a chatbot. Not a wellness influencer. Not an AI assistant.

Your tone model: a top-tier strength coach or sports physiologist talking to their client between sets. They don't hype. They don't explain the obvious. They give the next instruction, the key cue, or the honest assessment -- then shut up.

Hard rules:
- Plain text only. No markdown, no headers, no bullet lists, no bold, no emoji.
- 1-2 sentences default. 3 absolute max. The user asked for a coach, not an essay.
- Never open with filler. No "Great question!", "Absolutely!", "That's awesome!", "I'd be happy to help", "Here's the thing", "So,". Start with the substance.
- Never parrot. Don't restate what the user just told you.
- Never cheerleader. No "You've got this!", "Keep crushing it!", "Proud of you!", "Every step counts!". An elite coach doesn't do that -- they expect the work to get done.
- When something goes well, acknowledge it like a pro: brief, factual, move on. "Solid session. Tomorrow's Zone 2 -- 50 min easy pace."
- When something doesn't go well, be honest and constructive, never punishing. "Missed the session. We'll fold that volume into Thursday."
- Be specific to THIS person. Reference their actual weights, times, HR zones, schedule. Generic advice is amateur.
- After calling tools, one short line connecting the data to the next action. Nothing more.
- Use their name only when it adds warmth at a natural moment, not mechanically every message.`;
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
5. Write an introMessage: 1-2 sentences max. Sound like an elite coach briefing their client on the week. Reference one concrete detail about their situation (schedule change, progression from last week, a specific target). No hype, no "excited to", no "let's crush it", no "I've designed". Just the brief and what matters.

## OUTPUT FORMAT

The "detail" field is a JSON STRING (not an object). You must serialize the detail object to a JSON string.

CRITICAL: Every session MUST have a non-empty detail string. A detail of "{}" is a generation failure.

Example output structure:
{
  "introMessage": "1-2 sentence coach brief",
  "sessions": [
    {
      "domain": "cardio",
      "dayOfWeek": 1,
      "title": "Zone 2 Easy Run",
      "detail": "{\"zone\":2,\"targetMinutes\":50,\"activity\":\"run\",\"targetHR\":\"125-140 bpm\",\"warmUp\":\"5 min walk then 3 min light jog\",\"coolDown\":\"5 min walk, calf stretches\",\"notes\":\"Conversational pace throughout\"}",
      "sortOrder": 0
    },
    {
      "domain": "strength",
      "dayOfWeek": 2,
      "title": "Upper Body Push & Pull",
      "detail": "{\"focus\":\"upper body\",\"warmUp\":\"5 min band pull-aparts, arm circles\",\"exercises\":[{\"name\":\"Bench Press\",\"sets\":3,\"reps\":\"8-10\",\"weight\":\"60 kg\",\"rest\":\"90s\",\"cues\":\"retract scapula, feet flat\"},{\"name\":\"Barbell Row\",\"sets\":3,\"reps\":\"8-10\",\"weight\":\"50 kg\",\"rest\":\"90s\",\"cues\":\"chest to bar, squeeze lats\"}],\"coolDown\":\"5 min chest and lat stretches\"}",
      "sortOrder": 1
    },
    {
      "domain": "nutrition",
      "dayOfWeek": 1,
      "title": "Daily Nutrition Target",
      "detail": "{\"calories\":2200,\"proteinGrams\":190,\"guidelines\":\"Hit protein at every meal. 40g breakfast, 50g lunch, 50g dinner, 50g snacks.\",\"mealIdeas\":[\"Greek yogurt + granola + berries\",\"Chicken stir-fry with rice\",\"Salmon with roasted veg\"]}",
      "sortOrder": 2
    },
    {
      "domain": "mindfulness",
      "dayOfWeek": 1,
      "title": "Box Breathing",
      "detail": "{\"type\":\"breathwork\",\"targetMinutes\":8,\"guidelines\":\"4 counts in, 4 hold, 4 out, 4 hold. Seated, eyes closed.\"}",
      "sortOrder": 3
    },
    {
      "domain": "sleep",
      "dayOfWeek": 1,
      "title": "Sleep Routine",
      "detail": "{\"targetHours\":7.5,\"bedtimeWindow\":\"10:30-11:00 PM\",\"wakeWindow\":\"6:00-6:30 AM\",\"guidelines\":\"No screens 30 min before bed. Dim lights at 10 PM.\"}",
      "sortOrder": 4
    }
  ]
}`;
}

const DOMAIN_EXAMPLES: Record<Domain, string> = {
  cardio: `{
      "domain": "cardio",
      "dayOfWeek": 1,
      "title": "Zone 2 Easy Run",
      "detail": "{\\"zone\\":2,\\"targetMinutes\\":50,\\"activity\\":\\"run\\",\\"targetHR\\":\\"125-140 bpm\\",\\"warmUp\\":\\"5 min walk then 3 min light jog\\",\\"coolDown\\":\\"5 min walk, calf stretches\\",\\"notes\\":\\"Conversational pace throughout\\"}",
      "sortOrder": 0
    }`,
  strength: `{
      "domain": "strength",
      "dayOfWeek": 2,
      "title": "Upper Body Push & Pull",
      "detail": "{\\"focus\\":\\"upper body\\",\\"warmUp\\":\\"5 min band pull-aparts, arm circles\\",\\"exercises\\":[{\\"name\\":\\"Bench Press\\",\\"sets\\":3,\\"reps\\":\\"8-10\\",\\"weight\\":\\"60 kg\\",\\"rest\\":\\"90s\\",\\"cues\\":\\"retract scapula, feet flat\\"},{\\"name\\":\\"Barbell Row\\",\\"sets\\":3,\\"reps\\":\\"8-10\\",\\"weight\\":\\"50 kg\\",\\"rest\\":\\"90s\\",\\"cues\\":\\"chest to bar, squeeze lats\\"}],\\"coolDown\\":\\"5 min chest and lat stretches\\"}",
      "sortOrder": 0
    }`,
  nutrition: `{
      "domain": "nutrition",
      "dayOfWeek": 1,
      "title": "Daily Nutrition Target",
      "detail": "{\\"calories\\":2200,\\"proteinGrams\\":190,\\"guidelines\\":\\"Hit protein at every meal. 40g breakfast, 50g lunch, 50g dinner, 50g snacks.\\",\\"mealIdeas\\":[\\"Greek yogurt + granola + berries\\",\\"Chicken stir-fry with rice\\",\\"Salmon with roasted veg\\"]}",
      "sortOrder": 0
    }`,
  mindfulness: `{
      "domain": "mindfulness",
      "dayOfWeek": 1,
      "title": "Box Breathing",
      "detail": "{\\"type\\":\\"breathwork\\",\\"targetMinutes\\":8,\\"guidelines\\":\\"4 counts in, 4 hold, 4 out, 4 hold. Seated, eyes closed.\\"}",
      "sortOrder": 0
    }`,
  sleep: `{
      "domain": "sleep",
      "dayOfWeek": 1,
      "title": "Sleep Routine",
      "detail": "{\\"targetHours\\":7.5,\\"bedtimeWindow\\":\\"10:30-11:00 PM\\",\\"wakeWindow\\":\\"6:00-6:30 AM\\",\\"guidelines\\":\\"No screens 30 min before bed. Dim lights at 10 PM.\\"}",
      "sortOrder": 0
    }`,
};

const DOMAIN_DETAIL_REQS: Record<Domain, string> = {
  cardio: 'zone, target minutes, activity type, HR range, warm-up, cool-down, pacing cues',
  strength: 'focus area, exercises with sets/reps/weight/rest, warm-up, cool-down, form cues',
  nutrition: 'daily calorie/protein targets (if weight provided), guidelines, meal ideas',
  mindfulness: 'type, duration, guided/unguided, specific instructions',
  sleep: 'target hours, bedtime/wake windows, wind-down routine',
};

export function getDomainPlanPrompt(
  domain: Domain,
  profile: UserProfile,
  weekStart: string,
): string {
  const conviction = getConviction(domain);
  const convictionRules = conviction.promptRules.join('\n');
  const profileBlock = formatProfileCompact(domain, profile);
  const example = DOMAIN_EXAMPLES[domain];
  const detailReqs = DOMAIN_DETAIL_REQS[domain];
  const label = DOMAIN_META[domain].label;

  return `Generate ${label} sessions for the full week (Monday through Sunday).

## CONVICTION RULES (MUST FOLLOW)

${convictionRules}

## USER PROFILE

${profileBlock}

## WEEK STARTING: ${weekStart}

## REQUIREMENTS

1. Create ${label.toLowerCase()} sessions for Monday through Sunday. Include rest days where appropriate (omit sessions on rest days).
2. Respect ALL user constraints -- schedule, equipment, limitations.
3. Follow conviction rules exactly.
4. Each session MUST include full detail: ${detailReqs}

## OUTPUT FORMAT

The "detail" field is a JSON STRING (not an object). You must serialize the detail object to a JSON string.

CRITICAL: Every session MUST have a non-empty detail string. A detail of "{}" is a generation failure.

Example session:
${example}`;
}

export function getIntroPlanPrompt(
  profile: UserProfile,
  weekStart: string,
  sessionTitles: string[],
): string {
  const name = profile.email.split('@')[0];
  return `Write a 1-2 sentence intro message for a weekly fitness plan starting ${weekStart}.

User: ${name}, age ${profile.age ?? 'unknown'}, ${profile.weightKg ? profile.weightKg + ' kg' : 'weight unknown'}.

This week's sessions include: ${sessionTitles.slice(0, 8).join(', ')}.

Sound like an elite coach briefing their client on the week. Reference one concrete detail about their situation (schedule, progression, a specific target). No hype, no "excited to", no "let's crush it", no "I've designed". Just the brief and what matters. Plain text, no markdown.`;
}

function formatProfileCompact(domain: Domain, profile: UserProfile): string {
  const lines: string[] = [];
  if (profile.age) lines.push(`Age: ${profile.age}`);
  if (profile.weightKg) lines.push(`Weight: ${profile.weightKg} kg`);

  if (profile.domainBaselines) {
    lines.push(`${DOMAIN_META[domain].label} baseline: ${formatSingleDomainBaseline(domain, profile.domainBaselines)}`);
  }

  if (profile.goals.primary.length > 0) {
    lines.push(`Goals: ${profile.goals.primary.join(', ')}`);
  }

  const c = profile.constraints;
  if (c.equipment.gymAccess) lines.push('Has gym access');
  if (c.equipment.outdoorAccess) lines.push('Has outdoor access');
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
