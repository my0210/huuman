import { describe, it, expect } from 'vitest';
import { ONBOARDING_STEPS, INITIAL_ONBOARDING_DATA, getQuestionValue, setQuestionValue, getFieldValue, setFieldValue } from '@/lib/onboarding/steps';
import { DOMAIN_CONTENT, DOMAIN_ORDER } from '@/lib/convictions/content';
import type { Domain } from '@/lib/types';

describe('Onboarding step definitions', () => {
  it('has exactly 14 steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(14);
  });

  it('starts with welcome and ends with build', () => {
    expect(ONBOARDING_STEPS[0].type).toBe('welcome');
    expect(ONBOARDING_STEPS[13].type).toBe('build');
  });

  it('alternates methodology and questions for each domain', () => {
    const domains: Domain[] = ['cardio', 'strength', 'mindfulness', 'nutrition', 'sleep'];
    for (let i = 0; i < domains.length; i++) {
      const methStep = ONBOARDING_STEPS[1 + i * 2];
      const qStep = ONBOARDING_STEPS[2 + i * 2];

      expect(methStep.type).toBe('methodology');
      if (methStep.type === 'methodology') {
        expect(methStep.domain).toBe(domains[i]);
      }

      expect(qStep.type).toBe('questions');
      if (qStep.type === 'questions') {
        expect(qStep.domain).toBe(domains[i]);
        expect(qStep.questions.length).toBeGreaterThan(0);
      }
    }
  });

  it('has a context step at index 11', () => {
    const contextStep = ONBOARDING_STEPS[11];
    expect(contextStep.type).toBe('questions');
    if (contextStep.type === 'questions') {
      expect(contextStep.domain).toBeUndefined();
      expect(contextStep.title).toBe('Good to know');
      const qIds = contextStep.questions.map(q => q.id);
      expect(qIds).toContain('context.injuries');
      expect(qIds).toContain('context.homeEquipment');
    }
  });

  it('has a basics step at index 12', () => {
    const basicsStep = ONBOARDING_STEPS[12];
    expect(basicsStep.type).toBe('basics');
    if (basicsStep.type === 'basics') {
      expect(basicsStep.fields.length).toBe(2);
      const fieldIds = basicsStep.fields.map(f => f.id);
      expect(fieldIds).toContain('age');
      expect(fieldIds).toContain('weightKg');
    }
  });
});

describe('Domain content coverage', () => {
  it('has content for all 5 domains', () => {
    for (const domain of DOMAIN_ORDER) {
      const content = DOMAIN_CONTENT[domain];
      expect(content).toBeDefined();
      expect(content.title).toBeTruthy();
      expect(content.philosophy).toBeTruthy();
      expect(content.keyPrinciples.length).toBeGreaterThan(0);
      expect(content.weeklyTargetSummary).toBeTruthy();
    }
  });

  it('does not mention Attia or any individual name', () => {
    for (const domain of DOMAIN_ORDER) {
      const content = DOMAIN_CONTENT[domain];
      const allText = [content.philosophy, ...content.keyPrinciples, content.weeklyTargetSummary].join(' ');
      expect(allText.toLowerCase()).not.toContain('attia');
      expect(allText.toLowerCase()).not.toContain('peter');
    }
  });
});

describe('Onboarding data accessors', () => {
  it('gets and sets single_select values', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };
    expect(getQuestionValue(data, 'cardio.weeklyMinutes')).toBe('0');

    data = setQuestionValue(data, 'cardio.weeklyMinutes', '120_plus');
    expect(getQuestionValue(data, 'cardio.weeklyMinutes')).toBe('120_plus');
  });

  it('gets and sets multi_select values', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };
    expect(getQuestionValue(data, 'cardio.activities')).toEqual([]);

    data = setQuestionValue(data, 'cardio.activities', ['running', 'cycling']);
    expect(getQuestionValue(data, 'cardio.activities')).toEqual(['running', 'cycling']);
  });

  it('gets and sets boolean values', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };
    expect(getQuestionValue(data, 'cardio.canSustain45min')).toBe(false);

    data = setQuestionValue(data, 'cardio.canSustain45min', true);
    expect(getQuestionValue(data, 'cardio.canSustain45min')).toBe(true);
  });

  it('gets and sets number values', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };
    expect(getQuestionValue(data, 'strength.daysPerWeek')).toBe(0);

    data = setQuestionValue(data, 'strength.daysPerWeek', 3);
    expect(getQuestionValue(data, 'strength.daysPerWeek')).toBe(3);
  });

  it('gets and sets field values (age, weight)', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };
    expect(getFieldValue(data, 'age')).toBe('');

    data = setFieldValue(data, 'age', '35');
    expect(getFieldValue(data, 'age')).toBe('35');

    data = setFieldValue(data, 'weightKg', '80');
    expect(getFieldValue(data, 'weightKg')).toBe('80');
  });
});

describe('Question options validity', () => {
  it('all single_select questions have at least 2 options', () => {
    for (const step of ONBOARDING_STEPS) {
      if (step.type !== 'questions') continue;
      for (const q of step.questions) {
        if (q.kind === 'single_select') {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('all multi_select questions have at least 1 option', () => {
    for (const step of ONBOARDING_STEPS) {
      if (step.type !== 'questions') continue;
      for (const q of step.questions) {
        if (q.kind === 'multi_select') {
          expect(q.options.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('all question IDs are unique', () => {
    const ids: string[] = [];
    for (const step of ONBOARDING_STEPS) {
      if (step.type !== 'questions') continue;
      for (const q of step.questions) {
        ids.push(q.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all question IDs resolve to a valid path in INITIAL_ONBOARDING_DATA', () => {
    for (const step of ONBOARDING_STEPS) {
      if (step.type !== 'questions') continue;
      for (const q of step.questions) {
        const val = getQuestionValue(INITIAL_ONBOARDING_DATA, q.id);
        expect(val).toBeDefined();
      }
    }
  });
});

describe('Full onboarding data flow', () => {
  it('can fill in all questions and produce a complete profile', () => {
    let data = { ...INITIAL_ONBOARDING_DATA };

    data = setQuestionValue(data, 'cardio.activities', ['running', 'cycling']);
    data = setQuestionValue(data, 'cardio.weeklyMinutes', '60_120');
    data = setQuestionValue(data, 'cardio.canSustain45min', true);

    data = setQuestionValue(data, 'strength.trainingTypes', ['free_weights']);
    data = setQuestionValue(data, 'strength.daysPerWeek', 2);
    data = setQuestionValue(data, 'strength.liftFamiliarity', 'some');
    data = setQuestionValue(data, 'strength.setup', ['gym']);

    data = setQuestionValue(data, 'nutrition.pattern', 'loosely_healthy');
    data = setQuestionValue(data, 'nutrition.restrictions', []);

    data = setQuestionValue(data, 'sleep.hours', '7_8');
    data = setQuestionValue(data, 'sleep.bedtime', '10_11pm');
    data = setQuestionValue(data, 'sleep.sleepIssues', 'no');

    data = setQuestionValue(data, 'mindfulness.experience', 'tried_few_times');

    data = setQuestionValue(data, 'context.injuries', ['knee', 'shoulder']);
    data = setQuestionValue(data, 'context.homeEquipment', ['dumbbells', 'resistance_bands']);

    data = setFieldValue(data, 'age', '35');
    data = setFieldValue(data, 'weightKg', '80');

    expect(data.cardio.activities).toEqual(['running', 'cycling']);
    expect(data.cardio.weeklyMinutes).toBe('60_120');
    expect(data.cardio.canSustain45min).toBe(true);
    expect(data.strength.trainingTypes).toEqual(['free_weights']);
    expect(data.strength.daysPerWeek).toBe(2);
    expect(data.strength.setup).toEqual(['gym']);
    expect(data.nutrition.pattern).toBe('loosely_healthy');
    expect(data.sleep.hours).toBe('7_8');
    expect(data.mindfulness.experience).toBe('tried_few_times');
    expect(data.context.injuries).toEqual(['knee', 'shoulder']);
    expect(data.context.homeEquipment).toEqual(['dumbbells', 'resistance_bands']);
    expect(data.age).toBe('35');
    expect(data.weightKg).toBe('80');
  });
});
