import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { loadMessages, saveMessages } from '@/lib/chat/store';
import { loadUserProfile } from '@/lib/core/user';
import { getWeekStart, getTodayISO, getDayOfWeekName, SESSION_DOMAINS } from '@/lib/types';
import { getWelcomeBackPrompt } from '@/lib/ai/prompts';
import { getLanguageFromCookies } from '@/lib/languages';

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { chatId } = await req.json();
    if (!chatId) {
      return Response.json({ skip: true });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ skip: true });
    }

    const userId = user.id;
    const dbMessages = await loadMessages(chatId, supabase);

    if (dbMessages.length === 0) {
      return Response.json({ skip: true });
    }

    const lastMsg = dbMessages[dbMessages.length - 1];
    const lastTime = new Date(lastMsg.created_at).getTime();
    if (Date.now() - lastTime < EIGHT_HOURS) {
      return Response.json({ skip: true });
    }

    const userProfile = await loadUserProfile(userId, supabase);
    const tz = userProfile?.timezone ?? 'UTC';
    const today = getTodayISO(tz);
    const weekStart = getWeekStart(tz);
    const hour = parseInt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }), 10);
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = getDayOfWeekName(tz);

    const { data: activePlan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('status', 'active')
      .maybeSingle();

    let needsNewPlan = false;
    if (!activePlan) {
      const { data: draft } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'draft')
        .maybeSingle();
      needsNewPlan = !draft;
    }

    let todaySessions: string[] = [];
    let completedToday = 0;
    let weekCompleted = 0;
    let weekTotal = 0;

    if (activePlan) {
      const { data: todayRows } = await supabase
        .from('planned_sessions')
        .select('title, status')
        .eq('plan_id', activePlan.id)
        .eq('scheduled_date', today)
        .in('domain', SESSION_DOMAINS)
        .neq('status', 'skipped');

      todaySessions = (todayRows ?? []).map((s: { title: string }) => s.title);
      completedToday = (todayRows ?? []).filter((s: { status: string }) => s.status === 'completed').length;

      const { data: weekRows } = await supabase
        .from('planned_sessions')
        .select('status')
        .eq('plan_id', activePlan.id)
        .in('domain', SESSION_DOMAINS);

      weekTotal = (weekRows ?? []).length;
      weekCompleted = (weekRows ?? []).filter((s: { status: string }) => s.status === 'completed').length;
    }

    const language = getLanguageFromCookies(req.headers.get('cookie'));

    const prompt = getWelcomeBackPrompt({
      timeOfDay,
      dayOfWeek,
      todaySessions,
      completedToday,
      weekCompleted,
      weekTotal,
      hasPlan: !!activePlan,
      needsNewPlan,
      language,
    });

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
      maxOutputTokens: 120,
    });

    const messageId = crypto.randomUUID();
    await saveMessages(chatId, [{
      id: messageId,
      role: 'assistant',
      parts: [{ type: 'text', text: text.trim() }],
    }], supabase);

    return Response.json({
      skip: false,
      message: {
        id: messageId,
        role: 'assistant',
        parts: [{ type: 'text', text: text.trim() }],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Chat Seed] Error:', error);
    return Response.json({ skip: true });
  }
}
