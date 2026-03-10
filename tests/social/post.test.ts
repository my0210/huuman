import { describe, expect, it, vi } from 'vitest';
import {
  getUserGroups,
  postSessionCard,
  postSleepCard,
  postMealCard,
  postCommitmentCard,
} from '@/lib/social/post';
import { createSocialMockSupabase } from '../mocks/supabase';
import type { SessionCardDetail, SleepCardDetail, MealCardDetail, CommitmentCardDetail } from '@/lib/types';

const USER_ID = 'user-1';

const sessionData: SessionCardDetail = {
  sessionId: 'sess-1',
  domain: 'strength',
  title: 'Upper body',
  exercises: [{ name: 'Bench Press', sets: 5, reps: '5', weight: '82.5' }],
};

const sleepData: SleepCardDetail = {
  hours: 7.5,
  quality: 4,
};

const mealData: MealCardDetail = {
  photoUrl: 'https://example.com/meal.jpg',
  calories: 600,
  proteinG: 45,
  assessment: 'Solid post-workout choice',
};

const commitmentData: CommitmentCardDetail = {
  domain: 'strength',
  title: 'Lower body at FitnessFirst',
  time: '18:00',
  place: 'FitnessFirst Schwabing',
};

describe('getUserGroups', () => {
  it('returns group IDs for a user', async () => {
    const supabase = createSocialMockSupabase({
      tables: {
        group_members: [
          [{ group_id: 'g-1' }, { group_id: 'g-2' }],
        ],
      },
    });

    const ids = await getUserGroups(supabase, USER_ID);
    expect(ids).toEqual(['g-1', 'g-2']);
  });

  it('returns empty array when user has no groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: { group_members: null },
    });

    const ids = await getUserGroups(supabase, USER_ID);
    expect(ids).toEqual([]);
  });
});

describe('postSessionCard', () => {
  it('inserts session_card messages into all user groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: {
        group_members: [[{ group_id: 'g-1' }, { group_id: 'g-2' }]],
        social_messages: [null, null],
      },
    });

    await postSessionCard(supabase, USER_ID, sessionData);

    const inserts = supabase._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(2);
    expect(inserts[0].data).toMatchObject({
      group_id: 'g-1',
      user_id: USER_ID,
      message_type: 'session_card',
    });
    expect(inserts[1].data).toMatchObject({
      group_id: 'g-2',
      user_id: USER_ID,
      message_type: 'session_card',
    });
  });

  it('does nothing when user has no groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: { group_members: null },
    });

    await postSessionCard(supabase, USER_ID, sessionData);

    const inserts = supabase._calls.filter(c => c.op === 'insert');
    expect(inserts).toHaveLength(0);
  });

  it('swallows errors silently', async () => {
    const supabase = createSocialMockSupabase({
      tables: { group_members: [[{ group_id: 'g-1' }]] },
    });
    const origFrom = supabase.from.bind(supabase);
    (supabase as unknown as Record<string, unknown>).from = (table: string) => {
      if (table === 'social_messages') throw new Error('DB down');
      return origFrom(table);
    };

    await expect(postSessionCard(supabase, USER_ID, sessionData)).resolves.toBeUndefined();
  });
});

describe('postSleepCard', () => {
  it('inserts sleep_card messages into all user groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: {
        group_members: [[{ group_id: 'g-1' }]],
        social_messages: [null],
      },
    });

    await postSleepCard(supabase, USER_ID, sleepData);

    const inserts = supabase._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].data).toMatchObject({
      message_type: 'sleep_card',
      detail: sleepData,
    });
  });
});

describe('postMealCard', () => {
  it('inserts meal_card messages into all user groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: {
        group_members: [[{ group_id: 'g-1' }]],
        social_messages: [null],
      },
    });

    await postMealCard(supabase, USER_ID, mealData);

    const inserts = supabase._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].data).toMatchObject({
      message_type: 'meal_card',
      detail: mealData,
    });
  });
});

describe('postCommitmentCard', () => {
  it('inserts commitment_card messages into all user groups', async () => {
    const supabase = createSocialMockSupabase({
      tables: {
        group_members: [[{ group_id: 'g-1' }, { group_id: 'g-2' }]],
        social_messages: [null, null],
      },
    });

    await postCommitmentCard(supabase, USER_ID, commitmentData);

    const inserts = supabase._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(2);
  });

  it('posts to specific group when groupId provided', async () => {
    const supabase = createSocialMockSupabase({
      tables: { social_messages: [null] },
    });

    await postCommitmentCard(supabase, USER_ID, commitmentData, 'g-specific');

    const inserts = supabase._calls.filter(c => c.table === 'social_messages' && c.op === 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].data).toMatchObject({
      group_id: 'g-specific',
      message_type: 'commitment_card',
    });
  });

  it('swallows errors silently', async () => {
    const supabase = createSocialMockSupabase({
      tables: { group_members: [[{ group_id: 'g-1' }]] },
    });
    const origFrom = supabase.from.bind(supabase);
    (supabase as unknown as Record<string, unknown>).from = (table: string) => {
      if (table === 'social_messages') throw new Error('DB down');
      return origFrom(table);
    };

    await expect(postCommitmentCard(supabase, USER_ID, commitmentData)).resolves.toBeUndefined();
  });
});
