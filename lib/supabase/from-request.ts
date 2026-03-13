import { createClient } from './server';
import { createClientFromToken } from './from-token';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client from an incoming request.
 * Checks for Bearer token (mobile apps) first, falls back to cookies (web).
 */
export async function createClientFromRequest(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return createClientFromToken(token);
  }
  return createClient();
}
