import type { AppSupabaseClient, UserProfile } from '@/lib/types';

export async function loadUserProfile(
  userId: string,
  supabase: AppSupabaseClient,
): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    age: profile.age,
    weightKg: profile.weight_kg ? Number(profile.weight_kg) : undefined,
    domainBaselines: profile.domain_baselines as UserProfile['domainBaselines'],
    goals: profile.goals as UserProfile['goals'],
    constraints: profile.constraints as UserProfile['constraints'],
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
