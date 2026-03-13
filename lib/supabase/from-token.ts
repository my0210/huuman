import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client authenticated with a Bearer access token.
 * Used by native mobile apps (SwiftUI) that send tokens via Authorization header
 * instead of cookies.
 */
export function createClientFromToken(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}
