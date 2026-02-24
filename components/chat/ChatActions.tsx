"use client";

import { createContext, useContext, type ReactNode } from "react";

type SendFn = (msg: { text: string }) => void;

const ChatActionsContext = createContext<SendFn | null>(null);

export function ChatActionsProvider({
  sendMessage,
  children,
}: {
  sendMessage: SendFn;
  children: ReactNode;
}) {
  return (
    <ChatActionsContext.Provider value={sendMessage}>
      {children}
    </ChatActionsContext.Provider>
  );
}

export function useChatSend(): SendFn | null {
  return useContext(ChatActionsContext);
}
