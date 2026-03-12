"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage, FileUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { Send, X, Plus, Camera, Loader2, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptics } from "@/lib/haptics";
import { CommandMenu } from "./CommandMenu";
import { createClient } from "@/lib/supabase/client";
import { MessagePart } from "./MessagePart";
import { ChatActionsProvider } from "./ChatActions";
import { getSavedLanguage, type LanguageCode } from "@/lib/languages";
import { t } from "@/lib/translations";
import { compressImage, uploadChatImage } from "@/lib/images";
import { pickPhoto } from "@/lib/camera";
import { ProfileSheet } from "@/components/layout/ProfileSheet";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ScrollToBottom } from "@/components/ui/ScrollToBottom";

interface PendingImage {
  file: File;
  previewUrl: string;
}

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: UIMessage[];
  hasOlderMessages?: boolean;
  userEmail?: string;
  displayName?: string;
  avatarUrl?: string;
}

export function ChatInterface({
  chatId,
  initialMessages,
  hasOlderMessages,
  userEmail,
  displayName,
  avatarUrl,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [hasMore, setHasMore] = useState(hasOlderMessages ?? false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const autoSentRef = useRef(false);

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

  const { messages, sendMessage, setMessages, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onError: () => setError("Something went wrong. Please try again."),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const shouldShowThinking = useMemo(() => {
    if (!isLoading) return false;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role === "user") return true;
    return !lastMsg.parts.some(
      (part) =>
        (part.type === "text" && part.text.trim()) ||
        part.type === "tool-invocation",
    );
  }, [isLoading, messages]);

  useEffect(() => {
    setCurrentLanguage(getSavedLanguage());
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isLoadingOlderRef.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      isLoadingOlderRef.current = false;
      return;
    }

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 100) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const loadOlderMessages = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingOlder) return;

    setLoadingOlder(true);
    const earliest = messages[0] as unknown as {
      createdAt?: string | Date;
    } | undefined;
    const cursor = earliest?.createdAt
      ? new Date(earliest.createdAt).toISOString()
      : undefined;
    if (!cursor) {
      setLoadingOlder(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/chat/messages?chatId=${chatId}&before=${encodeURIComponent(cursor)}&limit=50`,
      );
      if (!res.ok) {
        setLoadingOlder(false);
        return;
      }
      const data = await res.json();
      const older: UIMessage[] = (data.messages ?? []).map(
        (m: Record<string, unknown>) => ({
          ...m,
          createdAt: m.createdAt
            ? new Date(m.createdAt as string)
            : undefined,
        }),
      );

      if (older.length === 0 || !data.hasMore) setHasMore(false);
      if (older.length > 0) {
        isLoadingOlderRef.current = true;
        prevScrollHeightRef.current = el.scrollHeight;
        setMessages((prev) => [...older, ...prev]);
      }
    } catch {
      /* ignore */
    }
    setLoadingOlder(false);
  }, [hasMore, loadingOlder, messages, chatId, setMessages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);

    if (el.scrollTop < 80 && !loadingOlder && !isLoading) {
      loadOlderMessages();
    }
  }, [loadOlderMessages, loadingOlder, isLoading]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (autoSentRef.current || initialMessages.length === 0) return;
    autoSentRef.current = true;

    fetch("/api/chat/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.skip || !data.message) return;
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            createdAt: new Date(data.message.createdAt),
          },
        ]);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNativeCamera = useCallback(async () => {
    setError(null);
    const result = await pickPhoto("prompt");
    if (result) {
      setPendingImages((prev) => [...prev, result]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasImages = pendingImages.length > 0;
    if ((!hasText && !hasImages) || isLoading || uploading) return;

    setError(null);
    haptics.medium();
    let fileParts: FileUIPart[] = [];

    if (hasImages) {
      setUploading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        fileParts = await Promise.all(
          pendingImages.map(async ({ file }) => {
            const compressed = await compressImage(file);
            const url = await uploadChatImage(
              supabase,
              user.id,
              compressed,
              file.name,
            );
            return {
              type: "file" as const,
              mediaType: "image/jpeg",
              url,
              filename: file.name,
            };
          }),
        );
      } catch {
        setError("Failed to upload image. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const text = hasText ? input : "Sent a photo";
    sendMessage(
      fileParts.length > 0 ? { text, files: fileParts } : { text },
    );

    setInput("");
    pendingImages.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setPendingImages([]);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-surface-base">
      <header className="flex-none border-b border-border-subtle px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => {
            haptics.light();
            setProfileOpen(true);
          }}
          className="active:opacity-70 transition-opacity"
        >
          <Avatar
            src={avatarUrl}
            name={displayName || userEmail}
            size="md"
          />
        </button>
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">
          huuman
        </h1>
        <IconButton
          label="Your data"
          size="sm"
          onClick={() => {
            haptics.light();
            router.push("/data");
          }}
        >
          <BarChart3 size={20} />
        </IconButton>
      </header>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        userEmail={userEmail ?? ""}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />

      <ChatActionsProvider sendMessage={(msg) => sendMessage(msg)}>
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4 [-webkit-overflow-scrolling:touch] scrollbar-none"
          >
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2
                  size={16}
                  className="animate-spin text-text-muted"
                />
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                <p className="text-text-secondary text-sm max-w-xs">
                  {t("chat.ready", currentLanguage)}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(
                    [
                      {
                        key: "chat.today" as const,
                        en: "What should I do today?",
                      },
                      {
                        key: "chat.week" as const,
                        en: "Show me my week",
                      },
                      {
                        key: "chat.progress" as const,
                        en: "How am I doing?",
                      },
                    ] as const
                  ).map(({ key, en }) => (
                    <button
                      key={key}
                      onClick={() => {
                        haptics.light();
                        sendMessage({
                          text: t(key, currentLanguage) || en,
                        });
                      }}
                      className="min-h-[44px] rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary active:bg-surface-raised active:scale-[0.97] transition-[background-color,transform] duration-100"
                    >
                      {t(key, currentLanguage)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, i) => {
              const ts = (
                message as unknown as { createdAt?: Date | string }
              ).createdAt;
              const time = ts ? new Date(ts) : null;
              const prevTs =
                i > 0
                  ? (
                      messages[i - 1] as unknown as {
                        createdAt?: Date | string;
                      }
                    ).createdAt
                  : null;
              const prevTime = prevTs ? new Date(prevTs) : null;

              const newDay =
                time &&
                (!prevTime ||
                  time.toDateString() !== prevTime.toDateString());
              const timeGap =
                time &&
                prevTime &&
                !newDay &&
                time.getTime() - prevTime.getTime() > 5 * 60 * 1000;

              return (
                <div key={message.id}>
                  {newDay && time && (
                    <p className="text-center text-xs font-medium text-text-muted py-3">
                      {formatDateLabel(time)}
                    </p>
                  )}
                  {timeGap && time && (
                    <p className="text-center text-xs text-text-muted py-1.5">
                      {formatTime(time)}
                    </p>
                  )}
                  <div
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.role === "user"
                          ? "rounded-radius-lg rounded-br-radius-sm bg-surface-raised px-4 py-2.5"
                          : "space-y-3"
                      }`}
                    >
                      {message.parts.map((part, index) => (
                        <MessagePart
                          key={index}
                          part={part}
                          role={message.role}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {shouldShowThinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-text-muted animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-text-muted animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-text-muted animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          <ScrollToBottom visible={showScrollBtn} onClick={scrollToBottom} />
        </div>
      </ChatActionsProvider>

      <CommandMenu
        open={commandMenuOpen}
        onSelect={(message) => sendMessage({ text: message })}
        onClose={() => setCommandMenuOpen(false)}
      />

      <form
        onSubmit={handleSubmit}
        className="flex-none border-t border-border-subtle px-4 pt-3 pb-2 safe-bottom"
      >
        {error && (
          <div className="mb-2 rounded-radius-md border border-semantic-error/20 bg-semantic-error-muted px-3 py-2 text-xs text-semantic-error">
            {error}
          </div>
        )}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative flex-none">
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="h-16 w-16 rounded-radius-sm object-cover border border-border-default"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  disabled={uploading}
                  className="absolute -top-2 -right-2 flex h-7 w-7 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface-elevated text-text-secondary transition-opacity disabled:opacity-30"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <IconButton
            label={commandMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setCommandMenuOpen(!commandMenuOpen)}
            className={
              commandMenuOpen
                ? "bg-surface-elevated text-text-secondary"
                : ""
            }
          >
            {commandMenuOpen ? <X size={18} /> : <Plus size={20} />}
          </IconButton>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (commandMenuOpen) setCommandMenuOpen(false);
            }}
            onFocus={() => {
              if (commandMenuOpen) setCommandMenuOpen(false);
            }}
            placeholder={
              pendingImages.length > 0
                ? "Add a note..."
                : t("chat.placeholder", currentLanguage)
            }
            className="flex-1 min-h-[44px] rounded-radius-md border border-border-default bg-surface-raised px-4 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none transition-colors"
          />
          <IconButton
            label="Upload image"
            onClick={handleNativeCamera}
            disabled={isLoading || uploading}
          >
            <Camera size={20} />
          </IconButton>
          <IconButton
            label="Send"
            type="submit"
            disabled={
              (!input.trim() && pendingImages.length === 0) ||
              isLoading ||
              uploading
            }
            className="h-11 w-11 flex-none rounded-full bg-white text-black"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </IconButton>
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
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
