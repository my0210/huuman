import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { imageUrl, capturedAt, mealType } = (await req.json()) as {
    imageUrl: string;
    capturedAt?: string;
    mealType?: string;
  };
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  const mealAnalysisSchema = z.object({
    description: z.string().describe('What you see in the photo (e.g. "Grilled chicken breast with roasted vegetables and brown rice")'),
    estimatedCalories: z.number().nullable().describe('Rough calorie estimate, or null if not food'),
    estimatedProteinG: z.number().nullable().describe('Rough protein estimate in grams, or null if not food'),
    detectedMealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable().describe('Inferred meal type, or null if unclear'),
  });

  let description = 'Photo saved';
  let estimatedCalories: number | null = null;
  let estimatedProteinG: number | null = null;
  let detectedMealType: string | null = mealType ?? null;

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: mealAnalysisSchema,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: new URL(imageUrl) },
          { type: 'text', text: 'Analyze this meal photo. Describe what you see, estimate calories and protein, and infer the meal type.' },
        ],
      }],
    });
    description = object.description;
    estimatedCalories = object.estimatedCalories;
    estimatedProteinG = object.estimatedProteinG;
    if (!detectedMealType && object.detectedMealType) detectedMealType = object.detectedMealType;
  } catch {
    description = 'Photo saved (analysis unavailable)';
  }

  const { data, error } = await supabase
    .from('meal_photos')
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      description,
      estimated_calories: estimatedCalories,
      estimated_protein_g: estimatedProteinG,
      meal_type: detectedMealType,
      captured_at: capturedAt ?? new Date().toISOString().slice(0, 10),
    })
    .select('id, image_url, description, estimated_calories, estimated_protein_g, meal_type, captured_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    photo: {
      id: data.id,
      imageUrl: data.image_url,
      description: data.description,
      estimatedCalories: data.estimated_calories,
      estimatedProteinG: data.estimated_protein_g,
      mealType: data.meal_type,
      capturedAt: data.captured_at,
      createdAt: data.created_at,
    },
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, capturedAt, mealType } = (await req.json()) as { id: string; capturedAt?: string; mealType?: string };
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (capturedAt) updates.captured_at = capturedAt;
  if (mealType !== undefined) updates.meal_type = mealType || null;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await supabase
    .from('meal_photos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: id, capturedAt, mealType });
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
