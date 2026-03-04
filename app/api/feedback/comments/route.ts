import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const feedbackId = searchParams.get('feedback_id');

  if (!feedbackId) {
    return Response.json({ error: 'feedback_id required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('feedback_comments')
    .select('id, feedback_id, author, content, created_at')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

export async function POST(req: Request) {
  const { feedback_id, author, content } = await req.json();

  if (!feedback_id || !author?.trim() || !content?.trim()) {
    return Response.json({ error: 'feedback_id, author, and content required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('feedback_comments')
    .insert({ feedback_id, author: author.trim(), content: content.trim() })
    .select('id, feedback_id, author, content, created_at')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
