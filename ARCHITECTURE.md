# huuman Architecture

AI longevity coach that generates weekly health plans and helps users execute them. Two clients: web app and Telegram bot, sharing the same core. The plan contains **sessions** (cardio, strength, mindfulness) that users execute, plus **tracking briefs** -- personalized nutrition/sleep targets generated once per week and tracked daily.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4
- Supabase (PostgreSQL + Auth + RLS)
- Claude Sonnet 4.6 via Vercel AI SDK v6 (ToolLoopAgent)
- Telegram Bot API (custom webhook, no library)
- Deployed on Vercel, DB on Supabase (West EU)

## Core Architecture

```
┌─────────────┐     ┌─────────────┐
│   Web App   │     │ Telegram Bot│
│ (streaming) │     │ (webhook)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
  cookie-based       scoped client
  Supabase client    (generateLink+verifyOtp)
       │                   │
       └────────┬──────────┘
                │
    ┌───────────┴───────────┐
    │     Shared Core       │
    │                       │
    │  createCoachAgent()   │  lib/ai/agent.ts
    │  createTools()        │  lib/ai/tools.ts (10 tools)
    │  generateWeeklyPlan() │  lib/ai/planGeneration.ts
    │  loadUserProfile()    │  lib/core/user.ts
    │  chat store functions │  lib/chat/store.ts
    │  conviction rules     │  lib/convictions/
    │  onboarding steps     │  lib/onboarding/steps.ts
    │                       │
    └───────────┬───────────┘
                │
         ┌──────┴──────┐
         │  Supabase   │
         │  (RLS)      │
         └─────────────┘
```

## Key Design Decisions

### Client-agnostic core
Every shared function accepts a `supabase: AppSupabaseClient` parameter instead of creating its own client. This allows:
- Web routes: pass the cookie-based client (from `lib/supabase/server.ts`)
- Telegram webhook: pass a user-scoped client (from `lib/supabase/scoped.ts`)

### Supabase clients (4 types)
- `lib/supabase/server.ts` -- cookie-based, used by web routes. RLS via session.
- `lib/supabase/client.ts` -- browser-side, used by React components.
- `lib/supabase/admin.ts` -- service-role key, bypasses RLS. Used ONLY for: Telegram chat_id lookups, user creation, token management.
- `lib/supabase/scoped.ts` -- creates a real authenticated session for a Telegram user via `generateLink` + `verifyOtp`. RLS enforced. Used for all Telegram data access.

### Telegram auth flow
No shadow users. Every Telegram user registers with a real email:
1. `/start` -> bot sends URL button to `/auth/register?token=xxx`
2. User enters email -> `signInWithOtp` sends magic link
3. User clicks magic link -> `/auth/telegram-callback` links chat_id to profile
4. Redirect back to Telegram

Bidirectional linking:
- Web -> TG: Settings modal generates a link code, user sends `/start CODE` to bot
- TG -> Web: user has a real email, logs in via magic link at huuman.vercel.app

### Conviction system
`lib/convictions/*.ts` define non-negotiable rules per domain (Zone 2 min 45 min, 3 strength sessions/week, etc.). These are:
- All 5 domains injected into the system prompt (coach conversational knowledge)
- Session domains (cardio/strength/mindfulness) used in plan generation prompts
- Tracking domains (nutrition/sleep) used in tracking briefs generation
- `validatePlan()` validates cardio/strength session rules

### AI agent
`ToolLoopAgent` with `stepCountIs(5)` stop condition. The agent has 11 tools that render interactive UI:
- Web: tools return JSON, `MessagePart.tsx` maps toolName -> React card component
- Telegram: tools return JSON, `formatters.ts` maps toolName -> text + inline keyboards

### Onboarding state machine
`lib/onboarding/steps.ts` defines 14 steps as pure data (no React). Includes 5 domain methodology/baseline pairs, a "Good to know" step (injuries + home equipment), basics (age/weight), and build. Two renderers:
- Web: `app/(onboarding)/onboarding/page.tsx` renders as cards/buttons/inputs
- Telegram: `lib/telegram/onboarding.ts` renders as messages + inline keyboards

## Database Schema (Supabase)

7 tables, all with RLS:
- `user_profiles` -- id (FK auth.users), email, age, weight, domain_baselines, goals, constraints (legacy), onboarding_completed, telegram_chat_id
- `user_context` -- user_id, category (physical/environment/equipment/schedule), content (text), scope (permanent/temporary), expires_at, active, source (onboarding/conversation). Categorized, time-scoped facts about the user that drive plan personalization.
- `weekly_plans` -- user_id, week_start, status, intro_message, tracking_briefs (JSONB: personalized nutrition/sleep targets). Unique on (user_id, week_start).
- `planned_sessions` -- plan_id (nullable), user_id, domain (cardio/strength/mindfulness), scheduled_date, title, status, detail (JSONB), completed_detail, is_extra (bool). Extra sessions (logged outside the plan) have is_extra=true and may have plan_id=null.
- `daily_habits` -- user_id, date, steps, nutrition, sleep. Unique on (user_id, date).
- `conversations` -- user_id, created_at
- `messages` -- conversation_id, role, parts (JSONB), attachments

Telegram-specific tables (no RLS, accessed via admin client):
- `telegram_registration_tokens` -- token, telegram_chat_id, user_id, expires_at
- `telegram_link_codes` -- code, user_id, expires_at
- `telegram_onboarding_state` -- chat_id, user_id, step_index, question_index, data, message_id

## File Map

### API Routes
- `POST /api/chat` -- web chat (streaming via createAgentUIStreamResponse)
- `POST /api/plan/generate` -- generate weekly plan
- `PUT /api/profile` -- update user profile
- `POST /api/telegram/webhook` -- Telegram bot webhook (maxDuration: 60s)
- `POST /api/telegram/link` -- generate web->TG link code
- `POST /api/telegram/setup` -- register/delete webhook URL + register bot commands via setMyCommands
- `POST /api/auth/telegram-register` -- create user + send magic link
- `POST /api/auth/telegram-complete` -- link chat_id after magic link confirmation
- `GET /api/cron/daily-briefing` -- morning briefing (7 AM UTC, Vercel Cron). Sends today's plan to all Telegram users with pending sessions.
- `GET /api/cron/session-nudge` -- missed session nudge (6 PM UTC). Sends reminders for pending sessions with Done/Skip/→ Tomorrow buttons.
- `GET /api/cron/evening-checkin` -- evening check-in (9 PM UTC). Prompts for nutrition and steps via inline keyboards.

### Middleware (`proxy.ts`)
Redirects unauthenticated requests to `/login`. Public routes: login, signup, auth callbacks, all Telegram endpoints, registration pages, cron endpoints.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- public Supabase
- `SUPABASE_SERVICE_ROLE_KEY` -- admin access (server only)
- `SUPABASE_JWT_SECRET` -- legacy HS256 secret (not used for signing, project uses ECC P-256)
- `ANTHROPIC_API_KEY` -- Claude API
- `TELEGRAM_BOT_TOKEN` -- bot at t.me/huuman_life_bot (server only)
- `TELEGRAM_WEBHOOK_SECRET` -- webhook verification (server only)
- `NEXT_PUBLIC_SITE_URL` -- production URL for redirects
- `CRON_SECRET` -- Vercel Cron authentication (server only, set automatically by Vercel)

### Telegram Webhook Flow
1. Verify `X-Telegram-Bot-Api-Secret-Token` header (timingSafeEqual)
2. Process synchronously (Vercel serverless, no background work)
3. For messages: resolve chat_id -> user_id via admin client, then create user-scoped client for all data ops
4. For callback queries: route `ob:*` to onboarding, `act:*` to session actions (including `act:tomorrow` for reschedule), `checkin:*` to daily habit logging, `cmd:*` to quick commands
5. Agent invocation: `agent.generate({ messages, timeout: 55s })`, format tool results, send via Bot API
6. Per-user concurrency lock prevents parallel agent calls
7. Typing indicator refreshed every 4s during agent calls (Telegram expires it after ~5s)

### Telegram Bot Commands
Registered via `setMyCommands` during setup. Available in Telegram's menu button:
- `/today` -- show today's sessions
- `/week` -- weekly plan overview
- `/progress` -- this week's progress
- `/log` -- instant habit logging (`/log 8500` steps, `/log sleep 7.5`, `/log nutrition on|off`). Bypasses AI agent for zero latency.
- `/web` -- login instructions for web dashboard

### Telegram Message Formatting
All messages use `parse_mode: 'HTML'` (defaulted in `sendMessage`). Formatters in `lib/telegram/formatters.ts` use `<b>`, `<i>` for visual hierarchy and `escapeHtml()` for user/AI content safety.

### Telegram Onboarding
Methodology steps (previously skipped) now send a condensed domain intro with icon, title, weekly target, and philosophy before each domain's questions. Progress indicator `(1/5)` through `(5/5)` shows position. Welcome message uses the coach persona.

### Proactive Engagement (Vercel Cron)
Three cron jobs in `vercel.json` drive proactive outreach to Telegram users:
- **Morning briefing** (7 AM UTC): today's plan with action buttons
- **Session nudge** (6 PM UTC): reminders for pending sessions with Done/Skip/→ Tomorrow
- **Evening check-in** (9 PM UTC): nutrition on/off-plan buttons + step quick-tap buttons

### Testing
- `npm run test:schema` -- validates JSON schema for Anthropic compatibility
- `npm run test:plan` -- real API call, generates plan, validates output
- `npm run test:all` -- runs all tests
- `npm run test:e2e` -- Playwright E2E tests
