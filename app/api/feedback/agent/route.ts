import { createAdminClient } from '@/lib/supabase/admin';

const CURSOR_API_KEY = process.env.CURSOR_API_KEY!;
const REPO_URL = 'https://github.com/my0210/huuman';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  experience: 'Experience Feedback',
};

export async function POST(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: item, error: fetchError } = await supabase
    .from('user_feedback')
    .select('id, category, content, raw_quotes, agent_id')
    .eq('id', id)
    .single();

  if (fetchError || !item) {
    return Response.json({ error: 'Feedback not found' }, { status: 404 });
  }

  if (item.agent_id) {
    return Response.json({ error: 'Agent already launched for this item' }, { status: 409 });
  }

  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;
  const quotes = (item.raw_quotes as string[])
    .map((q: string) => `- "${q}"`)
    .join('\n');

  const prompt = `You are working on the huuman codebase -- an AI longevity coach app.

## User Feedback (${categoryLabel})

${item.content}

${quotes ? `## User's Exact Words\n\n${quotes}\n` : ''}
## Instructions

1. Read ARCHITECTURE.md at the repo root first to understand the codebase structure.
2. Analyze this feedback and identify the root cause or relevant area in the codebase.
3. Create a plan to address it, then implement the fix.
4. Create a pull request with the changes.`;

  const res = await fetch('https://api.cursor.com/v0/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CURSOR_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      source: { repository: REPO_URL, ref: 'main' },
      target: { autoCreatePr: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Feedback Agent] Cursor API error:', res.status, body);
    return Response.json({
      error: 'Failed to launch agent',
      detail: body,
      status: res.status,
      hasKey: !!CURSOR_API_KEY,
      keyPrefix: CURSOR_API_KEY?.slice(0, 8),
    }, { status: 502 });
  }

  const agent = await res.json();
  const agentId = agent.id;
  const agentUrl = agent.target?.url ?? `https://cursor.com/agents?id=${agentId}`;

  await supabase
    .from('user_feedback')
    .update({ agent_id: agentId, agent_url: agentUrl })
    .eq('id', id);

  return Response.json({ agentId, agentUrl });
}
