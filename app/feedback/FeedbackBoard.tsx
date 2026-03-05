"use client";

import { useState, useEffect, useRef } from "react";
import type { FeedbackItem, FeedbackComment } from "./page";

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
  archived: { label: "Archived", color: "text-zinc-600", bg: "bg-zinc-900/50 border-zinc-800/50", accent: "border-zinc-700" },
};

const STATUSES = ["new", "in_progress", "done", "wont_fix"] as const;

export function FeedbackBoard({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, FeedbackComment[]>>(() => {
    const map: Record<string, FeedbackComment[]> = {};
    for (const item of initialItems) {
      if (item.comments.length > 0) map[item.id] = item.comments;
    }
    return map;
  });

  function toggleComments(id: string) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addComment(feedbackId: string, comment: FeedbackComment) {
    setCommentsMap(prev => ({
      ...prev,
      [feedbackId]: [...(prev[feedbackId] ?? []), comment],
    }));
  }

  const activeItems = showArchived ? items : items.filter(i => i.status !== "archived");
  const filtered = filter === "all" ? activeItems : activeItems.filter(i => i.status === filter);
  const archivedCount = items.filter(i => i.status === "archived").length;

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

  function copyPrompt(item: FeedbackItem) {
    const catLabel = CATEGORY_META[item.category]?.label ?? item.category;
    const date = new Date(item.created_at).toISOString().split("T")[0];
    const quotes = item.raw_quotes.map(q => `> ${q}`).join("\n");

    const prompt = [
      `## Feedback: ${catLabel}`,
      `**Reported by:** ${item.user_email ?? "unknown"} | **Date:** ${date}`,
      "",
      "### Summary",
      item.content,
      ...(quotes ? ["", "### User's exact words", quotes] : []),
      "",
      "---",
      "",
      "Read ARCHITECTURE.md first, then analyze this feedback.",
      "Identify the root cause, propose a fix with specific file paths and code,",
      "and wait for my approval before implementing.",
    ].join("\n");

    navigator.clipboard.writeText(prompt);
    setCopied(item.id);
    setTimeout(() => setCopied(prev => (prev === item.id ? null : prev)), 2000);
  }

  async function launchAgent(id: string) {
    setLaunching(id);
    try {
      const res = await fetch("/api/feedback/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const { agentUrl, agentId } = await res.json();
        setItems(prev => prev.map(i =>
          i.id === id ? { ...i, agent_id: agentId, agent_url: agentUrl, status: "in_progress" } : i,
        ));
      }
    } finally {
      setLaunching(null);
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

      {archivedCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => { setShowArchived(prev => !prev); setFilter("all"); }}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
          </button>
        </div>
      )}

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
                  item.status === "archived"
                    ? "border-zinc-800/30 opacity-50"
                    : item.status === "done" || item.status === "wont_fix"
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

                {/* Status controls + agent button */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/50">
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
                  <span className="flex-1" />
                  <button
                    onClick={() => toggleComments(item.id)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    {(commentsMap[item.id]?.length ?? 0) > 0
                      ? `${commentsMap[item.id].length} comment${commentsMap[item.id].length === 1 ? "" : "s"}`
                      : "Comment"}
                  </button>
                  {item.status !== "archived" ? (
                    <button
                      onClick={() => updateStatus(item.id, "archived")}
                      disabled={isUpdating}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(item.id, "new")}
                      disabled={isUpdating}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
                    >
                      Unarchive
                    </button>
                  )}
                  <button
                    onClick={() => copyPrompt(item)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-teal-500 hover:text-teal-400 hover:bg-teal-950/40 transition-colors"
                  >
                    {copied === item.id ? "Copied!" : "Copy to Cursor"}
                  </button>
                  {item.agent_url ? (
                    <a
                      href={item.agent_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-violet-950/60 border border-violet-900/40 text-violet-400 hover:bg-violet-900/40 transition-colors"
                    >
                      View agent
                    </a>
                  ) : (
                    <button
                      onClick={() => launchAgent(item.id)}
                      disabled={launching === item.id}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-violet-500 hover:text-violet-400 hover:bg-violet-950/40 transition-colors disabled:opacity-50"
                    >
                      {launching === item.id ? "Launching..." : "Fix with Cursor"}
                    </button>
                  )}
                </div>

                {expandedComments.has(item.id) && (
                  <CommentSection
                    feedbackId={item.id}
                    comments={commentsMap[item.id] ?? []}
                    onAdd={(c) => addComment(item.id, c)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CommentSection({
  feedbackId,
  comments,
  onAdd,
}: {
  feedbackId: string;
  comments: FeedbackComment[];
  onAdd: (c: FeedbackComment) => void;
}) {
  const [author, setAuthor] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("feedback_author") ?? "";
    return "";
  });
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (comments.length === 0) inputRef.current?.focus();
  }, [comments.length]);

  async function submit() {
    const trimmedAuthor = author.trim();
    const trimmedContent = content.trim();
    if (!trimmedAuthor || !trimmedContent) return;

    setSubmitting(true);
    localStorage.setItem("feedback_author", trimmedAuthor);

    const optimistic: FeedbackComment = {
      id: crypto.randomUUID(),
      feedback_id: feedbackId,
      author: trimmedAuthor,
      content: trimmedContent,
      created_at: new Date().toISOString(),
    };
    onAdd(optimistic);
    setContent("");

    try {
      await fetch("/api/feedback/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: feedbackId, author: trimmedAuthor, content: trimmedContent }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/50">
      {comments.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <span className="text-[11px] font-medium text-zinc-400 shrink-0 pt-px w-16 text-right">
                {c.author}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-300 leading-relaxed">{c.content}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{formatTimeAgo(new Date(c.created_at))}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Name"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="w-16 shrink-0 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Add a comment..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className="flex-1 min-w-0 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={submitting || !author.trim() || !content.trim()}
          className="shrink-0 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-default"
        >
          Send
        </button>
      </div>
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
