import { NextResponse } from 'next/server';
import { generateWeeklyPlan } from '@/lib/ai/planGeneration';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const body = await req.json();

  let userId = body.userId as string | undefined;

  if (!userId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await generateWeeklyPlan(userId, body.weekStart);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
