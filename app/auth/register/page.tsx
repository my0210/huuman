"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import LanguageSelector from "@/components/auth/LanguageSelector";

export default function TelegramRegisterPage() {
  const [languageChosen, setLanguageChosen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !token) return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/auth/telegram-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <div className="min-h-dvh bg-zinc-950 px-6 pt-20">
        <div className="mx-auto max-w-sm text-center space-y-3">
          <p className="text-base text-zinc-300">Invalid registration link.</p>
          <p className="text-sm text-zinc-500">Go back to Telegram and send /start to get a new one.</p>
        </div>
      </div>
    );
  }

  if (!languageChosen) {
    return <LanguageSelector onSelect={() => setLanguageChosen(true)} />;
  }

  if (status === "sent") {
    return (
      <div className="min-h-dvh bg-zinc-950 px-6 pt-20">
        <div className="mx-auto max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-zinc-100">Check your email</h1>
          <p className="text-base text-zinc-400">
            We sent a confirmation link to <span className="text-zinc-200">{email}</span>.
          </p>
          <p className="text-sm text-zinc-500">
            Tap the link in the email to finish setting up, then you&apos;ll be redirected back to Telegram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="register-form"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="min-h-dvh bg-zinc-950 px-6 pt-16 pb-8"
      >
        <div className="mx-auto max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-100">huuman</h1>
            <p className="text-base text-zinc-400">
              Enter your email to create your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3.5 text-base font-semibold text-zinc-900 hover:bg-white active:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          <p className="text-xs text-zinc-600 text-center">
            Your email secures your account and lets you access huuman on any device.
          </p>

          <a
            href="https://t.me/huuman_life_bot"
            className="block text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Back to Telegram
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
