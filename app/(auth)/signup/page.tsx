"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import LanguageSelector from "@/components/auth/LanguageSelector";
import { getSavedLanguage, type LanguageCode } from "@/lib/languages";
import { t } from "@/lib/translations";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [languageChosen, setLanguageChosen] = useState(false);
  const [lang, setLang] = useState<LanguageCode>("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectId = searchParams.get("connect");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const result = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out. Please try again.")), 15_000),
        ),
      ]);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (connectId) {
        fetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: connectId }),
        }).catch(() => {});
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!languageChosen) {
    return <LanguageSelector onSelect={() => { setLang(getSavedLanguage()); setLanguageChosen(true); }} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="signup-form"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-dvh items-center justify-center bg-zinc-950"
      >
        <div className="w-full max-w-sm space-y-8 px-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-zinc-100">huuman</h1>
            <p className="mt-2 text-sm text-zinc-500">{t("signup.title", lang)}</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("signup.email", lang)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("signup.password", lang)}
                required
                minLength={6}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {loading ? t("signup.loading", lang) : t("signup.submit", lang)}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500">
            {t("signup.hasAccount", lang)}{" "}
            <a href={connectId ? `/login?connect=${encodeURIComponent(connectId)}` : "/login"} className="text-zinc-300 hover:text-zinc-100">
              {t("signup.signin", lang)}
            </a>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
