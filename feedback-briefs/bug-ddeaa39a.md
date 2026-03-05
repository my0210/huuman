# Feedback Brief: Bug Report

| Field | Value |
|-------|-------|
| **ID** | `ddeaa39a-3473-4336-a7eb-08ce1c52f310` |
| **Category** | Bug Report |
| **Status** | new |
| **Reported by** | yilmaz.ym@gmail.com |
| **Date** | 2026-03-04 |

---

## Problem / Request

Language switch from German to English is not applied immediately — the first coach response after switching remains in the previous language. From the second response onwards it switches correctly.

## User's Exact Words

> "Ich habe die Sprache von Deutsch auf Englisch geändert aber es ist nichts passiert"

> "Nur die erste Antwort war noch auf Deutsch. Ab der zweiten Antwort war die Antwort dann Englisch"

---

## Codebase Context

This is the **huuman** codebase — an AI longevity coach (Next.js 16, Supabase, Claude via Vercel AI SDK).
Start by reading `ARCHITECTURE.md` at the repo root.

## Analysis

### Root Cause

The bug is an **asymmetric language instruction** in the system prompt generation. The code only adds an explicit language instruction when the language is NOT English.

In `lib/ai/prompts.ts`, line 15-17:

```typescript
const languageBlock = language && language !== 'en' && language !== 'en-GB'
  ? `\n\n## LANGUAGE\n\nThe user's preferred language is "${language}". You MUST respond in this language...`
  : '';
```

The same pattern exists in `getWelcomeBackPrompt()` at line 356-358:

```typescript
const languageInstruction = context.language && context.language !== 'en' && context.language !== 'en-GB'
  ? ` Respond in ${context.language}.`
  : '';
```

**Why this causes the bug:**

1. User has been chatting in German → conversation history is in German
2. User switches language to English in settings
3. Cookie is updated to `lang=en`, page reloads
4. `/api/chat` creates the agent with `language='en'`
5. System prompt is generated with **no explicit language instruction** (because English is the "default")
6. AI sees: German conversation history + system prompt with no language directive
7. AI follows the conversational pattern and responds in German
8. Second message onwards: AI sees the user's new English message in context and starts responding in English

The bug is **asymmetric**:
- **English → Other language**: Works correctly (explicit instruction "You MUST respond in {language}")
- **Other language → English**: Broken (no instruction, AI follows conversation history pattern)

### Flow Verification

Traced through:
1. `ChatInterface.tsx` line 280-284: `saveLanguage()` sets cookie, then `window.location.reload()`
2. `lib/languages.ts` line 47-49: `saveLanguage()` correctly sets both localStorage and cookie
3. `/api/chat/route.ts` line 37: `getLanguageFromCookies(req.headers.get('cookie'))` correctly reads the new cookie
4. `lib/ai/agent.ts` line 10: `getSystemPrompt(profile, language)` receives the correct language
5. `lib/ai/prompts.ts` line 15-17: **Bug location** — no instruction emitted for English

## Proposed Solution

### Fix 1: Always include explicit language instruction

In `lib/ai/prompts.ts`, modify `getSystemPrompt()` to always include a language directive:

```typescript
// Before (line 15-17):
const languageBlock = language && language !== 'en' && language !== 'en-GB'
  ? `\n\n## LANGUAGE\n\nThe user's preferred language is "${language}". You MUST respond in this language...`
  : '';

// After:
const languageBlock = language && language !== 'en' && language !== 'en-GB'
  ? `\n\n## LANGUAGE\n\nThe user's preferred language is "${language}". You MUST respond in this language. All conversational text, session descriptions, coaching cues, and feedback must be in the user's language. Tool calls (JSON) remain in English for system compatibility, but any text the user reads must be in their language.`
  : `\n\n## LANGUAGE\n\nYou MUST respond in English. If the conversation history contains messages in other languages, that indicates a recent language switch — always use English regardless of prior message languages.`;
```

### Fix 2: Update welcome-back prompt similarly

In `lib/ai/prompts.ts`, modify `getWelcomeBackPrompt()`:

```typescript
// Before (line 356-358):
const languageInstruction = context.language && context.language !== 'en' && context.language !== 'en-GB'
  ? ` Respond in ${context.language}.`
  : '';

// After:
const languageInstruction = context.language && context.language !== 'en' && context.language !== 'en-GB'
  ? ` Respond in ${context.language}.`
  : ' Respond in English.';
```

### Trade-offs

1. **Token cost**: Adds ~30-50 tokens to every system prompt for English users. Negligible cost increase (~0.001 USD per request).

2. **Alternative considered**: Adding a "language switch" marker to the conversation. Rejected because:
   - Requires schema changes
   - More complex to implement
   - System prompt instruction is the standard pattern

3. **Edge case**: Telegram webhook (`lib/telegram/webhook/route.ts` line 310) passes `undefined` as language. This should remain unchanged since Telegram users communicate in their natural language and the bot should adapt.

### Testing

After implementing, test the following scenarios:
1. German → English switch: First response should be in English
2. English → German switch: Should continue to work (regression test)
3. Existing English users: Should see no change in behavior
4. Welcome-back message after language switch: Should respect new language

## Files Involved

- `lib/ai/prompts.ts` — Primary fix location (lines 15-17 and 356-358)
