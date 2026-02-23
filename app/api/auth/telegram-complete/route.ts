import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: tokenRow } = await admin
      .from('telegram_registration_tokens')
      .select('*')
      .eq('token', token)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ telegram_chat_id: tokenRow.telegram_chat_id })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await admin
      .from('telegram_registration_tokens')
      .delete()
      .eq('token', token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TelegramComplete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
