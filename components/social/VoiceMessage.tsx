"use client";

import { useState, useRef, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import type { SocialMessage } from "@/lib/types";

interface VoiceMessageProps {
  message: SocialMessage;
  isOwn: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms?: number) {
  if (!ms) return "0:00";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceMessage({ message, isOwn }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setProgress(audio.currentTime / audio.duration);
    }
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [playing]);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(message.mediaUrl ?? "");
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        cancelAnimationFrame(rafRef.current);
      });
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isOwn
            ? "rounded-br-md bg-zinc-800"
            : "rounded-bl-md bg-zinc-900 border border-zinc-800"
        }`}
      >
        {!isOwn && message.sender?.displayName && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
            {message.sender.displayName}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          {/* Waveform placeholder */}
          <div className="relative flex-1 h-6 flex items-center gap-[2px]">
            {Array.from({ length: 24 }).map((_, i) => {
              const h = 30 + Math.sin(i * 0.7) * 40 + Math.cos(i * 1.3) * 30;
              const filled = i / 24 <= progress;
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    filled ? "bg-zinc-300" : "bg-zinc-600"
                  }`}
                  style={{ height: `${Math.max(15, Math.min(100, h))}%` }}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-zinc-500 flex-none tabular-nums">
            {formatDuration(message.mediaDurationMs)}
          </span>
        </div>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-zinc-500 text-right" : "text-zinc-600"}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
