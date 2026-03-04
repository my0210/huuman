import { createAdminClient } from '@/lib/supabase/admin';
import type { Metadata } from 'next';
import { FeedbackBoard } from './FeedbackBoard';

export const metadata: Metadata = {
  title: 'huuman - Feedback',
  description: 'Feature requests, bug reports, and experience feedback from huuman users.',
};

export const dynamic = 'force-dynamic';

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  category: string;
  status: string;
  content: string;
  raw_quotes: string[];
  created_at: string;
  user_email: string | null;
  agent_id: string | null;
  agent_url: string | null;
  comments: FeedbackComment[];
}

export default async function FeedbackPage() {
  const supabase = createAdminClient();

  const { data: feedback, error } = await supabase
    .from('user_feedback')
    .select('id, category, status, content, raw_quotes, created_at, user_id, agent_id, agent_url')
    .order('created_at', { ascending: false });

  const rows = (feedback ?? []) as Array<{
    id: string;
    category: string;
    status?: string;
    content: string;
    raw_quotes: string[];
    created_at: string;
    user_id: string;
    agent_id?: string | null;
    agent_url?: string | null;
  }>;

  const userIds = [...new Set(rows.map(r => r.user_id))];
  const emailMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds);

    for (const p of (profiles ?? []) as Array<{ id: string; email: string }>) {
      emailMap.set(p.id, p.email);
    }
  }

  const feedbackIds = rows.map(r => r.id);
  const commentsMap = new Map<string, FeedbackComment[]>();

  if (feedbackIds.length > 0) {
    const { data: comments } = await supabase
      .from('feedback_comments')
      .select('id, feedback_id, author, content, created_at')
      .in('feedback_id', feedbackIds)
      .order('created_at', { ascending: true });

    for (const c of (comments ?? []) as FeedbackComment[]) {
      const list = commentsMap.get(c.feedback_id) ?? [];
      list.push(c);
      commentsMap.set(c.feedback_id, list);
    }
  }

  const items: FeedbackItem[] = rows.map(r => ({
    id: r.id,
    category: r.category,
    status: r.status ?? 'new',
    content: r.content,
    raw_quotes: r.raw_quotes,
    created_at: r.created_at,
    user_email: emailMap.get(r.user_id) ?? null,
    agent_id: r.agent_id ?? null,
    agent_url: r.agent_url ?? null,
    comments: commentsMap.get(r.id) ?? [],
  }));

  return (
    <div className="min-h-dvh bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-zinc-100">huuman feedback</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Bug reports, feature requests, and experience feedback from users.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-400">Failed to load feedback.</p>
        ) : (
          <FeedbackBoard initialItems={items} />
        )}
      </div>
    </div>
  );
}
