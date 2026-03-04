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
    .select('id, category, content, raw_quotes, agent_id, created_at, user_id, status')
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

  let userEmail = 'unknown';
  if (item.user_id) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', item.user_id)
      .single();
    if (profile) userEmail = (profile as { email: string }).email;
  }

  const createdAt = new Date(item.created_at).toISOString().split('T')[0];
  const slug = `${item.category}-${item.id.slice(0, 8)}`;

  const prompt = `You are working on the huuman codebase -- an AI longevity coach app.

## User Feedback (${categoryLabel})

**Feedback ID:** \`${item.id}\`
**Category:** ${categoryLabel}
**Status:** ${item.status ?? 'new'}
**Reported by:** ${userEmail}
**Date:** ${createdAt}

### Summary

${item.content}

${quotes ? `### User's Exact Words\n\n${quotes}\n` : ''}
## Instructions

1. Read \`ARCHITECTURE.md\` at the repo root first to understand the codebase structure.
2. Analyze this feedback and identify the root cause or relevant area in the codebase.
3. Produce a detailed plan describing what files need to change, what the fix looks like, and any trade-offs. Cite specific file paths and code.
4. **Create a brief file** at \`feedback-briefs/${slug}.md\` with the following structure. This file must be self-contained so it can be handed to any other AI agent or developer without additional context:

\`\`\`markdown
# Feedback Brief: ${categoryLabel}

| Field | Value |
|-------|-------|
| **ID** | \`${item.id}\` |
| **Category** | ${categoryLabel} |
| **Status** | ${item.status ?? 'new'} |
| **Reported by** | ${userEmail} |
| **Date** | ${createdAt} |

---

## Problem / Request

(Paste the user feedback summary here)

## User's Exact Words

(Paste the raw quotes here, each as a blockquote)

---

## Codebase Context

This is the **huuman** codebase — an AI longevity coach (Next.js 16, Supabase, Claude via Vercel AI SDK).
Start by reading \`ARCHITECTURE.md\` at the repo root.

## Analysis

(Your analysis: root cause for bugs, design considerations for features, UX observations for experience feedback)

## Proposed Solution

(Detailed plan: which files change, what the changes look like, trade-offs, edge cases)

## Files Involved

(Bulleted list of file paths that need to be created or modified)
\`\`\`

5. Do NOT implement the fix. Only produce the plan and the brief file.`;

  const res = await fetch('https://api.cursor.com/v0/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CURSOR_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      source: { repository: REPO_URL, ref: 'main' },
      target: { autoCreatePr: false },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Feedback Agent] Cursor API error:', res.status, body);
    return Response.json({ error: 'Failed to launch agent' }, { status: 502 });
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
