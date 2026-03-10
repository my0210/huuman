import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('weight_entries')
    .select('id, date, weight_kg, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(90);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    entries: (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      date: e.date,
      weightKg: Number(e.weight_kg),
      createdAt: e.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { weightKg, date } = (await req.json()) as { weightKg: number; date?: string };
  if (!weightKg || weightKg < 20 || weightKg > 300) {
    return NextResponse.json({ error: 'weightKg is required (20-300)' }, { status: 400 });
  }

  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const { data: entry, error } = await supabase
    .from('weight_entries')
    .upsert(
      { user_id: user.id, date: targetDate, weight_kg: weightKg },
      { onConflict: 'user_id,date' },
    )
    .select('id, date, weight_kg, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: latest } = await supabase
    .from('weight_entries')
    .select('date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (latest && latest.date <= targetDate) {
    await supabase
      .from('user_profiles')
      .update({ weight_kg: weightKg })
      .eq('id', user.id);
  }

  return NextResponse.json({
    entry: {
      id: entry.id,
      date: entry.date,
      weightKg: Number(entry.weight_kg),
      createdAt: entry.created_at,
    },
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('weight_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-sync profile with the latest remaining entry
  const { data: latest } = await supabase
    .from('weight_entries')
    .select('weight_kg')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from('user_profiles')
    .update({ weight_kg: latest ? Number(latest.weight_kg) : null })
    .eq('id', user.id);

  return NextResponse.json({ deleted: id });
}
