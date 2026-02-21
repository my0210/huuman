import { Domain, DomainConviction } from '@/lib/types';
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

export function getAllPromptRules(): string {
  return Object.values(ALL_CONVICTIONS)
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
