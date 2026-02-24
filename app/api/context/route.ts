import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayISO } from '@/lib/types';
import type { ContextCategory, ContextScope } from '@/lib/types';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = getTodayISO();

  const [{ data: profile }, { data: contextItems }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('email, age, weight_kg, domain_baselines')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order('category')
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    profile: profile ? {
      email: profile.email,
      age: profile.age,
      weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
      domainBaselines: profile.domain_baselines,
    } : null,
    contextItems: (contextItems ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      category: r.category,
      content: r.content,
      scope: r.scope,
      expiresAt: r.expires_at ?? null,
      source: r.source,
      createdAt: r.created_at,
    })),
  });
}

const classificationSchema = z.object({
  category: z.enum(['physical', 'environment', 'equipment', 'schedule']),
  scope: z.enum(['permanent', 'temporary']),
  expiresAt: z.string().nullable().describe('ISO date (YYYY-MM-DD) when temporary items expire, null for permanent'),
  content: z.string().describe('Cleaned-up version of the user input -- concise, coach-readable'),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const rawContent = (body.content as string)?.trim();

  if (!rawContent) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const today = getTodayISO();
  const { object: classified } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: classificationSchema,
    prompt: `Classify this user-provided context about their fitness/health situation. Today is ${today}.

Input: "${rawContent}"

Rules:
- category: physical (injuries, body limitations, medical), environment (where they train, travel), equipment (gear they have), schedule (availability, time constraints)
- scope: permanent for chronic/ongoing things, temporary for time-bounded situations
- expiresAt: for temporary items, estimate a reasonable expiry date. For "this week" use next Monday. For "2 weeks" add 14 days. Null for permanent.
- content: rewrite concisely for a coach to read. Keep it short and specific. Don't add information the user didn't provide.`,
  });

  const { data, error } = await supabase
    .from('user_context')
    .insert({
      user_id: user.id,
      content: classified.content,
      category: classified.category as ContextCategory,
      scope: classified.scope as ContextScope,
      expires_at: classified.expiresAt,
      source: 'conversation' as const,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    item: {
      id: data.id,
      category: data.category,
      content: data.content,
      scope: data.scope,
      expiresAt: data.expires_at ?? null,
      source: data.source,
      createdAt: data.created_at,
    },
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id } = body as { id: string };

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('user_context')
    .update({ active: false })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
