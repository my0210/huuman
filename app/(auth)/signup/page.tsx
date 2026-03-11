"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { transition } from "@/lib/motion";
import LanguageSelector from "@/components/auth/LanguageSelector";
import { getSavedLanguage, type LanguageCode } from "@/lib/languages";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
        transition={transition.fade}
        className="flex min-h-dvh items-center justify-center bg-surface-base"
      >
        <div className="w-full max-w-sm space-y-8 px-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary">huuman</h1>
            <p className="mt-2 text-sm text-text-muted">{t("signup.title", lang)}</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("signup.email", lang)}
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("signup.password", lang)}
              required
              minLength={6}
            />

            {error && (
              <p className="text-xs text-semantic-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              size="lg"
            >
              {loading ? t("signup.loading", lang) : t("signup.submit", lang)}
            </Button>
          </form>

          <p className="text-center text-xs text-text-muted">
            {t("signup.hasAccount", lang)}{" "}
            <a href={connectId ? `/login?connect=${encodeURIComponent(connectId)}` : "/login"} className="text-text-secondary">
              {t("signup.signin", lang)}
            </a>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
