import Foundation
import Supabase
import Auth

@Observable
@MainActor
final class AuthManager {
    var isAuthenticated = false
    var isLoading = true
    var currentUserId: String?
    var onboardingRecheckNeeded = false

    init() {
        Task {
            await checkSession()
            listenForAuthChanges()
        }
    }

    func checkSession() async {
        do {
            let session = try await supabase.auth.session
            currentUserId = session.user.id.uuidString
            isAuthenticated = true
        } catch {
            isAuthenticated = false
            currentUserId = nil
        }
        isLoading = false
    }

    func signIn(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(email: email, password: password)
        currentUserId = session.user.id.uuidString
        isAuthenticated = true
    }

    func signUp(email: String, password: String) async throws {
        let result = try await supabase.auth.signUp(email: email, password: password)
        if let session = result.session {
            currentUserId = session.user.id.uuidString
            isAuthenticated = true
        }
    }

    func signOut() async {
        try? await supabase.auth.signOut()
        isAuthenticated = false
        currentUserId = nil
    }

    private func listenForAuthChanges() {
        Task {
            for await (event, session) in supabase.auth.authStateChanges {
                switch event {
                case .signedIn:
                    currentUserId = session?.user.id.uuidString
                    isAuthenticated = true
                case .signedOut:
                    currentUserId = nil
                    isAuthenticated = false
                default:
                    break
                }
            }
        }
    }
}
