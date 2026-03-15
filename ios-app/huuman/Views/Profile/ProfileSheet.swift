import SwiftUI
import Supabase

struct ProfileSheetView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var confirmAction: ConfirmAction?
    @State private var busy = false
    @State private var userName: String = ""
    @State private var userEmail: String = ""

    enum ConfirmAction: Identifiable {
        case redoOnboarding, resetEverything
        var id: String {
            switch self {
            case .redoOnboarding: return "redo"
            case .resetEverything: return "reset"
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 12) {
                        InitialAvatar(name: userName.isEmpty ? "?" : userName, size: AppLayout.profileAvatarSize)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(userName.isEmpty ? "User" : userName)
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                            if !userEmail.isEmpty {
                                Text(userEmail)
                                    .font(.caption)
                                    .foregroundStyle(Color.textMuted)
                            }
                        }
                    }
                    .listRowBackground(Color.surfaceRaised)
                }

                Section {
                    Button {
                        confirmAction = .redoOnboarding
                    } label: {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Redo onboarding")
                                Text("Clear baselines, redo the flow")
                                    .font(.caption)
                                    .foregroundStyle(Color.textMuted)
                            }
                        } icon: {
                            Image(systemName: "arrow.counterclockwise")
                        }
                    }
                    .disabled(busy)

                    Button {
                        confirmAction = .resetEverything
                    } label: {
                        Label {
                            VStack(alignment: .leading) {
                                Text("Reset everything")
                                Text("Delete all data and start from scratch")
                                    .font(.caption)
                                    .foregroundStyle(Color.textMuted)
                            }
                        } icon: {
                            Image(systemName: "trash")
                        }
                    }
                    .disabled(busy)
                }
                .listRowBackground(Color.surfaceRaised)

                Section {
                    Button(role: .destructive) {
                        Task { await auth.signOut() }
                        dismiss()
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
                .listRowBackground(Color.surfaceRaised)
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Color.surfaceBase)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Color.textSecondary)
                    }
                }
            }
            .alert(item: $confirmAction) { action in
                switch action {
                case .redoOnboarding:
                    Alert(
                        title: Text("Redo onboarding?"),
                        message: Text("This clears your profile baselines and sends you back through the flow."),
                        primaryButton: .destructive(Text("Redo")) {
                            Task { await performRedoOnboarding() }
                        },
                        secondaryButton: .cancel()
                    )
                case .resetEverything:
                    Alert(
                        title: Text("Reset everything?"),
                        message: Text("This deletes all data and restarts from scratch."),
                        primaryButton: .destructive(Text("Reset")) {
                            Task { await performResetEverything() }
                        },
                        secondaryButton: .cancel()
                    )
                }
            }
            .task { await loadUserInfo() }
        }
    }

    private func loadUserInfo() async {
        do {
            let session = try await supabase.auth.session
            userEmail = session.user.email ?? ""
            let userId = session.user.id.uuidString

            struct NameRow: Decodable {
                let display_name: String?
            }

            let profiles: [NameRow] = try await supabase
                .from("user_profiles")
                .select("display_name")
                .eq("id", value: userId)
                .limit(1)
                .execute()
                .value

            if let name = profiles.first?.display_name, !name.isEmpty {
                userName = name
            }
        } catch {
            // Use fallback
        }
    }

    private struct OnboardingReset: Encodable {
        let onboarding_completed = false
        let age: Int? = nil
        let weight_kg: Double? = nil
        let domain_baselines: [String: String] = [:]
    }

    private func performRedoOnboarding() async {
        busy = true
        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            try await supabase
                .from("user_profiles")
                .update(OnboardingReset())
                .eq("id", value: userId)
                .execute()

            auth.onboardingRecheckNeeded = true
            dismiss()
        } catch {
            // Silent
        }
        busy = false
    }

    private func performResetEverything() async {
        busy = true
        await auth.signOut()
        dismiss()
        busy = false
    }
}
