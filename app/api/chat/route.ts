import { createAgentUIStreamResponse, generateId } from 'ai';
import { createCoachAgent } from '@/lib/ai/agent';
import { createClient } from '@/lib/supabase/server';
import { loadMessages, saveMessages, convertToUIMessages } from '@/lib/chat/store';
import { loadUserProfile } from '@/lib/core/user';

export const maxDuration = 300;

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
      ], supabase);
    }

    const dbMessages = await loadMessages(chatId, supabase);
    const uiMessages = convertToUIMessages(dbMessages);

    const userProfile = await loadUserProfile(userId, supabase);
    const agent = createCoachAgent(userId, userProfile, supabase);

    return createAgentUIStreamResponse({
      agent,
      uiMessages,
      generateMessageId: generateId,
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
            supabase,
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
