import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from './admin';

/**
 * Creates a Supabase client with a real authenticated session for a specific user.
 * Uses generateLink + verifyOtp to mint a session server-side.
 * RLS policies see auth.uid() as the given user.
 * Used by the Telegram webhook so data access is RLS-enforced
 * without a browser session / cookie.
 */
export async function createUserScopedClient(userId: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    throw new Error(`Cannot create scoped client: no email for user ${userId}`);
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate session link: ${linkError?.message ?? 'no token'}`);
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: otpError } = await client.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });

  if (otpError) {
    throw new Error(`Failed to create user session: ${otpError.message}`);
  }

  return client;
}
