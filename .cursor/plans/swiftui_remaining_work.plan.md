---
name: SwiftUI Remaining Work
overview: Everything left to complete the SwiftUI migration and ship to TestFlight. Foundation (auth, streaming, chat, cards) is built. This covers remaining features.
todos:
  - id: swift-onboarding-flow
    content: Build 13-step onboarding SwiftUI flow with step data, questions, methodology cards, and plan generation
    status: completed
  - id: swift-onboarding-check
    content: Add onboarding_completed check in RootView to route new users to onboarding
    status: completed
  - id: swift-photo-pages
    content: Build ProgressPhotosView (photo grid + upload + detail) and MealLogView (grouped list + upload + detail)
    status: completed
  - id: swift-camera
    content: Wire up camera/photo picker in chat InputBar using PhotosUI, upload to Supabase storage
    status: completed
  - id: swift-pagination
    content: Add scroll-to-top message history pagination
    status: completed
  - id: swift-app-icon
    content: Add app icon (1024x1024), configure launch screen
    status: completed
  - id: swift-testflight
    content: Code signing, archive, TestFlight upload
    status: pending
  - id: swift-cleanup
    content: Remove debug print statements, clean up warnings
    status: completed
isProject: false
---

# SwiftUI -- Remaining Work

## Current State (what works)

- Xcode project at `/ios-app` with Supabase Swift SDK
- Auth: login, signup, session persistence, auth state routing
- SSE stream parser: connects to `/api/chat`, parses all Vercel AI SDK data stream protocol event types
- Chat: messages load from Supabase DB, new messages stream in real-time with text rendering
- 14 tool-result card components translated to SwiftUI
- Profile sheet: sign out, redo onboarding, reset everything, data navigation
- Data view: profile info, context items loaded from API
- All API routes support Bearer token auth (server.ts handles both cookies and Bearer)
- Middleware passes Bearer requests through without redirect

## What is left

### 1. Onboarding Flow

The 13-step onboarding needs a SwiftUI implementation. Step definitions live in `lib/onboarding/steps.ts`.

Options for step data:

- (a) Duplicate step definitions in Swift (simpler, steps rarely change)
- (b) Create a `/api/onboarding/steps` endpoint that returns them as JSON

Step types to handle:

- `welcome` -- logo + tagline
- `name` -- text input
- `methodology` -- domain card with icon, philosophy text, principles list
- `questions` -- multi-select options, single-select options, boolean toggles, number inputs
- `basics` -- age + weight number inputs
- `build` -- calls `PUT /api/profile` then `POST /api/plan/generate`, shows loading

Navigation: back/next buttons, progress bar at top. After build: redirect to ChatView.

Key reference files:

- `app/(onboarding)/onboarding/page.tsx` -- the React renderer
- `lib/onboarding/steps.ts` -- step definitions (ONBOARDING_STEPS, question types)
- `lib/onboarding/formatBaselines.ts` -- how baselines are formatted for the API

### 2. Onboarding Check in RootView

`ContentView.swift` currently shows ChatView when authenticated. It needs to:

- Query `user_profiles` for `onboarding_completed`
- If false, show OnboardingView instead of ChatView
- After onboarding completes, transition to ChatView

### 3. Data Sub-Pages

`DataView.swift` exists but sub-pages are placeholder `Text()` views:

**Progress Photos:**

- Photo grid using `LazyVGrid` with 2-3 columns
- Upload button using `PhotosUI` picker
- Detail sheet showing full image + AI analysis text
- Date editing, delete functionality
- API: `GET/POST/DELETE /api/progress-photos`

**Meal Log:**

- Grouped list by date using `Section` headers
- Each row: thumbnail, description, macros (cal/protein)
- Upload with meal type selection
- Detail sheet with full image + edit meal type
- API: `GET/POST/DELETE /api/meal-photos`

### 4. Image Upload in Chat

The camera button in `InputBar.swift` has `onCamera: { /* TODO: camera */ }`. Needs:

- `PhotosUI.PhotosPicker` or `UIImagePickerController` for camera access
- Compress image (like `lib/images.ts` compressImage)
- Upload to Supabase storage bucket `chat-images`
- Include as file part in the chat message body sent to `/api/chat`

### 5. Message History Pagination

Currently loads last 50 messages in `ChatViewModel.loadChat()`. Needs:

- Detect scroll to top
- Fetch older messages from Supabase with cursor-based pagination
- Prepend to messages array without losing scroll position

### 6. App Icon + Launch Screen

- 1024x1024 app icon (the Capacitor project has one at `ios/App/App/Assets.xcassets/AppIcon.appiconset/huuman-app-icon-1024.png`)
- Copy to `ios-app/huuman/Assets.xcassets/AppIcon.appiconset/`
- Launch screen: dark background (#111114) with "huuman" text centered

### 7. TestFlight Submission

- Verify bundle ID is `life.huuman.app` in project settings
- Set up code signing with Apple Developer account
- Product > Archive in Xcode
- Upload to App Store Connect
- Distribute via TestFlight

### 8. Cleanup

- Remove all `print("[ChatService]...")` and `print("[ChatViewModel]...")` debug statements
- Fix remaining Xcode warnings (unused variables, deprecations)
- Remove the `http` unused variable warning in ChatService.swift

## Key Files Reference


| File                                              | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `ios-app/huuman/huumanApp.swift`                  | App entry point, AuthManager init          |
| `ios-app/huuman/ContentView.swift`                | Root routing (auth state -> login or chat) |
| `ios-app/huuman/Services/SupabaseClient.swift`    | Supabase client config                     |
| `ios-app/huuman/Services/AuthManager.swift`       | Auth state management                      |
| `ios-app/huuman/Services/ChatService.swift`       | SSE stream parser for /api/chat            |
| `ios-app/huuman/Services/APIClient.swift`         | REST API calls with Bearer auth            |
| `ios-app/huuman/Models/Message.swift`             | ChatMessage, MessagePart types             |
| `ios-app/huuman/Models/StreamEvent.swift`         | SSE event enum                             |
| `ios-app/huuman/Views/Chat/ChatView.swift`        | Main chat screen                           |
| `ios-app/huuman/Views/Chat/ChatViewModel.swift`   | Chat state, message loading, send logic    |
| `ios-app/huuman/Views/Chat/InputBar.swift`        | Chat input bar                             |
| `ios-app/huuman/Views/Chat/MessageBubble.swift`   | Message rendering + part routing           |
| `ios-app/huuman/Views/Chat/ToolResultView.swift`  | Tool name -> card component switch         |
| `ios-app/huuman/Views/Cards/*.swift`              | 8 card component files                     |
| `ios-app/huuman/Views/Profile/ProfileSheet.swift` | Settings sheet                             |
| `ios-app/huuman/Views/Data/DataView.swift`        | Your Data page                             |
| `ios-app/huuman/Theme/Colors.swift`               | Design tokens                              |


## Backend Changes Already Made

These are deployed on Vercel and should not be reverted:

- `lib/supabase/server.ts` -- checks Authorization Bearer header before cookies
- `proxy.ts` -- passes API requests with Bearer tokens through without redirect
- `lib/supabase/from-token.ts` and `lib/supabase/from-request.ts` -- exist but are now redundant (server.ts handles it)

