# Feedback Brief: Feature Request

| Field | Value |
|-------|-------|
| **ID** | `25e0eec5-4791-4652-8e62-a3e6f363956e` |
| **Category** | Feature Request |
| **Status** | new |
| **Reported by** | josh_cor@yahoo.de |
| **Date** | 2026-03-04 |

---

## Problem / Request

User wants to be able to tap into individual sessions in the weekly plan view and see the full exercise detail — sets, reps, weights, instructions — not just the session title and domain.

## User's Exact Words

> "I want to able to access the actual exercises in my weekly plan"

---

## Codebase Context

This is the **huuman** codebase — an AI longevity coach (Next.js 16, Supabase, Claude via Vercel AI SDK).
Start by reading `ARCHITECTURE.md` at the repo root.

## Analysis

### Current State

The `WeekPlanCard` component (`components/cards/WeekPlanCard.tsx`) displays the weekly plan with:
- A day strip showing Mon-Sun with colored dots per session domain
- A list of sessions for the selected day, showing only **title** and **domain dot**
- No ability to tap/expand sessions to see details

The `Session` interface in `WeekPlanCard` lacks the `detail` field:

```typescript
interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  day_of_week: number;
  scheduled_date: string;
  is_extra?: boolean;
  // Missing: detail: Record<string, unknown>;
}
```

### Existing Infrastructure

**The functionality already exists in `TodayPlanCard`** (`components/cards/TodayPlanCard.tsx`):
- Sessions are tappable buttons that expand/collapse with animation
- Expanded view shows full exercise details using `SessionDetailInline`
- Includes "Start" and "Ask coach" action buttons

**The data is already available:**
- The `show_week_plan` tool in `lib/ai/tools.ts` fetches sessions with `select('*')`, which includes the `detail` JSONB field
- The `detail` field contains domain-specific data:
  - **Strength**: exercises array (name, sets, reps, weight, rest, cues), warm-up, cool-down, focus
  - **Cardio**: zone, duration, activity type, target HR, warm-up, cool-down, pacing cues
  - **Mindfulness**: type, duration, guided flag, instructions

**Existing detail rendering components:**
- `components/session/StrengthDetail.tsx` — renders exercises table with sets/reps/weights
- `components/session/CardioDetail.tsx` — renders zone, duration, HR targets
- `components/session/MindfulnessDetail.tsx` — renders type, duration, instructions
- `components/cards/SessionDetailCard.tsx` — exports `SessionDetailInline` wrapper that routes to domain-specific components

### Why This Matters

Currently, users must either:
1. Use `TodayPlanCard` (only shows today's sessions)
2. Ask the AI to "show me my [session name] session" to trigger `show_session` tool

The user wants to browse their whole week and tap any session directly — a natural UX expectation.

---

## Proposed Solution

### Approach

Enhance `WeekPlanCard` to support expandable session rows, reusing the existing `SessionDetailInline` component from `TodayPlanCard`. This is a surgical change that leverages existing infrastructure.

### Changes Required

#### 1. Update `Session` interface in `WeekPlanCard.tsx`

Add the `detail` field:

```typescript
interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  day_of_week: number;
  scheduled_date: string;
  is_extra?: boolean;
  detail: Record<string, unknown>;  // Add this
}
```

#### 2. Add required imports

```typescript
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, MessageCircle } from "lucide-react";
import { SessionDetailInline } from "./SessionDetailCard";
import { useChatSend } from "@/components/chat/ChatActions";
```

#### 3. Extract session rendering into a `SessionRow` component

Create an expandable `SessionRow` component (can be adapted from `TodayPlanCard`):

```typescript
function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const send = useChatSend();
  const isCompleted = session.status === "completed";

  return (
    <div>
      <button
        onClick={() => !isCompleted && setExpanded(!expanded)}
        disabled={isCompleted}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          isCompleted ? "opacity-60 cursor-default" : "hover:bg-zinc-800/30"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${domainDot[session.domain]}`} />
        <span className={`text-sm flex-1 ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
          {session.title}
          {session.is_extra && (
            <span className="ml-1.5 text-[10px] font-medium text-zinc-600 bg-zinc-800 rounded px-1 py-px">Extra</span>
          )}
        </span>
        {!isCompleted && (
          <ChevronDown size={12} className={`text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
        {isCompleted && <Check size={12} className="text-emerald-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              <SessionDetailInline domain={session.domain} detail={session.detail} />
              {send && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => send({ text: `Let's do my ${session.title} session` })}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    <Play size={10} /> Start
                  </button>
                  <button
                    onClick={() => send({ text: `Tell me more about my ${session.title} session` })}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-300"
                  >
                    <MessageCircle size={10} /> Ask coach
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

#### 4. Update the session list rendering

Replace the static session rows with the new `SessionRow` component:

```typescript
{filteredSessions.map((s) => (
  <SessionRow key={s.id} session={s} />
))}
```

### Trade-offs & Edge Cases

| Consideration | Decision |
|---------------|----------|
| **Bundle size** | `framer-motion` is already used in `TodayPlanCard`, so no additional dependency |
| **Empty detail** | `SessionDetailInline` handles missing/malformed detail gracefully |
| **Completed sessions** | Keep them non-expandable (same as `TodayPlanCard`) — users rarely need to review completed session details |
| **Mobile tap targets** | Current row height (py-2.5) may be slightly small; consider increasing to py-3 for better touch UX |
| **Multiple expanded** | Allow multiple sessions expanded simultaneously (simpler state, matches user expectation) |

### Testing

After implementation:
1. Run `npm run test:render` to verify session detail components handle real AI output
2. Manual test: Generate a plan, open week view, tap sessions across different domains
3. Verify completed sessions show checkmark but don't expand
4. Test on mobile viewport for tap target sizing

---

## Files Involved

- **Modify:** `components/cards/WeekPlanCard.tsx` — add expandable session rows with detail view
- **No changes needed:**
  - `lib/ai/tools.ts` — already fetches full session data with `select('*')`
  - `components/cards/SessionDetailCard.tsx` — already exports `SessionDetailInline`
  - `components/session/*.tsx` — existing detail components work as-is
