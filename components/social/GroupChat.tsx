"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { motion } from "framer-motion";
import { Send, Camera, Mic, Loader2, Square, X } from "lucide-react";
import { press } from "@/lib/motion";
import { IconButton } from "@/components/ui/IconButton";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images";
import { normalizeMessage } from "@/lib/social/normalize";
import type { SocialMessage } from "@/lib/types";
import TextMessage from "./TextMessage";
import VoiceMessage from "./VoiceMessage";
import PhotoMessage from "./PhotoMessage";
import SessionCardMessage from "./SessionCardMessage";
import SleepCardMessage from "./SleepCardMessage";
import MealCardMessage from "./MealCardMessage";
import CommitmentCardMessage from "./CommitmentCardMessage";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLabel(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[11px] font-medium text-text-muted">{formatDateLabel(date)}</span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
  onOnlineCountChange?: (count: number) => void;
}

const SOCIAL_PHOTOS_BUCKET = "social-photos";
const VOICE_NOTES_BUCKET = "voice-notes";

export default function GroupChat({ groupId, currentUserId, onOnlineCountChange }: GroupChatProps) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<SocialMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const atBottomRef = useRef(true);

  const FIRST_INDEX = 100_000;
  const [firstItemIndex, setFirstItemIndex] = useState(FIRST_INDEX);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>(0 as unknown as ReturnType<typeof setInterval>);
  const supabaseRef = useRef(createClient());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const pendingReadsRef = useRef(new Set<string>());
  const readFlushTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ---- Load messages ----
  const fetchMessages = useCallback(async (before?: string) => {
    const url = `/api/groups/${groupId}/messages?limit=30${before ? `&before=${before}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.messages ?? []) as Record<string, unknown>[]).map(normalizeMessage);
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const msgs = await fetchMessages();
      if (cancelled) return;
      setMessages(msgs.reverse());
      setHasMore(msgs.length >= 30);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchMessages]);

  // ---- Mark as read ----
  const markRead = useCallback(() => {
    fetch(`/api/groups/${groupId}/read`, { method: "POST" }).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (!loading && messages.length > 0) markRead();
  }, [loading, messages.length, markRead]);

  // ---- Read receipt batching ----
  const flushReads = useCallback(() => {
    const ids = Array.from(pendingReadsRef.current);
    if (ids.length === 0) return;
    pendingReadsRef.current.clear();
    fetch(`/api/groups/${groupId}/read-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: ids }),
    }).catch(() => {});
  }, [groupId]);

  const scheduleFlushReads = useCallback(() => {
    if (readFlushTimerRef.current) return;
    readFlushTimerRef.current = setTimeout(() => {
      readFlushTimerRef.current = null;
      flushReads();
    }, 1500);
  }, [flushReads]);

  useEffect(() => {
    return () => {
      if (readFlushTimerRef.current) clearTimeout(readFlushTimerRef.current);
      flushReads();
    };
  }, [flushReads]);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ---- Realtime subscription ----
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`group:${groupId}`)
      .on("broadcast", { event: "new_message" }, (payload) => {
        const raw = payload.payload as Record<string, unknown>;
        const msg = normalizeMessage(raw);
        if (msg.userId === currentUserId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!atBottomRef.current) {
          setNewMessageCount((c) => c + 1);
        }
        markRead();
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const uid = (payload.payload as { userId: string }).userId;
        if (uid === currentUserId) return;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(uid, new Date().toISOString());
          return next;
        });
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const uid = (payload.payload as { userId: string }).userId;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
      })
      .on("broadcast", { event: "delete_message" }, (payload) => {
        const { messageId } = payload.payload as { messageId: string };
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        const { messageId, emoji, added, userId } = payload.payload as {
          messageId: string;
          emoji: string;
          added: boolean;
          userId: string;
        };
        if (userId === currentUserId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = [...(m.reactions ?? [])];
            const idx = reactions.findIndex((r) => r.emoji === emoji);
            if (added) {
              if (idx >= 0) {
                reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
              } else {
                reactions.push({ emoji, count: 1, reacted: false });
              }
            } else if (idx >= 0) {
              const newCount = reactions[idx].count - 1;
              if (newCount <= 0) reactions.splice(idx, 1);
              else reactions[idx] = { ...reactions[idx], count: newCount };
            }
            return { ...m, reactions };
          }),
        );
      })
      .on("broadcast", { event: "messages_read" }, (payload) => {
        const { messageIds: readIds, userId: readerId } = payload.payload as { messageIds: string[]; userId: string };
        if (readerId === currentUserId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.userId !== currentUserId) return m;
            if (!readIds.includes(m.id)) return m;
            return { ...m, readCount: (m.readCount ?? 0) + 1 };
          }),
        );
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string }>();
        const online = new Set<string>();
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            online.add(presence.userId);
          }
        }
        setOnlineUsers(online);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ userId: currentUserId });
          fetchMessages().then((msgs) => {
            if (msgs.length > 0) {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newMsgs = msgs.reverse().filter((m) => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs];
              });
            }
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [groupId, currentUserId, markRead, fetchMessages]);

  useEffect(() => {
    onOnlineCountChange?.(onlineUsers.size);
  }, [onlineUsers.size, onOnlineCountChange]);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const emitTyping = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;
    channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.send({ type: "broadcast", event: "stop_typing", payload: { userId: currentUserId } }).catch(() => {});
    }, 3000);
  }, [groupId, currentUserId]);

  useEffect(() => {
    if (typingUsers.size === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next = new Map(prev);
        for (const [uid, ts] of next) {
          if (now - new Date(ts).getTime() > 5000) next.delete(uid);
        }
        return next.size === prev.size ? prev : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [typingUsers.size]);

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const oldest = messages[0]?.createdAt;
    const older = await fetchMessages(oldest);
    if (older.length < 30) setHasMore(false);
    if (older.length > 0) {
      const reversed = older.reverse();
      setFirstItemIndex((prev) => prev - reversed.length);
      setMessages((prev) => [...reversed, ...prev]);
    }
    setLoadingOlder(false);
  }, [hasMore, loadingOlder, messages, fetchMessages]);

  // ---- Send text message ----
  const sendText = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: SocialMessage = {
      id: tempId,
      groupId,
      userId: currentUserId,
      messageType: "text",
      content: text,
      replyToId: replyTo?.id,
      createdAt: new Date().toISOString(),
      sender: { displayName: "You" },
      reactions: [],
    };

    setInput("");
    setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "text", content: text, replyToId: replyTo?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = normalizeMessage(data.message as Record<string, unknown>);
        msg.sender = { displayName: "You" };
        setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ---- Photo upload ----
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const tempId = `temp-${Date.now()}`;
    setSending(true);
    try {
      const supabase = supabaseRef.current;
      const compressed = await compressImage(file);
      const path = `${currentUserId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error } = await supabase.storage
        .from(SOCIAL_PHOTOS_BUCKET)
        .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(SOCIAL_PHOTOS_BUCKET).getPublicUrl(path);

      const optimisticMsg: SocialMessage = {
        id: tempId,
        groupId,
        userId: currentUserId,
        messageType: "photo",
        mediaUrl: urlData.publicUrl,
        createdAt: new Date().toISOString(),
        sender: { displayName: "You" },
        reactions: [],
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "photo", mediaUrl: urlData.publicUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = normalizeMessage(data.message as Record<string, unknown>);
        msg.sender = { displayName: "You" };
        setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [groupId, currentUserId, sending]);

  // ---- Voice recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationMs = recordingDuration * 1000;
        setRecording(false);
        setRecordingDuration(0);

        if (blob.size < 1000) return;

        const tempId = `temp-${Date.now()}`;
        setSending(true);
        try {
          const supabase = supabaseRef.current;
          const path = `${currentUserId}/${Date.now()}.webm`;

          const { error } = await supabase.storage
            .from(VOICE_NOTES_BUCKET)
            .upload(path, blob, { contentType: "audio/webm", upsert: false });
          if (error) throw error;

          const { data: urlData } = supabase.storage.from(VOICE_NOTES_BUCKET).getPublicUrl(path);

          const optimisticMsg: SocialMessage = {
            id: tempId,
            groupId,
            userId: currentUserId,
            messageType: "voice",
            mediaUrl: urlData.publicUrl,
            mediaDurationMs: durationMs,
            createdAt: new Date().toISOString(),
            sender: { displayName: "You" },
            reactions: [],
          };
          setMessages((prev) => [...prev, optimisticMsg]);

          const res = await fetch(`/api/groups/${groupId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageType: "voice",
              mediaUrl: urlData.publicUrl,
              mediaDurationMs: durationMs,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const msg = normalizeMessage(data.message as Record<string, unknown>);
            msg.sender = { displayName: "You" };
            setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m));
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        } catch {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Microphone access denied or not available
    }
  }, [groupId, currentUserId, recordingDuration]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [groupId]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  // ---- React to message ----
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (!res.ok) return;
    const { added } = await res.json();

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions ?? [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (added) {
          if (idx >= 0) {
            reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, reacted: true };
          } else {
            reactions.push({ emoji, count: 1, reacted: true });
          }
        } else {
          if (idx >= 0) {
            const newCount = reactions[idx].count - 1;
            if (newCount <= 0) {
              reactions.splice(idx, 1);
            } else {
              reactions[idx] = { ...reactions[idx], count: newCount, reacted: false };
            }
          }
        }
        return { ...m, reactions };
      }),
    );
    try {
      const channel = channelRef.current;
      if (channel) {
        await channel.send({
          type: "broadcast",
          event: "reaction",
          payload: { messageId, emoji, added, userId: currentUserId },
        });
      }
    } catch {}
  }, [currentUserId]);

  const findReplyContent = useCallback((replyToId?: string) => {
    if (!replyToId) return undefined;
    const found = messages.find((m) => m.id === replyToId);
    if (!found) return undefined;
    return { sender: found.sender?.displayName, content: found.content || found.messageType };
  }, [messages]);

  const scrollToMessage = useCallback((messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      virtuosoRef.current?.scrollToIndex({ index: idx, behavior: "smooth", align: "center" });
    }
  }, [messages]);

  const renderMessage = (msg: SocialMessage, first: boolean, last: boolean) => {
    const isOwn = msg.userId === currentUserId;
    const onReact = (emoji: string) => handleReact(msg.id, emoji);
    const readCount = msg.readCount ?? 0;
    const replyContent = findReplyContent(msg.replyToId);
    const actionProps = {
      onReact,
      onReply: () => setReplyTo(msg),
      onDelete: isOwn ? () => handleDelete(msg.id) : undefined,
      onCopy: msg.content ? () => handleCopy(msg.content!) : undefined,
      readCount,
      replyContent,
      onReplyTap: msg.replyToId ? () => scrollToMessage(msg.replyToId!) : undefined,
      activeActionId,
      onActionOpen: setActiveActionId,
    };

    switch (msg.messageType) {
      case "text":
        return <TextMessage message={msg} isOwn={isOwn} isFirstInGroup={first} isLastInGroup={last} {...actionProps} />;
      case "voice":
        return <VoiceMessage message={msg} isOwn={isOwn} isFirstInGroup={first} isLastInGroup={last} {...actionProps} onCopy={undefined} />;
      case "photo":
        return <PhotoMessage message={msg} isOwn={isOwn} isFirstInGroup={first} isLastInGroup={last} {...actionProps} />;
      case "session_card":
        return <SessionCardMessage message={msg} {...actionProps} isOwn={isOwn} onCopy={undefined} />;
      case "sleep_card":
        return <SleepCardMessage message={msg} {...actionProps} isOwn={isOwn} onCopy={undefined} />;
      case "meal_card":
        return <MealCardMessage message={msg} {...actionProps} isOwn={isOwn} onCopy={undefined} />;
      case "commitment_card":
        return <CommitmentCardMessage message={msg} {...actionProps} isOwn={isOwn} onCopy={undefined} />;
      default:
        return <TextMessage message={msg} isOwn={isOwn} isFirstInGroup={first} isLastInGroup={last} {...actionProps} />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendText();
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-surface-base">
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-muted">No messages yet. Say something!</p>
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          firstItemIndex={firstItemIndex}
          initialTopMostItemIndex={messages.length - 1}
          computeItemKey={(_, msg) => msg.id}
          followOutput="smooth"
          startReached={loadOlder}
          atBottomStateChange={(bottom) => {
            atBottomRef.current = bottom;
            setShowScrollDown(!bottom);
            if (bottom) setNewMessageCount(0);
          }}
          rangeChanged={({ startIndex, endIndex }) => {
            const offset = firstItemIndex;
            for (let vi = startIndex; vi <= endIndex; vi++) {
              const msg = messages[vi - offset];
              if (msg && msg.userId !== currentUserId && !msg.id.startsWith("temp-")) {
                pendingReadsRef.current.add(msg.id);
              }
            }
            scheduleFlushReads();
          }}
          increaseViewportBy={{ top: 200, bottom: 0 }}
          className="flex-1 min-h-0"
          style={{ overflowX: "hidden" }}
          itemContent={(index, msg) => {
            const i = index - firstItemIndex;
            const prev = i > 0 ? messages[i - 1] : null;
            const next = i < messages.length - 1 ? messages[i + 1] : null;
            const msgDate = new Date(msg.createdAt);
            const prevDate = prev ? new Date(prev.createdAt) : null;

            const showDate = !prev || !isSameDay(msgDate, prevDate!);
            const sameAsPrev = prev?.userId === msg.userId && !showDate && (msgDate.getTime() - new Date(prev!.createdAt).getTime()) < 120_000;
            const sameAsNext = next?.userId === msg.userId && isSameDay(msgDate, new Date(next!.createdAt)) && (new Date(next!.createdAt).getTime() - msgDate.getTime()) < 120_000;

            const isFirst = !sameAsPrev;
            const isLast = !sameAsNext;

            return (
              <div className="px-4">
                {showDate && <DateSeparator date={msgDate} />}
                <div className={isFirst && i > 0 && !showDate ? "mt-3" : sameAsPrev ? "mt-0.5" : ""}>
                  {renderMessage(msg, isFirst, isLast)}
                </div>
              </div>
            );
          }}
        />
      )}

      {showScrollDown && (
        <div className="flex-none flex justify-end px-4 pb-2">
          <motion.button
            whileTap={press.button}
            onClick={() => {
              virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: "smooth" });
              setShowScrollDown(false);
              setNewMessageCount(0);
            }}
            className="flex items-center gap-1.5 rounded-full bg-surface-overlay border border-border-default px-3 py-1.5 text-xs text-text-secondary active:bg-surface-elevated transition-colors shadow-lg"
          >
            {newMessageCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-semantic-info px-1 text-[10px] font-bold text-white">
                {newMessageCount}
              </span>
            )}
            ↓
          </motion.button>
        </div>
      )}

      {typingUsers.size > 0 && (
        <div className="flex-none px-4 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-text-muted">
              {typingUsers.size === 1 ? "typing..." : `${typingUsers.size} typing...`}
            </span>
          </div>
        </div>
      )}

      {replyTo && (
        <div className="flex-none border-t border-border-subtle px-4 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-radius-sm border-l-2 border-text-tertiary pl-3">
            <p className="text-[10px] font-medium text-text-tertiary truncate">
              {replyTo.sender?.displayName || "Message"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {replyTo.content || replyTo.messageType}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-text-muted active:bg-surface-elevated transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex-none border-t border-border-default px-4 pt-3 safe-bottom">
        <div className="flex items-center gap-2">
          {/* Photo button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <IconButton
            label="Add photo"
            size="md"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || recording}
          >
            <Camera size={18} />
          </IconButton>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
              emitTyping();
            }}
            onKeyDown={(e) => {
              const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
              if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder={recording ? `Recording… ${recordingDuration}s` : "Message…"}
            disabled={recording}
            rows={1}
            className="flex-1 rounded-radius-md border border-border-default bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none disabled:opacity-50 transition-colors resize-none overflow-hidden"
          />

          {/* Mic / Stop button */}
          <IconButton
            label={recording ? "Stop recording" : "Record voice"}
            size="md"
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={sending}
            className={recording ? "bg-semantic-error/20 text-semantic-error" : ""}
          >
            {recording ? <Square size={16} /> : <Mic size={18} />}
          </IconButton>

          {/* Send button */}
          <IconButton
            label="Send"
            size="md"
            type="submit"
            disabled={!input.trim() || sending || recording}
            className="h-10 w-10 flex-none bg-text-primary text-surface-base"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </IconButton>
        </div>
      </form>
    </div>
  );
}
