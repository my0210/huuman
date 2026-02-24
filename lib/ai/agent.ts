import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createTools } from './tools';
import { getSystemPrompt } from './prompts';
import type { UserProfile, AppSupabaseClient } from '@/lib/types';

export function createCoachAgent(userId: string, profile: UserProfile | null, supabase: AppSupabaseClient, language?: string) {
  const tools = createTools(userId, supabase);
  const instructions = getSystemPrompt(profile, language);

  return new ToolLoopAgent({
    id: 'huuman-coach',
    model: anthropic('claude-sonnet-4-6'),
    instructions,
    tools,
    stopWhen: stepCountIs(5),
  });
}
