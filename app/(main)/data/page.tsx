"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Send } from "lucide-react";
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

  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
        setItems(data.contextItems);
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
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold text-zinc-100">Your data</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Profile basics */}
        {profile && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Profile</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
              <ProfileRow label="Email" value={profile.email} />
              {profile.age && <ProfileRow label="Age" value={`${profile.age}`} />}
              {profile.weightKg && <ProfileRow label="Weight" value={`${profile.weightKg} kg`} />}
            </div>
          </section>
        )}

        {/* Domain baselines */}
        {profile?.domainBaselines && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Baselines</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
              {(["cardio", "strength", "mindfulness", "nutrition", "sleep"] as const).map((domain) => (
                <div key={domain} className="px-4 py-3">
                  <p className="text-xs font-medium text-zinc-400" style={{ color: DOMAIN_META[domain].color }}>
                    {DOMAIN_META[domain].label}
                  </p>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    {formatSingleDomainBaseline(domain, profile.domainBaselines!)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 px-1">Collected during onboarding</p>
          </section>
        )}

        {/* Context items by category */}
        {grouped.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              What the coach knows
            </h2>
            {grouped.map(({ category, items: catItems }) => (
              <div key={category} className="space-y-2">
                <h3 className="text-xs font-medium text-zinc-400 px-1">{CATEGORY_LABELS[category]}</h3>
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
            <p className="text-sm text-zinc-500">No context items yet.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add something the coach should know, or tell the coach in chat.
            </p>
          </section>
        )}

        {/* Spacer for sticky add bar */}
        <div className="h-20" />
      </div>

      {/* Add new context */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        className="flex-none border-t border-zinc-800 bg-zinc-950 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Bad left knee, training at home this week..."
            disabled={adding}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newContent.trim() || adding}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 disabled:opacity-30 transition-opacity"
          >
            {adding ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-300">{value}</span>
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200">{item.content}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
              item.scope === "permanent"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-amber-900/30 text-amber-400"
            }`}>
              {item.scope === "temporary" && item.expiresAt
                ? `until ${item.expiresAt}`
                : item.scope}
            </span>
            <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
              {item.source}
            </span>
            <span className="text-[10px] text-zinc-600">{timeLabel}</span>
          </div>
        </div>

        <div className="flex-none pt-0.5">
          {!confirming ? (
            <button
              onClick={onRequestDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={onConfirmDelete}
              onBlur={onCancelDelete}
              disabled={deleting}
              className="rounded-lg bg-red-900/40 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
            >
              {deleting ? "..." : "Delete?"}
            </button>
          )}
        </div>
      </div>
    </div>
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
