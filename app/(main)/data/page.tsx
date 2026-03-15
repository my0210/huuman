"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IonPage, IonContent } from "@ionic/react";
import { NavHeader } from "@/components/ui/NavHeader";
import { Skeleton } from "@/components/ui/Skeleton";

interface AboutYouData {
  yourPlan: {
    coachRationale: string | null;
    sessions: Array<{ id: string; domain: string; title: string; scheduledDate: string; status: string }>;
    habits: { avgSleepHours: number | null; nutritionDaysOnPlan: number; daysTracked: number };
    hasPlan: boolean;
  };
  myNotes: Array<{
    id: string;
    content: string;
    category: string;
    date: string;
    source: string;
    scope: string;
    expiresAt: string | null;
    deletable: boolean;
  }>;
  yourNumbers: {
    weight: { entries: Array<{ date: string; weightKg: number }>; current: number | null; deltaKg: number | null; earliestDate: string | null };
    sessions: Array<{ domain: string; count: number }>;
    nutrition: { avgCalories: number | null; avgProtein: number | null; daysLogged: number };
    progressPhotoCount: number;
  };
}

export default function DataPage() {
  const router = useRouter();
  const [data, setData] = useState<AboutYouData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/about-you")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <IonPage>
        <NavHeader title="About You" onBack={() => router.push("/")} />
        <IonContent>
          <div className="px-4 py-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-radius-lg" />
            <Skeleton className="h-24 w-full rounded-radius-lg" />
            <Skeleton className="h-20 w-full rounded-radius-lg" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <NavHeader title="About You" onBack={() => router.push("/")} />
      <IonContent>
        <div className="px-4 py-6 space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Your Plan
            </h2>
            <div className="rounded-radius-lg bg-surface-raised p-4 space-y-3">
              {data?.yourPlan.coachRationale ? (
                <p className="text-sm text-text-secondary">{data.yourPlan.coachRationale}</p>
              ) : (
                <p className="text-sm text-text-muted">No plan this week yet.</p>
              )}
              {data?.yourPlan.sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        s.domain === "cardio" ? "#f87171" :
                        s.domain === "strength" ? "#fb923c" :
                        s.domain === "mindfulness" ? "#22d3ee" : "#a1a1aa",
                    }}
                  />
                  <span className="text-sm text-text-primary flex-1">{s.title}</span>
                  <span className="text-xs text-text-muted">{s.scheduledDate}</span>
                  <span className={`text-xs ${s.status === "completed" ? "text-semantic-success" : "text-text-muted"}`}>
                    {s.status === "completed" ? "✓" : "○"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              My Notes
            </h2>
            <div className="space-y-2">
              {data?.myNotes.length === 0 && (
                <p className="text-sm text-text-muted rounded-radius-lg bg-surface-raised p-4">
                  I&apos;m still learning about you.
                </p>
              )}
              {data?.myNotes.map((note) => (
                <div key={note.id} className="rounded-radius-lg bg-surface-raised p-4">
                  <p className="text-sm text-text-primary">{note.content}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-muted">
                    <span>{note.category}</span>
                    <span>·</span>
                    <span>{note.date}</span>
                    <span>·</span>
                    <span>from {note.source}</span>
                    {note.scope === "temporary" && note.expiresAt && (
                      <>
                        <span>·</span>
                        <span className="text-semantic-warning">until {note.expiresAt}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Your Numbers
            </h2>
            <div className="space-y-2">
              {data?.yourNumbers.weight.current != null && (
                <div className="rounded-radius-lg bg-surface-raised p-4">
                  <p className="text-xs text-text-muted mb-1">Weight</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {data.yourNumbers.weight.current} <span className="text-base font-normal text-text-secondary">kg</span>
                  </p>
                  {data.yourNumbers.weight.deltaKg != null && (
                    <p className={`text-xs mt-1 ${data.yourNumbers.weight.deltaKg < 0 ? "text-semantic-success" : "text-text-secondary"}`}>
                      {data.yourNumbers.weight.deltaKg > 0 ? "+" : ""}{data.yourNumbers.weight.deltaKg} kg since {data.yourNumbers.weight.earliestDate}
                    </p>
                  )}
                </div>
              )}
              {data && data.yourNumbers.sessions.length > 0 && (
                <div className="rounded-radius-lg bg-surface-raised p-4">
                  <p className="text-xs text-text-muted mb-2">Sessions this month</p>
                  <div className="flex gap-2">
                    {data.yourNumbers.sessions.map((s) => (
                      <span key={s.domain} className="text-xs px-2.5 py-1 rounded-md bg-surface-overlay text-text-secondary">
                        {s.domain} {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data && data.yourNumbers.nutrition.daysLogged > 0 && (
                <div className="rounded-radius-lg bg-surface-raised p-4">
                  <p className="text-xs text-text-muted mb-1">Nutrition</p>
                  <p className="text-base text-text-primary">
                    {data.yourNumbers.nutrition.avgCalories && `~${data.yourNumbers.nutrition.avgCalories} cal`}
                    {data.yourNumbers.nutrition.avgProtein && ` · ${data.yourNumbers.nutrition.avgProtein}g protein`}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="h-20" />
        </div>
      </IonContent>
    </IonPage>
  );
}
