import { Domain, DomainConviction, SESSION_DOMAINS, TRACKING_DOMAINS } from '@/lib/types';
import { cardioConviction } from './cardio';
import { strengthConviction } from './strength';
import { nutritionConviction } from './nutrition';
import { mindfulnessConviction } from './mindfulness';
import { sleepConviction } from './sleep';

export const ALL_CONVICTIONS: Record<Domain, DomainConviction> = {
  cardio: cardioConviction,
  strength: strengthConviction,
  nutrition: nutritionConviction,
  mindfulness: mindfulnessConviction,
  sleep: sleepConviction,
};

export function getConviction(domain: Domain): DomainConviction {
  return ALL_CONVICTIONS[domain];
}

/** All 5 domains -- used in the coach system prompt for conversational knowledge */
export function getAllPromptRules(): string {
  return Object.values(ALL_CONVICTIONS)
    .flatMap(c => c.promptRules)
    .join('\n');
}

/** Session domains only -- used during plan generation */
export function getSessionPromptRules(): string {
  return SESSION_DOMAINS
    .map(d => ALL_CONVICTIONS[d])
    .flatMap(c => c.promptRules)
    .join('\n');
}

/** Tracking domains only -- used for weekly brief generation */
export function getTrackingPromptRules(): string {
  return TRACKING_DOMAINS
    .map(d => ALL_CONVICTIONS[d])
    .flatMap(c => c.promptRules)
    .join('\n');
}

export {
  cardioConviction,
  strengthConviction,
  nutritionConviction,
  mindfulnessConviction,
  sleepConviction,
};
