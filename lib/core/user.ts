import type { AppSupabaseClient, UserProfile, UserContextItem } from '@/lib/types';
import { getTodayISO } from '@/lib/types';

export async function loadUserProfile(
  userId: string,
  supabase: AppSupabaseClient,
): Promise<UserProfile | null> {
  const today = getTodayISO();

  const [{ data: profile }, { data: contextRows }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_context')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gte.${today}`),
  ]);

  if (!profile) return null;

  const context: UserContextItem[] = (contextRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    category: r.category as UserContextItem['category'],
    content: r.content as string,
    scope: r.scope as UserContextItem['scope'],
    expiresAt: r.expires_at as string | undefined,
    active: r.active as boolean,
    source: r.source as UserContextItem['source'],
    createdAt: r.created_at as string,
  }));

  return {
    id: profile.id,
    email: profile.email,
    age: profile.age,
    weightKg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
    domainBaselines: profile.domain_baselines as UserProfile['domainBaselines'],
    goals: profile.goals as UserProfile['goals'],
    constraints: profile.constraints as UserProfile['constraints'],
    context,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
