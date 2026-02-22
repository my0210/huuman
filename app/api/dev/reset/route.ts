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

  // Delete chat messages (FK: must come before conversations)
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id);

  if (convos && convos.length > 0) {
    const convoIds = convos.map((c) => c.id);
    await supabase
      .from('messages')
      .delete()
      .in('conversation_id', convoIds);
  }

  // Delete conversations
  await supabase
    .from('conversations')
    .delete()
    .eq('user_id', user.id);

  // Delete all planned sessions for this user
  await supabase
    .from('planned_sessions')
    .delete()
    .eq('user_id', user.id);

  // Delete all weekly plans
  await supabase
    .from('weekly_plans')
    .delete()
    .eq('user_id', user.id);

  // Delete daily habits
  await supabase
    .from('daily_habits')
    .delete()
    .eq('user_id', user.id);

  // Reset profile to initial state
  const { error } = await supabase
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
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
