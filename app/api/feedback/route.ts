import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: Request) {
  const { id, status } = await req.json();

  if (!id || !status) {
    return Response.json({ error: 'id and status required' }, { status: 400 });
  }

  const valid = ['new', 'in_progress', 'done', 'wont_fix'];
  if (!valid.includes(status)) {
    return Response.json({ error: `status must be one of: ${valid.join(', ')}` }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_feedback')
    .update({ status })
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
