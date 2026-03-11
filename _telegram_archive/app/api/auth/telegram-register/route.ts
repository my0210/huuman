import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Missing email or token' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: tokenRow } = await admin
      .from('telegram_registration_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired registration link. Go back to Telegram and send /start for a new one.' }, { status: 400 });
    }

    const chatId = tokenRow.telegram_chat_id;

    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { source: 'telegram', telegram_chat_id: chatId },
      });

      if (createError || !newUser.user) {
        return NextResponse.json({ error: createError?.message ?? 'Failed to create account' }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    await admin
      .from('telegram_registration_tokens')
      .update({ user_id: userId })
      .eq('token', token);

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').trim();
    const redirectTo = `${siteUrl}/auth/telegram-callback?token=${encodeURIComponent(token)}`;

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (otpError) {
      return NextResponse.json({ error: otpError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error('[TelegramRegister] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
