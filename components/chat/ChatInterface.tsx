"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Settings, X, RotateCcw, Trash2, LogOut, MessageCircle, Copy, Check, Database, Globe, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessagePart } from "./MessagePart";
import { ChatActionsProvider } from "./ChatActions";
import { LANGUAGES, getSavedLanguage, saveLanguage, getLanguageByCode, type LanguageCode } from "@/lib/languages";
import { t } from "@/lib/translations";

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: UIMessage[];
}

export function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "language">("main");
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);
  const [telegramLink, setTelegramLink] = useState<{ code: string; botUrl: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages }) {
          return {
            body: {
              id: chatId,
              message: messages[messages.length - 1],
            },
          };
        },
      }),
    [chatId],
  );

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    setCurrentLanguage(getSavedLanguage());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRedoOnboarding = async () => {
    if (!confirm("Redo onboarding? This clears your profile baselines and sends you back through the flow.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset-onboarding", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding");
        router.refresh();
      } else {
        alert("Reset failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConnectTelegram = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTelegramLink(data);
      } else {
        alert(data.error ?? "Failed to generate link");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    if (telegramLink) {
      navigator.clipboard.writeText(telegramLink.botUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleResetEverything = async () => {
    if (!confirm("Reset everything? This deletes all data (plan, chat, habits, profile) and restarts from scratch.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding");
        router.refresh();
      } else {
        alert("Reset failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">huuman</h1>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </header>

      {/* Settings panel */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setMenuOpen(false); setSettingsView("main"); }} />
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-1">
            {settingsView === "language" ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setSettingsView("main")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <h2 className="text-sm font-semibold text-zinc-100">{t("settings.language", currentLanguage)}</h2>
                </div>
                <div className="max-h-[50dvh] overflow-y-auto -mx-2 scrollbar-none">
                  {LANGUAGES.map((lang) => {
                    const isActive = currentLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setCurrentLanguage(lang.code);
                          saveLanguage(lang.code);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="font-medium truncate">{lang.native}</span>
                          <span className={`text-xs flex-none ${isActive ? "text-blue-100" : "text-zinc-500"}`}>
                            {lang.region}
                          </span>
                        </div>
                        {isActive && <Check size={14} className="flex-none ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-100">{t("settings.title", currentLanguage)}</h2>
                  <button
                    onClick={() => { setMenuOpen(false); setSettingsView("main"); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setSettingsView("language")}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Globe size={16} className="flex-none text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{t("settings.language", currentLanguage)}</p>
                    <p className="text-xs text-zinc-500">{getLanguageByCode(currentLanguage)?.native ?? "English"}</p>
                  </div>
                </button>

                <button
                  onClick={() => { setMenuOpen(false); router.push("/data"); }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <Database size={16} className="flex-none text-zinc-500" />
                  <div>
                    <p className="font-medium">{t("settings.data", currentLanguage)}</p>
                    <p className="text-xs text-zinc-500">{t("settings.dataDesc", currentLanguage)}</p>
                  </div>
                </button>

                <button
                  onClick={handleRedoOnboarding}
                  disabled={busy}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={16} className="flex-none text-zinc-500" />
                  <div>
                    <p className="font-medium">{t("settings.redoOnboarding", currentLanguage)}</p>
                    <p className="text-xs text-zinc-500">{t("settings.redoOnboardingDesc", currentLanguage)}</p>
                  </div>
                </button>

                <button
                  onClick={handleResetEverything}
                  disabled={busy}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={16} className="flex-none text-zinc-500" />
                  <div>
                    <p className="font-medium">{t("settings.reset", currentLanguage)}</p>
                    <p className="text-xs text-zinc-500">{t("settings.resetDesc", currentLanguage)}</p>
                  </div>
                </button>

                <div className="border-t border-zinc-800 mt-2 pt-2">
                  {!telegramLink ? (
                    <button
                      onClick={handleConnectTelegram}
                      disabled={busy}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                      <MessageCircle size={16} className="flex-none text-zinc-500" />
                      <div>
                        <p className="font-medium">{t("settings.connectTelegram", currentLanguage)}</p>
                        <p className="text-xs text-zinc-500">{t("settings.connectTelegramDesc", currentLanguage)}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl px-3 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <MessageCircle size={16} className="flex-none text-cyan-400" />
                        <p className="text-sm font-medium text-zinc-300">{t("settings.connectTelegram", currentLanguage)}</p>
                      </div>
                      <p className="text-xs text-zinc-500 ml-7">
                        Open this link in Telegram to connect:
                      </p>
                      <div className="ml-7 flex items-center gap-2">
                        <a
                          href={telegramLink.botUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 underline truncate flex-1"
                        >
                          {telegramLink.botUrl}
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut size={16} className="flex-none text-zinc-500" />
                    <p className="font-medium">{t("settings.signOut", currentLanguage)}</p>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <ChatActionsProvider sendMessage={(msg) => sendMessage(msg)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
            <p className="text-zinc-400 text-sm max-w-xs">
              {t("chat.ready", currentLanguage)}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {([
                { key: "chat.today" as const, en: "What should I do today?" },
                { key: "chat.week" as const, en: "Show me my week" },
                { key: "chat.progress" as const, en: "How am I doing?" },
              ]).map(({ key, en }) => (
                <button
                  key={key}
                  onClick={() => {
                    sendMessage({ text: t(key, currentLanguage) || en });
                  }}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  {t(key, currentLanguage)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => {
          const ts = (message as unknown as { createdAt?: Date | string }).createdAt;
          const time = ts ? new Date(ts) : null;
          const prevTs = i > 0
            ? (messages[i - 1] as unknown as { createdAt?: Date | string }).createdAt
            : null;
          const prevTime = prevTs ? new Date(prevTs) : null;

          const newDay = time && (!prevTime || time.toDateString() !== prevTime.toDateString());
          const timeGap = time && prevTime && !newDay &&
            time.getTime() - prevTime.getTime() > 5 * 60 * 1000;

          return (
            <div key={message.id}>
              {newDay && time && (
                <p className="text-center text-[11px] font-medium text-zinc-500 py-3">
                  {formatDateLabel(time)}
                </p>
              )}
              {timeGap && time && (
                <p className="text-center text-[10px] text-zinc-600 py-1.5">
                  {formatTime(time)}
                </p>
              )}
              <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "rounded-2xl rounded-br-md bg-zinc-800 px-4 py-2.5"
                      : "space-y-3"
                  }`}
                >
                  {message.parts.map((part, index) => (
                    <MessagePart key={index} part={part} role={message.role} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
      </ChatActionsProvider>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-none border-t border-zinc-800 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder", currentLanguage)}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 disabled:opacity-30 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
