import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DEV_TOOLS) {
    return NextResponse.json({ error: 'Dev tools disabled' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const uid = user.id;

  const { data: convos } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', uid);

  if (convos && convos.length > 0) {
    const convoIds = convos.map((c) => c.id);
    await admin.from('messages').delete().in('conversation_id', convoIds);
  }

  await admin.from('conversations').delete().eq('user_id', uid);
  await admin.from('planned_sessions').delete().eq('user_id', uid);
  await admin.from('weekly_plans').delete().eq('user_id', uid);
  await admin.from('daily_habits').delete().eq('user_id', uid);
  await admin.from('user_context').delete().eq('user_id', uid);

  const { error } = await admin
    .from('user_profiles')
    .update({
      age: null,
      weight_kg: null,
      domain_baselines: {},
      goals: { primary: [] },
      constraints: {
        schedule: { blockedTimes: [], preferredWorkoutTimes: [] },
        equipment: { gymAccess: false, homeEquipment: [], outdoorAccess: true },
        limitations: { injuries: [], medical: [] },
      },
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
