import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const updatePayload: Record<string, unknown> = {};

  if (body.age !== undefined) updatePayload.age = body.age;
  if (body.weightKg !== undefined) updatePayload.weight_kg = body.weightKg;
  if (body.goals !== undefined) updatePayload.goals = body.goals;
  if (body.constraints !== undefined) updatePayload.constraints = body.constraints;
  if (body.domainBaselines !== undefined) updatePayload.domain_baselines = body.domainBaselines;
  if (body.onboardingCompleted !== undefined) updatePayload.onboarding_completed = body.onboardingCompleted;

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

  return NextResponse.json({ profile: data });
}
