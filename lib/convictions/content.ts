import { Domain } from '@/lib/types';

export interface DomainContent {
  domain: Domain;
  title: string;
  icon: string;
  color: string;
  philosophy: string;
  keyPrinciples: string[];
  weeklyTargetSummary: string;
}

export const DOMAIN_CONTENT: Record<Domain, DomainContent> = {
  cardio: {
    domain: 'cardio',
    title: 'Cardio',
    icon: 'heart',
    color: '#ef4444',
    philosophy:
      'Your cardio follows a polarized training model backed by longevity research. Most of your effort stays easy -- building your aerobic engine. One session per week pushes your ceiling.',
    keyPrinciples: [
      'Zone 2 (easy, conversational pace) -- 3-4 sessions per week, minimum 45 minutes each',
      'Zone 5 (high-intensity intervals) -- 1 session per week to push VO2 max',
      '80% of your weekly cardio volume is Zone 2, 20% is Zone 5',
      '10,000 daily steps as a baseline to counteract sitting',
    ],
    weeklyTargetSummary: '150+ minutes total cardio per week',
  },

  strength: {
    domain: 'strength',
    title: 'Strength',
    icon: 'dumbbell',
    color: '#f97316',
    philosophy:
      'Strength training is built around compound movements that train real-world movement patterns. Progressive overload drives adaptation. Pain-free training is the highest priority.',
    keyPrinciples: [
      'Compound movements first: squat, hinge, press, pull, carry',
      'Progressive overload: small increases in weight or reps each session',
      'Every session includes warm-up and cool-down',
      'If something hurts, we modify immediately -- no training through pain',
    ],
    weeklyTargetSummary: '3 strength sessions per week (40-75 min each)',
  },

  nutrition: {
    domain: 'nutrition',
    title: 'Nutrition',
    icon: 'leaf',
    color: '#22c55e',
    philosophy:
      'Nutrition is kept simple and sustainable. Calorie management drives body composition. Protein is the priority macronutrient. We track adherence by days on-plan, not individual meals.',
    keyPrinciples: [
      'Protein minimum: 0.7-1g per pound of bodyweight per day',
      'Focus on whole, minimally processed foods',
      'Track as "days on-plan" rather than counting every calorie',
      'Practical meal ideas that hit protein targets',
    ],
    weeklyTargetSummary: '5 days on-plan per week',
  },

  sleep: {
    domain: 'sleep',
    title: 'Sleep',
    icon: 'moon',
    color: '#8b5cf6',
    philosophy:
      'Sleep is foundational to recovery and longevity. Consistency matters more than perfection -- a regular schedule with a proper wind-down routine makes the biggest difference.',
    keyPrinciples: [
      '7-9 hours per night as the target',
      'Consistent bed and wake times (within 30 minutes)',
      'Wind-down routine 30-60 minutes before bed',
      'Optimized environment: cool (18-20°C), dark, quiet',
    ],
    weeklyTargetSummary: '49 hours total sleep (7h average per night)',
  },

  mindfulness: {
    domain: 'mindfulness',
    title: 'Mindfulness',
    icon: 'brain',
    color: '#06b6d4',
    philosophy:
      'Evidence-based mindfulness practices reduce stress and improve focus. The approach varies across meditation, breathwork, and journaling -- short sessions done consistently beat long sessions done rarely.',
    keyPrinciples: [
      'Meditation, breathwork, and journaling rotated across the week',
      'Start with short sessions and build up over time',
      'Breathwork sessions can use the built-in timer',
      'Specific instructions for each session so you know exactly what to do',
    ],
    weeklyTargetSummary: '60 minutes of mindfulness practice per week',
  },
};

export const DOMAIN_ORDER: Domain[] = ['cardio', 'strength', 'mindfulness', 'nutrition', 'sleep'];
