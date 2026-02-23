import { ToolLoopAgent, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createTools } from './tools';
import { getSystemPrompt } from './prompts';
import type { UserProfile } from '@/lib/types';

export function createCoachAgent(userId: string, profile: UserProfile | null) {
  const tools = createTools(userId);
  const instructions = getSystemPrompt(profile);

  return new ToolLoopAgent({
    id: 'huuman-coach',
    model: anthropic('claude-sonnet-4-6'),
    instructions,
    tools,
    stopWhen: stepCountIs(5),
  });
}
