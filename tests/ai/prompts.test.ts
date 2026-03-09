import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '@/lib/ai/prompts';

describe('getSystemPrompt', () => {
  it('hard-requires using search_youtube instead of mentioning videos in text', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('search_youtube -- find relevant YouTube videos');
    expect(prompt).toContain('ALWAYS call this tool instead of mentioning YouTube channels or video titles in text.');
    expect(prompt).toContain('Never mention YouTube videos, channels, or links in text -- call search_youtube and let the card do the work.');
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
