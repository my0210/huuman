import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('user_profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram already connected' }, { status: 400 });
    }

    const code = randomBytes(4).toString('base64url').slice(0, 6).toUpperCase();

    await admin.from('telegram_link_codes').upsert({
      code,
      user_id: user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }, { onConflict: 'code' });

    return NextResponse.json({
      code,
      botUrl: `https://t.me/huuman_life_bot?start=${code}`,
    });
  } catch (error) {
    console.error('[TelegramLink] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
