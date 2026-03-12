"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IonPage, IonContent, IonFooter, IonToolbar } from "@ionic/react";
import { Trash2, Send, Scale, Plus, ChevronRight, Camera, Utensils } from "lucide-react";
import { NavHeader } from "@/components/ui/NavHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { haptics } from "@/lib/haptics";
import { domainStyle } from "@/lib/domain-colors";
import { DOMAIN_META } from "@/lib/types";
import type { ContextCategory, ContextScope, DomainBaselines } from "@/lib/types";
import { formatSingleDomainBaseline } from "@/lib/onboarding/formatBaselines";

const CATEGORY_LABELS: Record<ContextCategory, string> = {
  physical: "Physical",
  environment: "Environment",
  equipment: "Equipment",
  schedule: "Schedule",
};

const CATEGORIES: ContextCategory[] = ["physical", "environment", "equipment", "schedule"];

interface ContextItem {
  id: string;
  category: ContextCategory;
  content: string;
  scope: ContextScope;
  expiresAt: string | null;
  source: "onboarding" | "conversation";
  createdAt: string;
}

interface WeightEntryData {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

interface ProfileData {
  email: string;
  age: number | null;
  weightKg: number | null;
  domainBaselines: DomainBaselines | null;
}

export default function DataPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [photoCounts, setPhotoCounts] = useState({ progress: 0, meals: 0 });
  const [weightEntries, setWeightEntries] = useState<WeightEntryData[]>([]);

  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/context").then((r) => r.json()),
      fetch("/api/progress-photos").then((r) => r.json()),
      fetch("/api/meal-photos").then((r) => r.json()),
      fetch("/api/weight-entries").then((r) => r.json()),
    ])
      .then(([contextData, progressData, mealData, weightData]) => {
        setProfile(contextData.profile);
        setItems(contextData.contextItems);
        setPhotoCounts({
          progress: (progressData.photos ?? []).length,
          meals: (mealData.photos ?? []).length,
        });
        setWeightEntries(weightData.entries ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!confirmingId) return;
    const timer = setTimeout(() => setConfirmingId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingId]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await fetch("/api/context", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeletingId(null);
    setConfirmingId(null);
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    haptics.medium();
    setAdding(true);
    const res = await fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent.trim() }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
      setNewContent("");
    }
    setAdding(false);
  };

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <IonPage>
        <NavHeader title="Your Data" onBack={() => router.push("/")} />
        <IonContent>
          <div className="px-4 py-6 space-y-6">
            <Skeleton className="h-20 w-full rounded-radius-lg" />
            <Skeleton className="h-28 w-full rounded-radius-lg" />
            <Skeleton className="h-36 w-full rounded-radius-lg" />
            <Skeleton className="h-24 w-full rounded-radius-lg" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <NavHeader title="Your Data" onBack={() => router.push("/")} />

      <IonContent>
        <div className="px-4 py-6 space-y-8">
        {profile && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Profile
            </h2>
            <div className="rounded-radius-lg border border-border-default bg-surface-raised divide-y divide-border-default">
              <ProfileRow label="Email" value={profile.email} />
              {profile.age && <ProfileRow label="Age" value={`${profile.age}`} />}
            </div>
          </section>
        )}

        <WeightHistorySection
          entries={weightEntries}
          onAdd={(entry) =>
            setWeightEntries((prev) => [entry, ...prev.filter((e) => e.date !== entry.date)])
          }
          onDelete={async (id) => {
            const res = await fetch("/api/weight-entries", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            if (res.ok) setWeightEntries((prev) => prev.filter((e) => e.id !== id));
          }}
        />

        {profile?.domainBaselines && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Baselines
            </h2>
            <div className="rounded-radius-lg border border-border-default bg-surface-raised divide-y divide-border-default">
              {(["cardio", "strength", "mindfulness", "nutrition", "sleep"] as const).map(
                (domain) => (
                  <div key={domain} className="px-4 py-3">
                    <p className={`text-xs font-medium ${domainStyle[domain].text}`}>
                      {DOMAIN_META[domain].label}
                    </p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {formatSingleDomainBaseline(domain, profile.domainBaselines!)}
                    </p>
                  </div>
                ),
              )}
            </div>
            <p className="text-xs text-text-muted px-1">Collected during onboarding</p>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tracking
          </h2>
          <div className="rounded-radius-lg border border-border-default bg-surface-raised divide-y divide-border-default">
            <button
              onClick={() => {
                haptics.light();
                router.push("/data/progress-photos");
              }}
              className="flex items-center justify-between w-full px-4 min-h-[44px] text-left active:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <Camera size={14} className="text-domain-strength" />
                <span className="text-sm text-text-primary">Progress Photos</span>
              </div>
              <div className="flex items-center gap-2">
                {photoCounts.progress > 0 && (
                  <span className="text-xs text-text-muted">{photoCounts.progress}</span>
                )}
                <ChevronRight size={14} className="text-text-muted" />
              </div>
            </button>
            <button
              onClick={() => {
                haptics.light();
                router.push("/data/meal-log");
              }}
              className="flex items-center justify-between w-full px-4 min-h-[44px] text-left active:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <Utensils size={14} className="text-domain-nutrition" />
                <span className="text-sm text-text-primary">Meal Log</span>
              </div>
              <div className="flex items-center gap-2">
                {photoCounts.meals > 0 && (
                  <span className="text-xs text-text-muted">{photoCounts.meals}</span>
                )}
                <ChevronRight size={14} className="text-text-muted" />
              </div>
            </button>
          </div>
        </section>

        {grouped.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              What the coach knows
            </h2>
            {grouped.map(({ category, items: catItems }) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-medium text-text-tertiary px-1">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <ContextCard
                      key={item.id}
                      item={item}
                      confirming={confirmingId === item.id}
                      deleting={deletingId === item.id}
                      onRequestDelete={() => setConfirmingId(item.id)}
                      onConfirmDelete={() => handleDelete(item.id)}
                      onCancelDelete={() => setConfirmingId(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {grouped.length === 0 && (
          <section className="py-8 text-center">
            <p className="text-sm text-text-muted">No context items yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Add something the coach should know, or tell the coach in chat.
            </p>
          </section>
        )}

        <div className="h-20" />
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Bad left knee, training at home this week..."
                disabled={adding}
                fullWidth={false}
                className="flex-1 min-w-0 text-sm"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newContent.trim() || adding}
                className="flex-none shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
          </form>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-secondary">{value}</span>
    </div>
  );
}

function ContextCard({
  item,
  confirming,
  deleting,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  item: ContextItem;
  confirming: boolean;
  deleting: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const created = new Date(item.createdAt);
  const timeLabel = formatRelativeDate(created);

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">{item.content}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={item.scope === "permanent" ? "default" : "warning"}>
              {item.scope === "temporary" && item.expiresAt
                ? `until ${item.expiresAt}`
                : item.scope}
            </Badge>
            <Badge variant="default">{item.source}</Badge>
            <span className="text-xs text-text-muted">{timeLabel}</span>
          </div>
        </div>

        <div className="flex-none pt-0.5">
          {!confirming ? (
            <IconButton label="Delete" size="sm" onClick={onRequestDelete}>
              <Trash2 size={14} />
            </IconButton>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirmDelete}
              onBlur={onCancelDelete}
              disabled={deleting}
            >
              {deleting ? "..." : "Delete?"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function WeightHistorySection({
  entries,
  onAdd,
  onDelete,
}: {
  entries: WeightEntryData[];
  onAdd: (entry: WeightEntryData) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const raw = weightInput.replace(",", ".");
    const kg = parseFloat(raw);
    if (isNaN(kg) || kg < 20 || kg > 300) {
      setError("Enter a weight between 20–300 kg");
      return;
    }
    haptics.medium();
    setSubmitting(true);
    try {
      const res = await fetch("/api/weight-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: kg, date: dateInput }),
      });
      if (res.ok) {
        const { entry } = await res.json();
        onAdd(entry);
        setWeightInput("");
        setShowForm(false);
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Failed (${res.status})`);
      }
    } catch {
      setError("Network error");
    }
    setSubmitting(false);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Weight</h2>
        <button
          onClick={() => {
            haptics.light();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1 min-h-[44px] px-2 text-xs text-text-muted active:text-text-secondary transition-colors"
        >
          <Plus size={12} />
          Log
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="kg"
            fullWidth={false}
            className="w-20 text-sm"
          />
          <Input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            fullWidth={false}
            className="text-sm"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || !weightInput}
          >
            {submitting ? "..." : "Save"}
          </Button>
        </form>
      )}
      {error && <p className="text-xs text-semantic-error">{error}</p>}

      {latest ? (
        <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Scale size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">Current</span>
          </div>
          <span className="text-lg font-semibold text-text-primary">{latest.weightKg} kg</span>
          <span className="ml-2 text-xs text-text-muted">
            {new Date(latest.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      ) : (
        <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3">
          <p className="text-xs text-text-muted">No weight entries yet. Log your first one above.</p>
        </div>
      )}

      {sorted.length > 1 && (
        <div className="rounded-radius-lg border border-border-default bg-surface-raised divide-y divide-border-default">
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1];
            const delta = prev ? Number((entry.weightKg - prev.weightKg).toFixed(1)) : null;
            return (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-16">
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-text-secondary">{entry.weightKg} kg</span>
                  {delta != null && delta !== 0 && (
                    <span
                      className={`text-xs ${delta < 0 ? "text-semantic-success" : "text-semantic-warning"}`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  )}
                </div>
                {confirmingId === entry.id ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onDelete(entry.id);
                      setConfirmingId(null);
                    }}
                    onBlur={() => setConfirmingId(null)}
                  >
                    Delete?
                  </Button>
                ) : (
                  <IconButton
                    label="Delete weight entry"
                    size="sm"
                    onClick={() => setConfirmingId(entry.id)}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
