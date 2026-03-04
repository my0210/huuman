import { createAdminClient } from '@/lib/supabase/admin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'huuman - Feedback',
  description: 'Feature requests, bug reports, and experience feedback from huuman users.',
};

export const dynamic = 'force-dynamic';

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  bug: { label: 'Bug', color: 'text-red-400', bg: 'bg-red-950/60 border-red-900/40' },
  feature_request: { label: 'Feature', color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-900/40' },
  experience: { label: 'Experience', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-900/40' },
};

interface FeedbackRow {
  id: string;
  category: string;
  content: string;
  raw_quotes: string[];
  created_at: string;
}

export default async function FeedbackPage() {
  const supabase = createAdminClient();

  const { data: feedback, error } = await supabase
    .from('user_feedback')
    .select('id, category, content, raw_quotes, created_at')
    .order('created_at', { ascending: false });

  const items = (feedback ?? []) as FeedbackRow[];

  const counts = {
    total: items.length,
    bug: items.filter(f => f.category === 'bug').length,
    feature_request: items.filter(f => f.category === 'feature_request').length,
    experience: items.filter(f => f.category === 'experience').length,
  };

  return (
    <div className="min-h-dvh bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-zinc-100">huuman feedback</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Bug reports, feature requests, and experience feedback from users.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <StatCard label="Total" count={counts.total} color="text-zinc-300" />
          <StatCard label="Bugs" count={counts.bug} color="text-red-400" />
          <StatCard label="Features" count={counts.feature_request} color="text-cyan-400" />
          <StatCard label="Experience" count={counts.experience} color="text-amber-400" />
        </div>

        {/* Feedback list */}
        {error && (
          <p className="text-sm text-red-400">Failed to load feedback.</p>
        )}

        {items.length === 0 && !error && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">No feedback yet.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Users can submit feedback via the + menu in the huuman chat.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] ?? CATEGORY_META.experience;
            const date = new Date(item.created_at);
            const timeAgo = formatTimeAgo(date);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-zinc-600 whitespace-nowrap" title={date.toISOString()}>
                    {timeAgo}
                  </span>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  {item.content}
                </p>

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
              </div>
            );
          })}
        </div>
      </div>
    </div>
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

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
