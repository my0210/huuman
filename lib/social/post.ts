import type {
  AppSupabaseClient,
  SessionCardDetail,
  SleepCardDetail,
  MealCardDetail,
  CommitmentCardDetail,
} from '@/lib/types';

export async function getUserGroups(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  return (data ?? []).map((r) => r.group_id as string);
}

async function postToGroups(
  supabase: AppSupabaseClient,
  userId: string,
  messageType: string,
  detail: unknown,
  groupIds: string[],
): Promise<void> {
  await Promise.all(
    groupIds.map((groupId) =>
      supabase.from('social_messages').insert({
        group_id: groupId,
        user_id: userId,
        message_type: messageType,
        detail,
      }),
    ),
  );
}

export async function postSessionCard(
  supabase: AppSupabaseClient,
  userId: string,
  sessionData: SessionCardDetail,
): Promise<void> {
  try {
    const groupIds = await getUserGroups(supabase, userId);
    if (groupIds.length === 0) return;
    await postToGroups(supabase, userId, 'session_card', sessionData, groupIds);
  } catch {
    // fire-and-forget
  }
}

export async function postSleepCard(
  supabase: AppSupabaseClient,
  userId: string,
  sleepData: SleepCardDetail,
): Promise<void> {
  try {
    const groupIds = await getUserGroups(supabase, userId);
    if (groupIds.length === 0) return;
    await postToGroups(supabase, userId, 'sleep_card', sleepData, groupIds);
  } catch {
    // fire-and-forget
  }
}

export async function postMealCard(
  supabase: AppSupabaseClient,
  userId: string,
  mealData: MealCardDetail,
): Promise<void> {
  try {
    const groupIds = await getUserGroups(supabase, userId);
    if (groupIds.length === 0) return;
    await postToGroups(supabase, userId, 'meal_card', mealData, groupIds);
  } catch {
    // fire-and-forget
  }
}

export async function postCommitmentCard(
  supabase: AppSupabaseClient,
  userId: string,
  commitmentData: CommitmentCardDetail,
  groupId?: string,
): Promise<void> {
  try {
    const groupIds = groupId ? [groupId] : await getUserGroups(supabase, userId);
    if (groupIds.length === 0) return;
    await postToGroups(supabase, userId, 'commitment_card', commitmentData, groupIds);
  } catch {
    // fire-and-forget
  }
}
