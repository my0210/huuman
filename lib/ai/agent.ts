import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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
  });
}
