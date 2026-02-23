import { NextResponse } from 'next/server';
import { generateWeeklyPlan } from '@/lib/ai/planGeneration';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
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
      console.error('[PlanGenRoute] Generation failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PlanGenRoute] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
