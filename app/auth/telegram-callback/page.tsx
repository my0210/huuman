"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function TelegramCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = createClient();

        const { error: authError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );

        if (authError) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          } else {
            throw authError;
          }
        }

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
          const res = await fetch("/api/auth/telegram-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          if (!res.ok) {
            const data = await res.json();
            console.warn("[TelegramCallback] Link failed:", data.error);
          }
        }

        setStatus("success");

        setTimeout(() => {
          window.location.href = "https://t.me/huuman_life_bot";
        }, 2000);
      } catch (err) {
        console.error("[TelegramCallback] Error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    }

    handleCallback();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-4">
          <Loader2 size={24} className="animate-spin text-zinc-400 mx-auto" />
          <p className="text-sm text-zinc-400">Confirming your account...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-300">Something went wrong</p>
          <p className="text-sm text-zinc-500">{error}</p>
          <a
            href="https://t.me/huuman_life_bot"
            className="inline-block rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            Back to Telegram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4">
      <div className="text-center space-y-4">
        <p className="text-xl font-semibold text-zinc-100">You're all set!</p>
        <p className="text-sm text-zinc-400">Redirecting you back to Telegram...</p>
        <a
          href="https://t.me/huuman_life_bot"
          className="inline-block rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
        >
          Open Telegram
        </a>
      </div>
    </div>
  );
}
