import { createClient } from '@/lib/supabase/server';
import { getOrCreateConversation, loadMessages, convertToUIMessages } from '@/lib/chat/store';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default async function MainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user!.id;
  const chatId = await getOrCreateConversation(userId);
  const dbMessages = await loadMessages(chatId);
  // #region agent log
  console.log('[DEBUG-066419] page load:', dbMessages.length, 'msgs, roles:', JSON.stringify(dbMessages.map(m => ({ id: m.id, role: m.role, partsCount: m.parts?.length }))));
  // #endregion
  const initialMessages = convertToUIMessages(dbMessages);

  return <ChatInterface chatId={chatId} initialMessages={initialMessages} />;
}
