import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEV_TOOLS) {
    return NextResponse.json({ error: 'Dev tools disabled' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      age: null,
      weight_kg: null,
      domain_baselines: {},
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
