import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayISO } from '@/lib/types';
import type { ContextCategory, ContextScope } from '@/lib/types';

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { content, category, scope, expiresAt } = body as {
    content: string;
    category: ContextCategory;
    scope: ContextScope;
    expiresAt?: string;
  };

  if (!content?.trim() || !category || !scope) {
    return NextResponse.json({ error: 'content, category, and scope are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_context')
    .insert({
      user_id: user.id,
      content: content.trim(),
      category,
      scope,
      expires_at: expiresAt ?? null,
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
