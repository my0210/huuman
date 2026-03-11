# huuman Architecture

AI longevity coach that generates weekly health plans and helps users execute them. The plan contains **sessions** (cardio, strength, mindfulness) that users execute, plus **tracking briefs** -- personalized nutrition/sleep targets generated once per week and tracked daily.

> **Note:** Telegram bot integration has been archived to `_telegram_archive/`. The codebase is currently web-only.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind 4
- Supabase (PostgreSQL + Auth + RLS)
- Claude Sonnet 4.6 via Vercel AI SDK v6 (ToolLoopAgent)
- Deployed on Vercel, DB on Supabase (West EU)

## Core Architecture

```
┌─────────────┐
│   Web App   │
│ (streaming) │
└──────┬──────┘
       │
  cookie-based
  Supabase client
       │
┌──────┴──────────────┐
│     Shared Core     │
│                     │
│  createCoachAgent() │  lib/ai/agent.ts
│  createTools()      │  lib/ai/tools.ts (20 tools)
│  generateWeeklyPlan │  lib/ai/planGeneration.ts
│  loadUserProfile()  │  lib/core/user.ts
│  chat store funcs   │  lib/chat/store.ts
│  conviction rules   │  lib/convictions/
│  onboarding steps   │  lib/onboarding/steps.ts
│                     │
└──────┬──────────────┘
       │
┌──────┴──────┐
│  Supabase   │
│  (RLS)      │
└─────────────┘
```

## Key Design Decisions

### Client-agnostic core
Every shared function accepts a `supabase: AppSupabaseClient` parameter instead of creating its own client. Web routes pass the cookie-based client (from `lib/supabase/server.ts`).

### Supabase clients (3 types)
- `lib/supabase/server.ts` -- cookie-based, used by web routes. RLS via session.
- `lib/supabase/client.ts` -- browser-side, used by React components.
- `lib/supabase/admin.ts` -- service-role key, bypasses RLS. Used for admin operations.

### Conviction system
`lib/convictions/*.ts` define non-negotiable rules per domain (Zone 2 min 45 min, 3 strength sessions/week, etc.). These are:
- All 5 domains injected into the system prompt (coach conversational knowledge)
- Session domains (cardio/strength/mindfulness) used in plan generation prompts
- Tracking domains (nutrition/sleep) used in tracking briefs generation
- `validatePlan()` validates cardio/strength session rules

### AI agent
`ToolLoopAgent` with `stepCountIs(10)` stop condition. The agent has 24 tools across three phases (gather context, take action, verify). Tools return JSON, `MessagePart.tsx` maps toolName -> React card component.

Tool results persist across turns: `convertToModelUIMessages` in `lib/chat/store.ts` passes completed tool parts back to the SDK so the model retains cross-turn memory. A workaround for Anthropic compatibility sets `providerExecuted=true` on historical tool parts (see `.cursor/rules/ai-sdk-tool-history.mdc` and vercel/ai #11855).

### AI harnessing philosophy
How we build with AI. Derived from Anthropic's [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) and [Claude Code's architecture](https://code.claude.com/docs/en/how-claude-code-works). These principles govern every AI-related change.

1. **Model controls the loop.** The model decides which tools to call, in what order, with what arguments, and when to stop. The application provides tools and a stop condition (`stepCountIs(10)`), but does not script sequences. Only allowed overrides: step cap (safety), context management (token limits), and `generate_plan` as a macro tool (latency).
2. **Three-phase agentic loop -- gather context, take action, verify results.** Every tool maps to a phase. When adding new capabilities, classify them. The model cycles through phases using tools, with each result feeding back into reasoning.
3. **Tools are how the model thinks, not just how it acts.** Read tools enable intelligent coaching -- without `get_sessions` the model cannot check progressive overload, without `get_habits` it cannot spot sleep trends. New data surfaces should be exposed as tools, not pre-loaded into the system prompt.
4. **Tool results persist across turns.** Tool parts are stored in message history and reconstructed for the model. The model accumulates understanding across the conversation -- no amnesia between turns.
5. **Intent over scripting.** The system prompt tells the model *what* to achieve, not *how* to sequence tools. The model's reasoning determines the sequence. Prescriptive tool rules only exist where the model consistently gets something wrong.
6. **Primitive tools, not macro tools.** Each tool does one thing. Tools are composable -- the model chains them. The one exception is `generate_plan` (4 parallel LLM calls for latency). Do not add new macro tools without a compelling reason.

### Onboarding state machine
`lib/onboarding/steps.ts` defines 14 steps as pure data (no React). Includes 5 domain methodology/baseline pairs, a "Good to know" step (injuries + home equipment), basics (age/weight), and build. Rendered by `app/(onboarding)/onboarding/page.tsx` as cards/buttons/inputs.

## Database Schema (Supabase)

11 tables, all with RLS:
- `user_profiles` -- id (FK auth.users), email, age, weight, domain_baselines, goals, constraints (legacy), onboarding_completed, timezone (IANA, default 'UTC')
- `user_context` -- user_id, category (physical/environment/equipment/schedule), content (text), scope (permanent/temporary), expires_at, active, source (onboarding/conversation). Categorized, time-scoped facts about the user that drive plan personalization.
- `weekly_plans` -- user_id, week_start, status, intro_message, tracking_briefs (JSONB: personalized nutrition/sleep targets). Unique on (user_id, week_start).
- `planned_sessions` -- plan_id (nullable), user_id, domain (cardio/strength/mindfulness), scheduled_date, title, status, detail (JSONB), completed_detail, is_extra (bool). Extra sessions (logged outside the plan) have is_extra=true and may have plan_id=null.
- `daily_habits` -- user_id, date, steps, nutrition, sleep. Unique on (user_id, date).
- `conversations` -- user_id, created_at
- `messages` -- conversation_id, role, parts (JSONB), attachments
- `user_feedback` -- user_id, category (bug/feature_request/experience), content (AI summary), raw_quotes (text[], user's exact words), conversation_id (FK conversations). Collected via save_feedback tool or Feedback shortcut in CommandMenu.
- `progress_photos` -- user_id, image_url, ai_analysis (text), notes, captured_at (date), conversation_id. AI-detected body composition selfies from chat, saved via save_progress_photo tool. Calorie/protein estimates are approximate (~).
- `meal_photos` -- user_id, image_url, description, estimated_calories, estimated_protein_g, meal_type, captured_at, conversation_id. AI-detected meal photos from chat, saved via save_meal_photo tool.
- `weight_entries` -- user_id, date, weight_kg. One entry per day per user. Latest entry syncs back to user_profiles.weight_kg. Logged via log_weight tool or Your Data page.

## File Map

### API Routes
- `POST /api/chat` -- web chat (streaming via createAgentUIStreamResponse)
- `POST /api/plan/generate` -- generate weekly plan
- `PUT /api/profile` -- update user profile
- `GET/DELETE /api/progress-photos` -- CRUD for body composition progress photos (Your Data page)
- `GET/DELETE /api/meal-photos` -- CRUD for meal photos (Your Data page)
- `GET/POST/DELETE /api/weight-entries` -- CRUD for weight timeline entries (Your Data page)

### Middleware (`proxy.ts`)
Redirects unauthenticated requests to `/login`. Public routes: login, signup, auth callbacks, cron endpoints.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- public Supabase
- `SUPABASE_SERVICE_ROLE_KEY` -- admin access (server only)
- `SUPABASE_JWT_SECRET` -- legacy HS256 secret (not used for signing, project uses ECC P-256)
- `ANTHROPIC_API_KEY` -- Claude API
- `NEXT_PUBLIC_SITE_URL` -- production URL for redirects
- `CRON_SECRET` -- Vercel Cron authentication (server only, set automatically by Vercel)

### Testing
- `npm run test:schema` -- validates JSON schema for Anthropic compatibility
- `npm run test:plan` -- real API call, generates plan, validates output
- `npm run test:all` -- runs all tests
- `npm run test:e2e` -- Playwright E2E tests
