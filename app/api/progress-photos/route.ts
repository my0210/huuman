import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, image_url, ai_analysis, notes, captured_at, created_at')
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    photos: (data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      imageUrl: p.image_url,
      analysis: p.ai_analysis,
      notes: p.notes,
      capturedAt: p.captured_at,
      createdAt: p.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { imageUrl, capturedAt } = (await req.json()) as { imageUrl: string; capturedAt?: string };
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  let analysis = 'Analyzing...';
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', image: new URL(imageUrl) },
          { type: 'text', text: 'Analyze this body composition / progress photo in 2-3 sentences. Cover posture, muscle definition, proportions, and visible body fat distribution. Be objective and encouraging. Do not use markdown.' },
        ],
      }],
    });
    analysis = text;
  } catch {
    analysis = 'Photo saved (analysis unavailable)';
  }

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: user.id,
      image_url: imageUrl,
      ai_analysis: analysis,
      captured_at: capturedAt ?? new Date().toISOString().slice(0, 10),
    })
    .select('id, image_url, ai_analysis, notes, captured_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    photo: {
      id: data.id,
      imageUrl: data.image_url,
      analysis: data.ai_analysis,
      notes: data.notes,
      capturedAt: data.captured_at,
      createdAt: data.created_at,
    },
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, capturedAt } = (await req.json()) as { id: string; capturedAt: string };
  if (!id || !capturedAt) return NextResponse.json({ error: 'id and capturedAt are required' }, { status: 400 });

  const { error } = await supabase
    .from('progress_photos')
    .update({ captured_at: capturedAt })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: id, capturedAt });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
