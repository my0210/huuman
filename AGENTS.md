# Agent Instructions

Read this file before making changes. It is the single source of truth for agent behavior across all tools (Cursor, Claude Code, Copilot, Windsurf, etc.). For full system architecture, see `ARCHITECTURE.md`.

---

## Rules

Critical rules summarized from the detailed Cursor `.mdc` files. Cursor agents get the full versions automatically; non-Cursor agents should follow these.

### Stack versions -- verify before you code

Your training data is likely outdated. **Verify API usage against current docs** before writing framework code.

| Framework | Version | Docs |
|---|---|---|
| SwiftUI | iOS 26 / Xcode 26 | https://developer.apple.com/documentation/swiftui |
| Supabase JS | 2.97.x | https://supabase.com/docs |
| Next.js | 16.1.x | https://nextjs.org/docs |
| React | 19.2.x | https://react.dev |
| Tailwind CSS | 4.x | https://tailwindcss.com/docs |
| Vercel AI SDK | 6.x (`ai` package) | https://sdk.vercel.ai/docs |
| Zod | 4.x | https://zod.dev |

1. **Search before you write.** If unsure about an API, web-search `[framework] [API name] 2026` first.
2. **Check for breaking changes.** Next.js 16, React 19, Tailwind 4, AI SDK 6, Zod 4 all had major breaking changes. Do not assume previous-version patterns still apply.
3. **Apple platforms move fast.** SwiftUI APIs change every WWDC. Always verify modifier names, view types, and availability annotations against current Apple docs.

### Anti-patterns (NEVER do these)

1. Never use `confirm()`, `alert()`, or `window.location.reload()` in the web app.
2. Never create touch targets below 44px (Apple HIG).
3. Never import framer-motion for press feedback -- use CSS `active:` + `transition`.
4. Never name custom AI tools `web_search`, `code_execution`, `web_fetch`, or `text_editor` -- these collide with Anthropic built-ins.
5. Never strip tool parts from message history -- the model needs cross-turn tool memory.

### iOS 26 interactive standards

The iOS app targets iOS 26 and uses Liquid Glass APIs. Follow these principles:

1. **Every tappable glass element must use `.interactive()`** -- Apply `.glassEffect(.regular.interactive(), in: shape)` to buttons, input bars, and FABs. This gives system touch feedback (shimmer, scale, illumination) matching iMessage and system controls. Never build custom press animations for glass elements.
2. **Prefer `.glassEffect()` over custom backgrounds for interactive surfaces** -- Instead of manual `.background(color, in: shape).overlay(shape.stroke(...))`, use `.glassEffect(in: shape)`. One modifier replaces background + border + material + adaptive shadows.
3. **Use system-adaptive spacing everywhere** -- `.padding(.vertical)` (no value), `.scenePadding(.horizontal)`, `safeAreaBar(edge:)` with default spacing. The system adapts per device, Dynamic Type, and context. Only use explicit values from the 8pt grid when the system default is proven insufficient.
4. **Use `.contentShape()` + `.onTapGesture` for expanded hit areas** -- TextField padding doesn't forward taps by default. Add `.contentShape(.capsule)` and `.onTapGesture { isFocused = true }` to make the entire glass surface tappable.
5. **Height matching via shared APIs, not hardcoded values** -- When two glass elements must match height, use the same glass API (`.glassEffect(in: .capsule)`) on both, with height from `AppLayout.buttonMinHeight` (44pt HIG constant). Don't hardcode pixel heights.

### Design quality (non-negotiable)

This is a B2C premium product. Every screen ships pixel-perfect or not at all.

1. **Always verify visually.** After any UI change, use XcodeBuildMCP to build, launch, and screenshot the affected screen. Never assume SwiftUI renders what you expect.
2. **Benchmark against the best.** Compare every screen against top apps. For chat UX: ChatGPT, Claude, Apple Intelligence, WhatsApp, Instagram, iMessage. For health/fitness: Whoop, Oura, Strava, Headspace, Apple Health. Web-search for current designs. We don't use Figma -- market benchmarks and iOS best practices are the source of truth.
3. **8pt grid.** All spacing should be multiples of 8 (4 is acceptable for tight internal padding).
4. **44px touch targets.** Every interactive element, no exceptions (Apple HIG).
5. **Typography hierarchy.** Every screen should be scannable in 2 seconds. If a user has to think about where to look, the hierarchy is broken.
6. **Warm, not clinical.** huuman is a caring coach, not a hospital dashboard. Soft glows, breathing room, never cramped.

### iOS native app

The iOS app lives in `ios-app/` with the Xcode project at `ios-app/huuman.xcodeproj`. Key services:
- `Services/SupabaseClient.swift` -- Supabase connection
- `Services/AuthManager.swift` -- auth state
- `Services/APIClient.swift` -- API calls to the Next.js backend
- `Services/ChatService.swift` -- streaming chat
- `Theme/Colors.swift`, `Theme/Layout.swift` -- design tokens

### Roles

Inspired by [gstack](https://github.com/garrytan/gstack). When the user invokes a role command, adopt that persona fully.

- **Product Review** (`/Review-Product`): Think like a founder. Rethink the request from the user's POV. What is the 10-star version? Challenge assumptions, find the real product hiding inside the literal request.
- **Engineering Review** (`/Review-Eng`): Think like a tech lead. Lock in architecture, data flow, edge cases, failure modes, test plan. Produce diagrams. Make the idea buildable.
- **Code Review** (`/Review-Code`): Think like a paranoid staff engineer. Hunt for bugs that pass CI but blow up in production: race conditions, trust boundaries, N+1 queries, missing error handling, stale reads.
- **Design Review** (`/Review-Design`): Think like a premium product designer. Build and screenshot the app via XcodeBuildMCP, research how top health/fitness apps (Whoop, Oura, Strava, Headspace) handle the same screen, audit against iOS standards and market benchmarks, rate and fix. "Close enough" is not enough.
- **Ship** (`/Push`): Think like a release engineer. Build, test, verify, commit, push. No more talking -- land the plane.

---

## Learnings

Persistent memory of mistakes, patterns, and hard-won knowledge from past agent sessions. When the user says "store this in learnings", "add this to memory", or similar, append the lesson to the appropriate category below using the format: `- **Short title** -- Explanation. (date)`

### Build & Tooling

### Supabase & Database

### AI SDK & Agent Loop

### UI & Components

- **Prefer platform-standard components over custom implementations** -- Use built-in / well-established components (e.g. SwiftUI `NavigationStack`, standard UIKit bars, shadcn primitives) instead of building custom replacements. Custom components accumulate maintenance debt and subtle bugs that eat hours to fix or reverse. Only customize when the standard component genuinely cannot achieve the design. The SwiftUI top bar is a cautionary example: a custom nav bar required repeated fixes and was eventually reverted to the standard one. (2026-03-14)
- **glassEffect .interactive() eats button taps** -- `.glassEffect(.regular.interactive(), in: shape)` adds its own gesture recognizer that competes with `Button` actions and `TextField` focus. Only use `.interactive()` on non-button views where the glass IS the interaction (e.g. decorative surfaces). For buttons, use `.glassEffect(.regular, in: shape)` without `.interactive()`. Similarly, never add `.onTapGesture` to a parent HStack that contains Buttons or TextFields -- it steals their taps. (2026-03-14)
- **Use system interactive features, never hardcode micro-interactions** -- iOS 26 provides `.glassEffect(.regular.interactive(), in: shape)` for touch-responsive glass on any tappable element (buttons, input bars, FABs). Use it on every interactive glass surface. For spacing and padding, prefer system defaults (`.padding(.vertical)`, `scenePadding(.horizontal)`, `safeAreaBar(edge:)` with nil spacing) over hardcoded pt values. For scroll behavior, prefer instant `scrollTo` for streaming content and short animations (0.12s) for discrete events. The system adapts per device, Dynamic Type, and context -- hardcoded values don't. (2026-03-14)

### iOS & Xcode

- **Scroll to bottom before screenshotting chat** -- When verifying the composer bar or bottom of the chat via XcodeBuildMCP, always tap the scroll-to-bottom FAB (or swipe repeatedly) and then verify via `snapshot_ui` that the last message's AX frame is on-screen (positive y, within screen height) before taking the screenshot. A single swipe rarely reaches the bottom of a long conversation. Never assume you're at the bottom without checking. (2026-03-14)
- **Always disable hardware keyboard in simulator before testing** -- Run `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool NO` then restart the simulator (`xcrun simctl shutdown <ID> && xcrun simctl boot <ID>`) before launching the app. Without this, the software keyboard never appears and you cannot test keyboard-related behavior (composer bar, scroll on keyboard open, keyboard dismiss). Do this ONCE at the start of every session that involves chat UI work. (2026-03-14)
- **Simulator sign-in via clipboard paste** -- The `type_text` MCP tool sends HID keycodes that get remapped by the host keyboard layout (e.g. QWERTZ), garbling special characters like `+` and `@`. Instead: (1) use `printf "text" | xcrun simctl pbcopy <SIMULATOR_ID>` to copy to the simulator clipboard (use `printf`, not `<<<`, to avoid trailing newline), (2) tap the text field, (3) long-press to trigger the Paste menu, (4) tap "Paste" by label. Repeat for each field. Credentials are in `.env.local` as `TEST_EMAIL` and `TEST_PASSWORD`. The bundleId is `life.huuman.native`. Set it via `session_set_defaults` before using `stop_app_sim`/`launch_app_sim`. (2026-03-14)

### Testing

### Git & Workflow

### General Patterns

- **Agents use outdated APIs and docs by default** -- LLM training data lags months behind. Agents confidently use deprecated APIs, removed SwiftUI modifiers, old Next.js patterns, and stale SDK methods. Always verify API usage against current documentation via web search or @docs before writing code that touches framework APIs. When in doubt, search first. (2026-03-14)
