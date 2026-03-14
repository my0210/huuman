---
name: SwiftUI Pixel-Perfect Redesign
overview: Make the SwiftUI app look and feel like a premium native iOS app (ChatGPT-quality). Covers typography, spacing, colors, animations, and every view.
todos:
  - id: redesign-theme
    content: Refine Colors.swift and create Typography.swift with proper iOS Dynamic Type, SF Pro usage, and spacing constants
    status: completed
  - id: redesign-chat
    content: Redesign ChatView -- proper message spacing, bubble shapes, timestamp styling, scroll behavior, empty state
    status: completed
  - id: redesign-input
    content: Redesign InputBar -- exact ChatGPT pill shape, proper padding, camera/send button transitions, keyboard animation
    status: completed
  - id: redesign-cards
    content: Redesign all tool-result cards with consistent padding, corner radii, domain color usage, and typography hierarchy
    status: completed
  - id: redesign-header
    content: Redesign chat header -- proper toolbar height, avatar sizing, title weight, button hit areas
    status: completed
  - id: redesign-profile
    content: Redesign ProfileSheet -- avatar with photo, name editing, proper List section spacing, icon alignment
    status: completed
  - id: redesign-auth
    content: Redesign login/signup -- centered layout, proper input field styling, button states, transitions
    status: completed
  - id: redesign-animations
    content: Add proper animations -- message appear (fade+slide), card expand, sheet present, thinking indicator, send button state
    status: completed
isProject: false
---

# SwiftUI Pixel-Perfect Redesign

Reference app: ChatGPT iOS (dark mode). The goal is a premium, minimal, native iOS app that feels like Apple designed it.

## Design Principles

1. **Use SF Pro** -- the system font. Don't fight iOS typography. Use Dynamic Type sizes.
2. **Respect iOS spacing** -- 16pt horizontal padding, 8pt/12pt/16pt vertical rhythm. Use system list insets.
3. **Minimal chrome** -- no borders on cards unless needed for domain differentiation. Use subtle background color changes instead.
4. **Motion** -- every state change should animate. Messages fade in, cards expand, buttons scale on tap.
5. **Dark palette** -- the current Colors.swift tokens are good. The issue is inconsistent application, not wrong colors.

## Screen-by-Screen Redesign

### Chat Screen

**Header (IonToolbar equivalent):**

- Standard iOS navigation bar height (44pt)
- Avatar: 28pt circle, left-aligned
- Title: "huuman" in `.headline` weight, centered
- Data icon: SF Symbol `chart.bar`, right-aligned, 22pt
- No custom backgrounds -- use `.toolbarBackground(.visible)` with `.surfaceBase`

**Messages area:**

- Padding: 16pt horizontal, 12pt vertical between messages
- User bubbles: `.surfaceRaised` background, 18pt corner radius, bottom-right corner 6pt. Max width 80%.
- Assistant text: no background, left-aligned, `Color.textSecondary`, `.subheadline` size
- Timestamps: centered, `.caption2`, `Color.textMuted`, only shown when >5min gap
- Day separators: centered, `.caption`, `Color.textMuted`, "Today" / "Yesterday" / "Mon, Mar 10"
- New message animation: `.transition(.opacity.combined(with: .move(edge: .bottom)))`
- Thinking indicator: 3 pulsing circles, 6pt each, `Color.surfaceElevated`

**Input bar:**

- Fixed to bottom via `.safeAreaInset(edge: .bottom)`
- Pill shape: 44pt height, full corner radius (22pt), `Color.surfaceRaised` fill, `Color.borderDefault` stroke
- Inside pill: 12pt left padding, `TextField` expanding vertically (1-5 lines), camera button right
- Plus button: 36pt circle, `Color.surfaceElevated`, outside pill left
- Send button: 36pt circle, outside pill right. White when active, `Color.surfaceElevated` when disabled. `arrow.up` symbol, 16pt bold.
- All buttons: `.sensoryFeedback(.impact(weight: .light))` on tap
- Keyboard: use `scrollDismissesKeyboard(.interactively)` on ScrollView

**Command menu:**

- Present as `.sheet` with `.presentationDetents([.height(220)])` 
- 3x2 grid of buttons, each 44pt height
- Icons: SF Symbols in 36pt circles, `Color.surfaceElevated` background
- Labels: `.caption2`, `Color.textTertiary`

### Tool Result Cards

**Consistent card frame:**

```swift
.padding(14)
.frame(maxWidth: .infinity, alignment: .leading)
.background(Color.surfaceRaised)
.cornerRadius(14)
```

No `.overlay(RoundedRectangle.stroke())` -- remove all border strokes. Use background color differences for visual separation. Only add borders for domain-specific cards (e.g., session detail with domain color accent).

**Typography hierarchy within cards:**

- Section label: `.caption`, `.semibold`, `Color.textMuted`, `.uppercase`, tracking 0.5
- Primary text: `.subheadline`, `.medium`, `Color.textPrimary`
- Secondary text: `.caption`, `Color.textSecondary`
- Data values: `.subheadline`, `.semibold`, `Color.textPrimary`, `.monospacedDigit()`

**Domain color usage:**

- Small domain indicator: 8pt circle with domain color
- Domain text labels: `.caption2` with domain color
- Domain card backgrounds: use `domainMutedColor` only for session detail cards
- Domain icons: SF Symbols (heart.fill, dumbbell.fill, brain.head.profile, flame.fill, moon.fill)

**Specific card fixes:**

- TodayPlanCard: remove outer border. Use dividers between sessions. Domain icon in 30pt rounded square.
- WeekPlanCard: group by day with `.caption` day headers. Compact session rows.
- ProgressRingsCard: proper circular progress using `Circle().trim()`. 48pt rings. Domain colors.
- CoachSessionCard: success accent left border (3pt). Green tint background.
- SessionDetailCard: domain muted background. Exercise list with set x rep x weight.

### Login / Signup

- Centered vertically with `.frame(maxHeight: .infinity)`
- "huuman" in `.title`, `.bold`
- Subtitle in `.subheadline`, `Color.textMuted`
- Inputs: use native `TextField` with `.textFieldStyle(.plain)`, custom rounded background
- Button: full width, 50pt height, `Color.textPrimary` background, `Color.surfaceBase` text, 14pt corner radius
- Loading state: `ProgressView()` replacing button text
- Error: `.caption`, `Color.semanticError`
- "No account? Sign up" link at bottom, `.caption`, `Color.textSecondary`

### Profile Sheet

- Present with `.presentationDetents([.medium, .large])`
- Use native `List` with `.listStyle(.insetGrouped)` -- this gives perfect iOS Settings appearance
- Avatar: 56pt circle, camera badge overlay
- Name: editable `TextField` below avatar
- Menu items: `Label("Title", systemImage: "icon.name")` inside `NavigationLink` or `Button`
- Section grouping: settings / danger zone / sign out (3 sections)
- Destructive actions: `.alert` confirmation before executing

### Data View

- Native `List` with `.listStyle(.insetGrouped)`
- `LabeledContent("Email", value: "...")` for profile rows
- `NavigationLink` for sub-pages with system chevrons
- Section headers: automatic via `Section("Title") { }`

## Animation Specifications


| Element                     | Animation                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| New message appear          | `.transition(.opacity.combined(with: .move(edge: .bottom)))` with `.animation(.easeOut(duration: 0.2))` |
| Send button active/inactive | `.animation(.easeOut(duration: 0.15), value: canSend)`                                                  |
| Thinking dots               | `.repeatForever()` pulse with 0.15s stagger                                                             |
| Sheet present               | System default (`.sheet` handles this)                                                                  |
| Card content expand         | `.animation(.easeInOut(duration: 0.2))` on `withAnimation`                                              |
| Toolbar button tap          | `.sensoryFeedback(.impact(weight: .light), trigger: tapCount)`                                          |


## What NOT to change

- The SSE streaming architecture (ChatService, ChatViewModel) -- working correctly
- The Supabase auth flow -- working correctly
- The API client and Bearer token handling -- working correctly
- The data models (Message.swift, StreamEvent.swift) -- correct
- The backend API routes -- working correctly

