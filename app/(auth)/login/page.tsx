"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IonPage, IonContent, IonList, IonItem, IonInput, IonButton } from "@ionic/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-primary">huuman</h1>
              <p className="mt-2 text-sm text-text-muted">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin}>
              <IonList inset>
                <IonItem>
                  <IonInput
                    type="email"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value ?? "")}
                    placeholder="Email"
                    required
                  />
                </IonItem>
                <IonItem>
                  <IonInput
                    type="password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value ?? "")}
                    placeholder="Password"
                    required
                  />
                </IonItem>
              </IonList>

              {error && (
                <p className="text-xs text-semantic-error px-4 mt-2">{error}</p>
              )}

              <div className="px-4 mt-4">
                <IonButton expand="block" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </IonButton>
              </div>
            </form>

            <p className="text-center text-xs text-text-muted">
              No account?{" "}
              <Link href="/signup" className="text-text-secondary active:text-text-primary">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
