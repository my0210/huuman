import SwiftUI
import Supabase

struct RootView: View {
    @Environment(AuthManager.self) private var auth
    @State private var checkingOnboarding = true
    @State private var onboardingCompleted = false

    var body: some View {
        Group {
            if auth.isLoading {
                splashView
            } else if auth.isAuthenticated {
                if checkingOnboarding {
                    splashView
                        .task { await checkOnboarding() }
                } else if !onboardingCompleted {
                    OnboardingView {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            onboardingCompleted = true
                        }
                    }
                } else {
                    ChatView()
                }
            } else {
                NavigationStack {
                    LoginView()
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.2), value: auth.isLoading)
        .onChange(of: auth.isAuthenticated) { _, isAuth in
            if isAuth {
                checkingOnboarding = true
                onboardingCompleted = false
                Task { await checkOnboarding() }
            }
        }
        .onChange(of: auth.onboardingRecheckNeeded) { _, needed in
            if needed {
                auth.onboardingRecheckNeeded = false
                checkingOnboarding = true
                onboardingCompleted = false
                Task { await checkOnboarding() }
            }
        }
    }

    private var splashView: some View {
        ZStack {
            Color.surfaceBase.ignoresSafeArea()
            VStack(spacing: 12) {
                Text("h")
                    .font(.largeTitle.weight(.bold))
                    .fontDesign(.rounded)
                    .foregroundStyle(Color.textPrimary)
                ProgressView()
                    .tint(Color.textMuted)
            }
        }
    }

    private func checkOnboarding() async {
        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            struct ProfileRow: Decodable {
                let onboarding_completed: Bool?
            }

            let profiles: [ProfileRow] = try await supabase
                .from("user_profiles")
                .select("onboarding_completed")
                .eq("id", value: userId)
                .limit(1)
                .execute()
                .value

            onboardingCompleted = profiles.first?.onboarding_completed ?? false
        } catch {
            onboardingCompleted = false
        }
        checkingOnboarding = false
    }
}
