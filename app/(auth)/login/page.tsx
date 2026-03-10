"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectId = searchParams.get("connect");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100">huuman</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          No account?{" "}
          <a href={connectId ? `/signup?connect=${encodeURIComponent(connectId)}` : "/signup"} className="text-zinc-300 hover:text-zinc-100">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
