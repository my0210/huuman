"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Send, Camera, Mic, Loader2, Square } from "lucide-react";
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

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
}

const SOCIAL_PHOTOS_BUCKET = "social-photos";
const VOICE_NOTES_BUCKET = "voice-notes";

export default function GroupChat({ groupId, currentUserId }: GroupChatProps) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>(0 as unknown as ReturnType<typeof setInterval>);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

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

  // ---- Scroll to bottom on new messages ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ---- Realtime subscription ----
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`group:${groupId}`)
      .on("broadcast", { event: "new_message" }, (payload) => {
        const raw = payload.payload as Record<string, unknown>;
        const msg = normalizeMessage(raw);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        markRead();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, markRead]);

  // ---- Load older messages on scroll ----
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || !hasMore || loadingOlder) return;
    if (el.scrollTop > 80) return;

    setLoadingOlder(true);
    const oldest = messages[0]?.createdAt;
    const older = await fetchMessages(oldest);
    if (older.length < 30) setHasMore(false);
    if (older.length > 0) {
      const prevHeight = el.scrollHeight;
      setMessages((prev) => [...older.reverse(), ...prev]);
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      });
    }
    setLoadingOlder(false);
  }, [hasMore, loadingOlder, messages, fetchMessages]);

  // ---- Send text message ----
  const sendText = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "text", content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = normalizeMessage(data.message as Record<string, unknown>);
        msg.sender = { displayName: "You" };
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } finally {
      setSending(false);
    }
  };

  // ---- Photo upload ----
  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

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

      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "photo", mediaUrl: urlData.publicUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const msg = normalizeMessage(data.message as Record<string, unknown>);
        msg.sender = { displayName: "You" };
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
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

        setSending(true);
        try {
          const supabase = supabaseRef.current;
          const path = `${currentUserId}/${Date.now()}.webm`;

          const { error } = await supabase.storage
            .from(VOICE_NOTES_BUCKET)
            .upload(path, blob, { contentType: "audio/webm", upsert: false });
          if (error) throw error;

          const { data: urlData } = supabase.storage.from(VOICE_NOTES_BUCKET).getPublicUrl(path);

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
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
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
  }, []);

  // ---- Render message by type ----
  const renderMessage = (msg: SocialMessage) => {
    const isOwn = msg.userId === currentUserId;
    const onReact = (emoji: string) => handleReact(msg.id, emoji);

    switch (msg.messageType) {
      case "text":
        return <TextMessage message={msg} isOwn={isOwn} />;
      case "voice":
        return <VoiceMessage message={msg} isOwn={isOwn} />;
      case "photo":
        return <PhotoMessage message={msg} isOwn={isOwn} />;
      case "session_card":
        return <SessionCardMessage message={msg} onReact={onReact} />;
      case "sleep_card":
        return <SleepCardMessage message={msg} onReact={onReact} />;
      case "meal_card":
        return <MealCardMessage message={msg} onReact={onReact} />;
      case "commitment_card":
        return <CommitmentCardMessage message={msg} onReact={onReact} />;
      default:
        return <TextMessage message={msg} isOwn={isOwn} />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendText();
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
      >
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-zinc-500" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-zinc-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500">No messages yet. Say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>{renderMessage(msg)}</div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex-none border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Photo button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || recording}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <Camera size={18} />
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={recording ? `Recording… ${recordingDuration}s` : "Message…"}
            disabled={recording}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          />

          {/* Mic / Stop button */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={sending}
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${
              recording
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {recording ? <Square size={16} /> : <Mic size={18} />}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || sending || recording}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 disabled:opacity-30 transition-opacity"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
