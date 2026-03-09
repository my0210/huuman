import { createClient } from '@/lib/supabase/server';
import { getOrCreateConversation, loadMessages, convertToUIMessages } from '@/lib/chat/store';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default async function MainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user!.id;

  const [chatId, profileResult] = await Promise.all([
    getOrCreateConversation(userId, supabase),
    supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single(),
  ]);

  const dbMessages = await loadMessages(chatId, supabase);
  const initialMessages = convertToUIMessages(dbMessages);

  const profile = profileResult.data;

  return (
    <ChatInterface
      chatId={chatId}
      initialMessages={initialMessages}
      userEmail={user!.email ?? ''}
      displayName={profile?.display_name ?? undefined}
      avatarUrl={profile?.avatar_url ?? undefined}
    />
  );
}
