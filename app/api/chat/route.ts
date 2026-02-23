import { createAgentUIStreamResponse } from 'ai';
import { createCoachAgent } from '@/lib/ai/agent';
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

    const dbMessages = await loadMessages(chatId);
    const uiMessages = convertToUIMessages(dbMessages);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const userProfile: UserProfile | null = profile
      ? {
          id: profile.id,
          email: profile.email,
          age: profile.age,
          weightKg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
          domainBaselines: profile.domain_baselines as UserProfile['domainBaselines'],
          goals: profile.goals as { primary: string[]; freeText?: string },
          constraints: profile.constraints as UserProfile['constraints'],
          onboardingCompleted: profile.onboarding_completed,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        }
      : null;

    const agent = createCoachAgent(userId, userProfile);

    return createAgentUIStreamResponse({
      agent,
      uiMessages,
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
