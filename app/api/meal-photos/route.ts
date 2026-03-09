import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('meal_photos')
    .select('id, image_url, description, estimated_calories, estimated_protein_g, meal_type, captured_at, created_at')
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    photos: (data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      imageUrl: p.image_url,
      description: p.description,
      estimatedCalories: p.estimated_calories,
      estimatedProteinG: p.estimated_protein_g,
      mealType: p.meal_type,
      capturedAt: p.captured_at,
      createdAt: p.created_at,
    })),
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('meal_photos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
