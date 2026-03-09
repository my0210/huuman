import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ContextCategory, ContextScope } from '@/lib/types';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, username, sharing_enabled, email, avatar_url')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updatePayload: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    updatePayload.display_name = body.displayName;
  }

  if (body.username !== undefined) {
    const normalized = String(body.username).toLowerCase();
    if (!USERNAME_REGEX.test(normalized)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters, alphanumeric and underscores only' },
        { status: 400 },
      );
    }
    updatePayload.username = normalized;
  }

  if (body.avatarUrl !== undefined) {
    updatePayload.avatar_url = body.avatarUrl;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, display_name, username, sharing_enabled, email, avatar_url')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('username')) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

interface ContextItemInput {
  category: ContextCategory;
  content: string;
  scope: ContextScope;
  expiresAt?: string;
  source: 'onboarding' | 'conversation';
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const updatePayload: Record<string, unknown> = {};

  if (body.displayName !== undefined) updatePayload.display_name = body.displayName;
  if (body.age !== undefined) updatePayload.age = body.age;
  if (body.weightKg !== undefined) updatePayload.weight_kg = body.weightKg;
  if (body.goals !== undefined) updatePayload.goals = body.goals;
  if (body.constraints !== undefined) updatePayload.constraints = body.constraints;
  if (body.domainBaselines !== undefined) updatePayload.domain_baselines = body.domainBaselines;
  if (body.onboardingCompleted !== undefined) updatePayload.onboarding_completed = body.onboardingCompleted;
  if (body.timezone !== undefined) updatePayload.timezone = body.timezone;

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.contextItems) && body.contextItems.length > 0) {
    const rows = (body.contextItems as ContextItemInput[]).map((item) => ({
      user_id: user.id,
      category: item.category,
      content: item.content,
      scope: item.scope,
      expires_at: item.expiresAt ?? null,
      source: item.source,
    }));
    await supabase.from('user_context').insert(rows);
  }

  return NextResponse.json({ profile: data });
}
