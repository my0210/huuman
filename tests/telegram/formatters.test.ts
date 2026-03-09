import { describe, expect, it } from 'vitest';
import { formatToolOutput, formatYouTubeResults } from '@/lib/telegram/formatters';

describe('formatYouTubeResults', () => {
  it('formats YouTube links with escaped HTML and rendered durations', () => {
    const result = formatYouTubeResults({
      videos: [
        {
          title: 'Squat <Form> Basics',
          channel: 'Coach & Co',
          url: 'https://www.youtube.com/watch?v=abc123&list=PL1',
          duration: 'PT1H2M3S',
        },
        {
          title: '5 minute breathing reset',
          channel: 'Calm Channel',
          url: 'https://www.youtube.com/watch?v=def456',
          duration: 'PT5M',
        },
        {
          title: 'Quick posture drill',
          channel: 'Mobility Lab',
          url: 'https://www.youtube.com/watch?v=ghi789',
          duration: 'PT45S',
        },
      ],
    });

    expect(result.text).toContain('<a href="https://www.youtube.com/watch?v=abc123&amp;list=PL1">Squat &lt;Form&gt; Basics</a> (1:02:03)');
    expect(result.text).toContain('Coach &amp; Co');
    expect(result.text).toContain('(5:00)');
    expect(result.text).toContain('(0:45)');
  });

  it('returns fallback text when no results or error', () => {
    expect(formatYouTubeResults({ videos: [] }).text).toBe('No videos found. Try a different search.');
    expect(formatYouTubeResults({ error: 'boom' }).text).toBe('No videos found. Try a different search.');
  });
});

describe('formatToolOutput', () => {
  it('routes search_youtube output to the YouTube formatter', () => {
    const routed = formatToolOutput('search_youtube', {
      videos: [
        {
          title: 'Zone 2 run form',
          channel: 'Run Science',
          url: 'https://www.youtube.com/watch?v=xyz123',
          duration: 'PT10M',
        },
      ],
    });

    expect(routed).not.toBeNull();
    expect(Array.isArray(routed)).toBe(false);
    const single = routed as { text: string };
    expect(single.text).toContain('Zone 2 run form');
    expect(single.text).toContain('(10:00)');
  });
});
