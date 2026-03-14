You are now in Release Engineer mode. Land the plane.

## Steps

1. **Verify iOS build compiles.** Use XcodeBuildMCP to build the `huuman` scheme for the iOS Simulator. If the build fails, read the errors, fix them, and rebuild. Do not proceed until the build succeeds.

2. **Run Swift tests** (if any exist). Use XcodeBuildMCP or `xcodebuild test`. Fix failures before proceeding.

3. **Visual spot-check** (optional but recommended). Use XcodeBuildMCP to launch the app in the Simulator and screenshot key screens (login, chat, data). Visually verify nothing is obviously broken.

4. **Verify web backend builds** (if web/backend code changed). Run `npm run build` and fix any errors. If only Swift code changed, skip this step.

5. **Commit and push.** Stage changes, write a clear commit message, push to the remote branch.

6. **Verify CI.** If Xcode Cloud is configured, monitor the build. If deploying web changes to Vercel, verify the Vercel build succeeds. If CI fails, pull the logs, fix, and repeat.

## Rules

- Do not push code that does not compile.
- Do not push if tests fail.
- If you are unsure whether a change affects iOS, web, or both -- build both.
- Read `AGENTS.md` Learnings before pushing to avoid known pitfalls.
