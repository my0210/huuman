import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createTools } from '@/lib/ai/tools';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user?.id ?? 'dev-user';

  // Fetch user profile for system prompt context
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const systemPrompt = getSystemPrompt(
    profile
      ? {
          id: profile.id,
          email: profile.email,
          age: profile.age,
          weightKg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
          fitnessLevel: profile.fitness_level,
          goals: profile.goals as { primary: string[]; freeText?: string },
          constraints: profile.constraints as {
            schedule: { workHours?: string; blockedTimes: []; preferredWorkoutTimes: [] };
            equipment: { gymAccess: boolean; homeEquipment: string[]; outdoorAccess: boolean };
            limitations: { injuries: string[]; medical: string[] };
          },
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        }
      : null,
  );

  const tools = createTools(userId);

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
