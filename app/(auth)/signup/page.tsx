"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div className="flex min-h-dvh items-center justify-center bg-surface-base animate-fade-up">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">huuman</h1>
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
          <Link href="/login" className="text-text-secondary active:text-text-primary">
            {t("signup.signin", lang)}
          </Link>
        </p>
      </div>
    </div>
  );
}
