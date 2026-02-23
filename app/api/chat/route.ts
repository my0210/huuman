import {
  convertToModelMessages,
  stepCountIs,
  streamText,
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createTools } from '@/lib/ai/tools';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { createClient } from '@/lib/supabase/server';
import { loadMessages, saveMessages, convertToUIMessages } from '@/lib/chat/store';
import type { UserProfile } from '@/lib/types';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { id: chatId, message } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    // Save user message to DB immediately
    if (message?.role === 'user') {
      await saveMessages(chatId, [
        {
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
        },
      ]);
    }

    // Load all messages from DB (includes the just-saved user message)
    const dbMessages = await loadMessages(chatId);
    const uiMessages = convertToUIMessages(dbMessages);

    // Fetch user profile for system prompt
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
            domainBaselines: profile.domain_baselines as UserProfile['domainBaselines'],
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
      messages: await convertToModelMessages(uiMessages),
      tools,
      stopWhen: stepCountIs(5),
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: uiMessages,
      onFinish: async ({ messages: finishedMessages }) => {
        const newMessages = finishedMessages.filter(
          (msg) => !dbMessages.some((db) => db.id === msg.id),
        );

        if (newMessages.length > 0) {
          await saveMessages(
            chatId,
            newMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              parts: msg.parts as unknown[],
            })),
          );
        }
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
