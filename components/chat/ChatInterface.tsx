"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { Send, Settings, X, RotateCcw, Trash2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessagePart } from "./MessagePart";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

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

  const handleResetOnboarding = async () => {
    if (!confirm("Reset onboarding? This clears your profile and plan, then restarts onboarding.")) return;
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

  const handleClearData = async () => {
    if (!confirm("Clear all data? This deletes your plan, sessions, and habits but keeps your profile.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        router.refresh();
        setMenuOpen(false);
      } else {
        alert("Clear failed");
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
          <p className="text-xs text-zinc-500">your longevity coach</p>
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <button
              onClick={handleResetOnboarding}
              disabled={busy}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={16} className="flex-none text-zinc-500" />
              <div>
                <p className="font-medium">Reset onboarding</p>
                <p className="text-xs text-zinc-500">Clear profile and plan, restart from scratch</p>
              </div>
            </button>

            <button
              onClick={handleClearData}
              disabled={busy}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <Trash2 size={16} className="flex-none text-zinc-500" />
              <div>
                <p className="font-medium">Clear all data</p>
                <p className="text-xs text-zinc-500">Delete plans, sessions, and habits</p>
              </div>
            </button>

            <div className="border-t border-zinc-800 mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                <LogOut size={16} className="flex-none text-zinc-500" />
                <p className="font-medium">Sign out</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
            <p className="text-zinc-400 text-sm max-w-xs">
              Your plan is ready. Ask me anything or pick a shortcut below.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "What should I do today?",
                "Show me my week",
                "How am I doing?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    sendMessage({ text: suggestion });
                  }}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
        ))}

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
            placeholder="Message huuman..."
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
