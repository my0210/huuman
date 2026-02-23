import type { AppSupabaseClient } from '@/lib/types';
import {
  ONBOARDING_STEPS,
  INITIAL_ONBOARDING_DATA,
  setQuestionValue,
  setFieldValue,
  type OnboardingData,
  type OnboardingStep,
} from '@/lib/onboarding/steps';
import { DOMAIN_CONTENT } from '@/lib/convictions/content';
import { sendMessage, editMessageReplyMarkup, type InlineKeyboard } from './api';
import { generateWeeklyPlan } from '@/lib/ai/planGeneration';
import { formatTodayPlan } from './formatters';

interface OnboardingState {
  chat_id: number;
  user_id: string;
  step_index: number;
  question_index: number;
  data: OnboardingData;
  message_id: number | null;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function startOnboarding(
  chatId: number,
  userId: string,
  supabase: AppSupabaseClient,
): Promise<void> {
  const data = INITIAL_ONBOARDING_DATA;

  await supabase.from('telegram_onboarding_state').upsert({
    chat_id: chatId,
    user_id: userId,
    step_index: 0,
    question_index: 0,
    data,
    message_id: null,
  }, { onConflict: 'chat_id' });

  const state: OnboardingState = {
    chat_id: chatId,
    user_id: userId,
    step_index: 0,
    question_index: 0,
    data,
    message_id: null,
  };

  await advanceOnboarding(state, supabase);
}

// ─── Callback handler (inline keyboard taps) ────────────────────────────────

export async function handleOnboardingCallback(
  chatId: number,
  callbackData: string,
  supabase: AppSupabaseClient,
): Promise<void> {
  const state = await loadState(chatId, supabase);
  if (!state) return;

  const step = ONBOARDING_STEPS[state.step_index];
  if (!step || step.type !== 'questions') return;

  const question = step.questions[state.question_index];
  if (!question) return;

  const parts = callbackData.split(':');

  if (parts[1] === 'select' && question.kind === 'single_select') {
    const value = parts.slice(3).join(':');
    let parsed: unknown = value;
    if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    else if (/^\d+$/.test(value)) parsed = Number(value);

    state.data = setQuestionValue(state.data, question.id, parsed);

    const isLastQuestion = state.question_index >= step.questions.length - 1;
    if (isLastQuestion) {
      state.step_index++;
      state.question_index = 0;
    } else {
      state.question_index++;
    }
    state.message_id = null;
    await saveState(state, supabase);
    await advanceOnboarding(state, supabase);
  }

  if (parts[1] === 'toggle' && question.kind === 'multi_select') {
    const value = parts.slice(3).join(':');
    const current = getMultiSelectValue(state.data, question.id);
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    state.data = setQuestionValue(state.data, question.id, updated);
    await saveState(state, supabase);

    if (state.message_id) {
      const keyboard = buildMultiSelectKeyboard(question.id, question.options, updated, question.noneLabel);
      await editMessageReplyMarkup(chatId, state.message_id, { inline_keyboard: keyboard });
    }
  }

  if (parts[1] === 'done' && question.kind === 'multi_select') {
    const isLastQuestion = state.question_index >= step.questions.length - 1;
    if (isLastQuestion) {
      state.step_index++;
      state.question_index = 0;
    } else {
      state.question_index++;
    }
    state.message_id = null;
    await saveState(state, supabase);
    await advanceOnboarding(state, supabase);
  }
}

// ─── Text handler (for number inputs like age/weight) ────────────────────────

export async function handleOnboardingText(
  chatId: number,
  text: string,
  supabase: AppSupabaseClient,
): Promise<void> {
  const state = await loadState(chatId, supabase);
  if (!state) return;

  const step = ONBOARDING_STEPS[state.step_index];
  if (!step || step.type !== 'basics') return;

  const field = step.fields[state.question_index];
  if (!field) return;

  const num = Number(text.trim());
  if (isNaN(num)) {
    await sendMessage(chatId, `Please enter a number.`);
    return;
  }

  state.data = setFieldValue(state.data, field.id, text.trim());

  const isLastField = state.question_index >= step.fields.length - 1;
  if (isLastField) {
    state.step_index++;
    state.question_index = 0;
  } else {
    state.question_index++;
  }
  state.message_id = null;
  await saveState(state, supabase);
  await advanceOnboarding(state, supabase);
}

// ─── Core advance loop ──────────────────────────────────────────────────────

async function advanceOnboarding(
  state: OnboardingState,
  supabase: AppSupabaseClient,
): Promise<void> {
  while (state.step_index < ONBOARDING_STEPS.length) {
    const step = ONBOARDING_STEPS[state.step_index];

    if (step.type === 'welcome') {
      await sendMessage(state.chat_id, `${step.title}\n\n${step.body}`);
      state.step_index++;
      await saveState(state, supabase);
      continue;
    }

    if (step.type === 'methodology') {
      state.step_index++;
      await saveState(state, supabase);
      continue;
    }

    if (step.type === 'questions') {
      await sendQuestion(state, step, supabase);
      return;
    }

    if (step.type === 'basics') {
      await sendBasicsPrompt(state, step);
      return;
    }

    if (step.type === 'build') {
      await handleBuild(state, supabase);
      return;
    }

    state.step_index++;
  }
}

// ─── Step renderers ──────────────────────────────────────────────────────────

async function sendQuestion(
  state: OnboardingState,
  step: Extract<OnboardingStep, { type: 'questions' }>,
  supabase: AppSupabaseClient,
): Promise<void> {
  const question = step.questions[state.question_index];
  if (!question) return;

  let prefix = '';
  if (state.question_index === 0) {
    const content = DOMAIN_CONTENT[step.domain];
    if (content) {
      prefix = `${content.title} -- ${content.weeklyTargetSummary}\n\n`;
    }
  }

  const text = `${prefix}${question.label}`;

  if (question.kind === 'single_select') {
    const keyboard: InlineKeyboard = question.options.map((opt) => [
      { text: opt.label, callback_data: `ob:select:${question.id}:${opt.value}` },
    ]);
    await sendMessage(state.chat_id, text, { reply_markup: { inline_keyboard: keyboard } });
  }

  if (question.kind === 'multi_select') {
    const current = getMultiSelectValue(state.data, question.id);
    const keyboard = buildMultiSelectKeyboard(question.id, question.options, current, question.noneLabel);
    const res = await sendMessage(state.chat_id, text, { reply_markup: { inline_keyboard: keyboard } });
    if (res.ok && res.result) {
      state.message_id = (res.result as { message_id: number }).message_id;
      await saveState(state, supabase);
    }
  }
}

async function sendBasicsPrompt(
  state: OnboardingState,
  step: Extract<OnboardingStep, { type: 'basics' }>,
): Promise<void> {
  const field = step.fields[state.question_index];
  if (!field) return;

  const hint = field.hint ? `\n${field.hint}` : '';
  await sendMessage(state.chat_id, `${field.label}?${hint}\n(${field.placeholder})`);
}

async function handleBuild(
  state: OnboardingState,
  supabase: AppSupabaseClient,
): Promise<void> {
  await sendMessage(state.chat_id, 'Building your personalized weekly plan...\nThis takes about 15-30 seconds.');

  const { data } = state;
  const domainBaselines = {
    cardio: data.cardio,
    strength: data.strength,
    nutrition: data.nutrition,
    sleep: data.sleep,
    mindfulness: data.mindfulness,
  };

  const profileUpdate: Record<string, unknown> = {
    domain_baselines: domainBaselines,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
    constraints: {
      schedule: { blockedTimes: [], preferredWorkoutTimes: [] },
      equipment: {
        gymAccess: data.strength.setup.includes('gym'),
        homeEquipment: [],
        outdoorAccess: true,
      },
      limitations: { injuries: [], medical: [] },
    },
  };
  if (data.age) profileUpdate.age = Number(data.age);
  if (data.weightKg) profileUpdate.weight_kg = Number(data.weightKg);

  await supabase
    .from('user_profiles')
    .update(profileUpdate)
    .eq('id', state.user_id);

  const result = await generateWeeklyPlan(state.user_id, supabase);

  await supabase
    .from('telegram_onboarding_state')
    .delete()
    .eq('chat_id', state.chat_id);

  if (result.success) {
    const { createTools } = await import('@/lib/ai/tools');
    const tools = createTools(state.user_id, supabase);
    type ToolExec = { execute: (args: Record<string, unknown>, opts: Record<string, unknown>) => Promise<unknown> };
    const todayData = await (tools.show_today_plan as unknown as ToolExec).execute({}, { toolCallId: 'onboard', messages: [], abortSignal: new AbortController().signal });
    const messages = formatTodayPlan(todayData as Record<string, unknown>);
    await sendMessage(state.chat_id, 'Your plan is ready!');
    for (const msg of messages) {
      await sendMessage(state.chat_id, msg.text, { reply_markup: msg.replyMarkup });
    }
  } else {
    await sendMessage(state.chat_id, `Plan generated, but had an issue: ${result.error ?? 'unknown'}. Send me a message and I'll sort it out.`);
  }
}

// ─── State persistence ───────────────────────────────────────────────────────

async function loadState(chatId: number, supabase: AppSupabaseClient): Promise<OnboardingState | null> {
  const { data } = await supabase
    .from('telegram_onboarding_state')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (!data) return null;
  return {
    chat_id: data.chat_id,
    user_id: data.user_id,
    step_index: data.step_index,
    question_index: data.question_index,
    data: data.data as OnboardingData,
    message_id: data.message_id,
  };
}

async function saveState(state: OnboardingState, supabase: AppSupabaseClient): Promise<void> {
  await supabase
    .from('telegram_onboarding_state')
    .update({
      step_index: state.step_index,
      question_index: state.question_index,
      data: state.data as unknown as Record<string, unknown>,
      message_id: state.message_id,
    })
    .eq('chat_id', state.chat_id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMultiSelectValue(data: OnboardingData, questionId: string): string[] {
  const [domain, field] = questionId.split('.') as [keyof OnboardingData, string];
  const domainData = data[domain];
  if (typeof domainData === 'object' && domainData !== null && field in (domainData as unknown as Record<string, unknown>)) {
    const val = (domainData as unknown as Record<string, unknown>)[field];
    return Array.isArray(val) ? val as string[] : [];
  }
  return [];
}

function buildMultiSelectKeyboard(
  questionId: string,
  options: Array<{ value: string; label: string }>,
  selected: string[],
  noneLabel?: string,
): InlineKeyboard {
  const keyboard: InlineKeyboard = options.map((opt) => {
    const isSelected = selected.includes(opt.value);
    return [{ text: `${isSelected ? '✓ ' : ''}${opt.label}`, callback_data: `ob:toggle:${questionId}:${opt.value}` }];
  });

  if (noneLabel) {
    const noneSelected = selected.length === 0;
    keyboard.push([{ text: `${noneSelected ? '✓ ' : ''}${noneLabel}`, callback_data: `ob:toggle:${questionId}:__none__` }]);
  }

  keyboard.push([{ text: 'Done ✓', callback_data: `ob:done:${questionId}` }]);
  return keyboard;
}

export async function isInOnboarding(chatId: number, supabase: AppSupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('telegram_onboarding_state')
    .select('chat_id')
    .eq('chat_id', chatId)
    .maybeSingle();
  return data !== null;
}
