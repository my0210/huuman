"use client";

import { useState } from "react";
import type { FeedbackItem } from "./page";

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  bug: { label: "Bug", color: "text-red-400", bg: "bg-red-950/60 border-red-900/40" },
  feature_request: { label: "Feature", color: "text-cyan-400", bg: "bg-cyan-950/60 border-cyan-900/40" },
  experience: { label: "Experience", color: "text-amber-400", bg: "bg-amber-950/60 border-amber-900/40" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; accent: string }> = {
  new: { label: "New", color: "text-zinc-300", bg: "bg-zinc-800 border-zinc-700", accent: "border-zinc-500" },
  in_progress: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-950/60 border-blue-900/40", accent: "border-blue-500" },
  done: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-950/60 border-emerald-900/40", accent: "border-emerald-500" },
  wont_fix: { label: "Won't Fix", color: "text-zinc-500", bg: "bg-zinc-900 border-zinc-800", accent: "border-zinc-600" },
};

const STATUSES = ["new", "in_progress", "done", "wont_fix"] as const;

export function FeedbackBoard({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  const statusCounts = {
    new: items.filter(i => i.status === "new").length,
    in_progress: items.filter(i => i.status === "in_progress").length,
    done: items.filter(i => i.status === "done").length,
    wont_fix: items.filter(i => i.status === "wont_fix").length,
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
      {/* Status cards -- click to filter */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {STATUSES.map(s => {
          const meta = STATUS_META[s];
          const count = statusCounts[s];
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(isActive ? "all" : s)}
              className={`rounded-lg border px-3 py-2.5 text-center transition-all ${
                isActive
                  ? `${meta.accent} border-2 bg-zinc-900`
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <p className={`text-lg font-bold tabular-nums ${meta.color}`}>{count}</p>
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">{meta.label}</p>
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
