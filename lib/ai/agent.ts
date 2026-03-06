import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic, type AnthropicLanguageModelOptions } from '@ai-sdk/anthropic';
import { createTools } from './tools';
import { getSystemPrompt } from './prompts';
import type { UserProfile, AppSupabaseClient } from '@/lib/types';

export function createCoachAgent(userId: string, profile: UserProfile | null, supabase: AppSupabaseClient, language?: string, conversationId?: string) {
  const tz = profile?.timezone ?? 'UTC';
  const tools = createTools(userId, supabase, conversationId, tz);
  const instructions = getSystemPrompt(profile, language);

  return new ToolLoopAgent({
    id: 'huuman-coach',
    model: anthropic('claude-sonnet-4-6'),
    instructions,
    tools: {
      ...tools,
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 3 }),
    },
    stopWhen: stepCountIs(10),
    providerOptions: {
      anthropic: {
        contextManagement: {
          edits: [
            {
              type: 'clear_tool_uses_20250919',
              trigger: { type: 'input_tokens', value: 80_000 },
              keep: { type: 'tool_uses', value: 5 },
              clearToolInputs: true,
            },
            {
              type: 'compact_20260112',
              trigger: { type: 'input_tokens', value: 120_000 },
              instructions: 'Summarize the coaching conversation. Preserve: recent plan adjustments, session completions/skips this week, ongoing topics, user-reported conditions (pain, fatigue, mood). Drop: old tool outputs, routine check-in exchanges, duplicate information already in the system prompt.',
            },
          ],
        },
      } satisfies AnthropicLanguageModelOptions,
    },
  });
}
