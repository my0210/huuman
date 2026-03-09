import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '@/lib/ai/prompts';

describe('getSystemPrompt', () => {
  it('instructs coach not to repeat video metadata after tool results', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('search_youtube -- find relevant YouTube videos');
    expect(prompt).toContain("don't repeat titles, channels, durations, or view counts");
    expect(prompt).toContain('Use search_youtube when you want to surface an actual video link');
  });

  it('adds explicit language instruction for non-English locales', () => {
    const prompt = getSystemPrompt(undefined, 'es');
    expect(prompt).toContain('The user\'s preferred language is "es". You MUST respond in this language.');
  });

  it('does not add language instruction for English variants', () => {
    const english = getSystemPrompt(undefined, 'en');
    const britishEnglish = getSystemPrompt(undefined, 'en-GB');

    expect(english).not.toContain('The user\'s preferred language is');
    expect(britishEnglish).not.toContain('The user\'s preferred language is');
  });
});
