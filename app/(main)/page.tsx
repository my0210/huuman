import { createClient } from '@/lib/supabase/server';
import { getOrCreateConversation, loadMessages, convertToUIMessages } from '@/lib/chat/store';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default async function MainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user!.id;
  const chatId = await getOrCreateConversation(userId, supabase);
  const dbMessages = await loadMessages(chatId, supabase);
  const initialMessages = convertToUIMessages(dbMessages);

  return <ChatInterface chatId={chatId} initialMessages={initialMessages} />;
}
