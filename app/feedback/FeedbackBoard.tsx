"use client";

import { useState } from "react";
import type { FeedbackItem } from "./page";

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  bug: { label: "Bug", color: "text-red-400", bg: "bg-red-950/60 border-red-900/40" },
  feature_request: { label: "Feature", color: "text-cyan-400", bg: "bg-cyan-950/60 border-cyan-900/40" },
  experience: { label: "Experience", color: "text-amber-400", bg: "bg-amber-950/60 border-amber-900/40" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-zinc-400", bg: "bg-zinc-800 border-zinc-700" },
  in_progress: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-950/60 border-blue-900/40" },
  done: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-950/60 border-emerald-900/40" },
  wont_fix: { label: "Won't Fix", color: "text-zinc-500", bg: "bg-zinc-900 border-zinc-800" },
};

const STATUSES = ["new", "in_progress", "done", "wont_fix"] as const;
const FILTERS = ["all", "new", "in_progress", "done", "wont_fix"] as const;

export function FeedbackBoard({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  const counts = {
    total: items.length,
    bug: items.filter(f => f.category === "bug").length,
    feature_request: items.filter(f => f.category === "feature_request").length,
    experience: items.filter(f => f.category === "experience").length,
  };

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" count={counts.total} color="text-zinc-300" />
        <StatCard label="Bugs" count={counts.bug} color="text-red-400" />
        <StatCard label="Features" count={counts.feature_request} color="text-cyan-400" />
        <StatCard label="Experience" count={counts.experience} color="text-amber-400" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(f => {
          const isActive = filter === f;
          const label = f === "all" ? "All" : (STATUS_META[f]?.label ?? f);
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {label}
              {f !== "all" && (
                <span className="ml-1.5 tabular-nums">
                  {items.filter(i => i.status === f).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">
            {filter === "all" ? "No feedback yet." : `No ${STATUS_META[filter]?.label.toLowerCase()} items.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const catMeta = CATEGORY_META[item.category] ?? CATEGORY_META.experience;
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.new;
            const date = new Date(item.created_at);
            const isUpdating = updating === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-zinc-900/50 px-5 py-4 transition-opacity ${
                  item.status === "done" || item.status === "wont_fix"
                    ? "border-zinc-800/50 opacity-70"
                    : "border-zinc-800"
                }`}
              >
                {/* Top row: badges + user + time */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${catMeta.bg} ${catMeta.color}`}>
                    {catMeta.label}
                  </span>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
                    {statusMeta.label}
                  </span>
                  <span className="flex-1" />
                  {item.user_email && (
                    <span className="text-[11px] text-zinc-600 truncate max-w-[140px]" title={item.user_email}>
                      {item.user_email.split("@")[0]}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-600 whitespace-nowrap" title={date.toISOString()}>
                    {formatTimeAgo(date)}
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {item.content}
                </p>

                {/* Quotes */}
                {item.raw_quotes.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {item.raw_quotes.map((quote, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-zinc-700 pl-3 text-xs text-zinc-500 italic"
                      >
                        {quote}
                      </blockquote>
                    ))}
                  </div>
                )}

                {/* Status controls */}
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-zinc-800/50">
                  {STATUSES.map(s => {
                    const meta = STATUS_META[s];
                    const isActive = item.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => !isActive && updateStatus(item.id, s)}
                        disabled={isActive || isUpdating}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          isActive
                            ? `${meta.bg} ${meta.color} border`
                            : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
                        } disabled:cursor-default`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
