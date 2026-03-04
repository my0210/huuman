# Chat Loading States - Problem Analysis & Solution Proposals

## User Feedback

> "When refreshing the chat, I can't move up for a while without seeing why. When you reply, I see a loading/thinking state for a while. But disappears before reply appears. Confusing."

---

## Issue 1: Refresh Scrolling Problem

### Symptoms
- When refreshing the chat page, the user cannot interact for a period
- No visual feedback explains the delay
- Feels like the UI is frozen/unresponsive

### Root Cause

The main page (`app/(main)/page.tsx`) is a server component that blocks on database calls:

```typescript
export default async function MainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user!.id;
  const chatId = await getOrCreateConversation(userId, supabase);  // DB call
  const dbMessages = await loadMessages(chatId, supabase);         // DB call
  const initialMessages = convertToUIMessages(dbMessages);

  return <ChatInterface chatId={chatId} initialMessages={initialMessages} />;
}
```

**There is no `loading.tsx` file** in `app/(main)/`, so during SSR the user sees a blank/frozen screen with no indication that data is loading.

### Proposed Solution

Create `app/(main)/loading.tsx` with a skeleton UI:

```tsx
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      {/* Header skeleton */}
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
        <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
      </header>

      {/* Messages area skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-32 bg-zinc-800 rounded-2xl animate-pulse" />
        </div>
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-52 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="flex-none border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="flex-1 h-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
```

### Trade-offs

| Pros | Cons |
|------|------|
| Immediate visual feedback | Adds a new file |
| Skeleton matches final UI layout | Brief flicker on fast connections |
| Standard Next.js pattern | None significant |

---

## Issue 2: Thinking Indicator Disappears Too Early

### Symptoms
- User sends a message
- Thinking dots (pulsing animation) appear
- Dots disappear before the actual reply is visible
- Confusing gap where nothing is shown

### Root Cause

The thinking indicator in `ChatInterface.tsx` (lines 462-470) uses this condition:

```tsx
{isLoading && messages[messages.length - 1]?.role === "user" && (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse [animation-delay:300ms]" />
    </div>
  </div>
)}
```

**The problem**: The condition checks if the last message is from the user. But when the AI agent starts responding:

1. User sends message → `messages[last].role === "user"` → dots show ✓
2. Agent starts tool call → assistant message added with `tool-invocation` part
3. Now `messages[last].role === "assistant"` → **dots disappear**
4. But tool hasn't completed → no visible content yet → **confusing gap**

The `MessagePart.tsx` component does show a `LoadingCard` for in-progress tools, but there's a timing gap where the assistant message exists but has no rendered content.

### Proposed Solution

Change the condition to check for **visible content**, not just message role.

#### Option A: Check for visible assistant content (Recommended)

```tsx
// Add helper function
const hasVisibleAssistantContent = useCallback(() => {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant") return false;
  
  return lastMsg.parts.some(part => {
    // Text content is visible
    if (part.type === "text" && part.text.trim()) return true;
    
    // Tool output is visible (not just in-progress)
    if (part.type === "tool-invocation") {
      const toolPart = part as { state?: string; output?: unknown };
      return toolPart.state === "output-available" && toolPart.output;
    }
    return false;
  });
}, [messages]);

// Update render condition
{isLoading && !hasVisibleAssistantContent() && (
  // ... thinking dots
)}
```

#### Option B: Use useMemo for cleaner logic

```tsx
const shouldShowThinking = useMemo(() => {
  if (!isLoading) return false;
  
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return true;
  if (lastMsg.role === "user") return true;
  
  // Assistant message exists - check for completed content
  const hasCompletedContent = lastMsg.parts.some(part => {
    if (part.type === "text" && part.text.trim()) return true;
    const toolPart = part as { type: string; state?: string };
    return toolPart.type === "tool-invocation" && toolPart.state === "output-available";
  });
  
  return !hasCompletedContent;
}, [isLoading, messages]);

// Render
{shouldShowThinking && (
  // ... thinking dots
)}
```

### Comparison

| Aspect | Option A | Option B |
|--------|----------|----------|
| Readability | Good | Better (named variable) |
| Performance | useCallback | useMemo (similar) |
| Testability | Easy | Easy |

**Recommendation**: Option B for cleaner, more readable code.

### Trade-offs

| Pros | Cons |
|------|------|
| Eliminates confusing gap | Slightly more complex condition |
| Better UX continuity | Thinking dots may overlap briefly with tool loading cards |
| Handles all response types | None significant |

---

## Additional Improvement: Tool Loading Labels

`MessagePart.tsx` has a `LoadingCard` component with labels for most tools, but some are missing:

```tsx
const labels: Record<string, string> = {
  show_today_plan: "Loading today's plan...",
  show_week_plan: "Loading week plan...",
  // ... existing labels
};
```

**Missing tools:**
- `save_context` → "Saving context..."
- `save_feedback` → "Saving feedback..."  
- `delete_session` → "Removing session..."

These currently fall back to "Working on it..." which is less informative.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(main)/loading.tsx` | **Create** | Skeleton loading UI for page refresh |
| `components/chat/ChatInterface.tsx` | **Modify** | Fix thinking indicator condition (lines ~462-470) |
| `components/chat/MessagePart.tsx` | **Modify** (optional) | Add missing tool loading labels |

---

## Implementation Priority

1. **High**: `loading.tsx` - Quick win, standard pattern
2. **High**: Thinking indicator fix - Core UX issue
3. **Low**: Tool loading labels - Minor polish

---

## Testing Checklist

- [ ] Refresh page → skeleton appears immediately
- [ ] Send message → thinking dots appear
- [ ] Agent calls tool → dots persist until tool card or text appears
- [ ] Agent responds with text only → dots persist until text streams in
- [ ] Multiple tool calls → no confusing gaps between tools
