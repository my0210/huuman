import SwiftUI

struct SignupView: View {
    @Environment(AuthManager.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var loading = false
    @State private var signupTap = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 8) {
                Text("huuman")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)

                Text("Create your account")
                    .font(.subheadline)
                    .foregroundStyle(Color.textMuted)
            }

            VStack(spacing: 16) {
                TextField("Email", text: $email)
                    .textFieldStyle(.plain)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.subheadline)
                    .padding()
                    .frame(minHeight: AppLayout.buttonMinHeight)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
                    .overlay(RoundedRectangle(cornerRadius: AppLayout.cardRadius).stroke(Color.borderDefault))

                SecureField("Password", text: $password)
                    .textFieldStyle(.plain)
                    .textContentType(.newPassword)
                    .font(.subheadline)
                    .padding()
                    .frame(minHeight: AppLayout.buttonMinHeight)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
                    .overlay(RoundedRectangle(cornerRadius: AppLayout.cardRadius).stroke(Color.borderDefault))

                if let error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.semanticError)
                }

                Button {
                    signupTap.toggle()
                    handleSignup()
                } label: {
                    HStack {
                        if loading {
                            ProgressView()
                                .tint(Color.surfaceBase)
                        }
                        Text(loading ? "Creating account..." : "Sign up")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.textPrimary, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
                    .foregroundStyle(Color.surfaceBase)
                }
                .disabled(loading || email.isEmpty || password.count < 6)
                .opacity(email.isEmpty || password.count < 6 ? 0.5 : 1)
                .sensoryFeedback(.impact(weight: .medium), trigger: signupTap)
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .background(Color.surfaceBase)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func handleSignup() {
        loading = true
        error = nil
        Task { @MainActor in
            do {
                try await auth.signUp(email: email, password: password)
            } catch {
                self.error = error.localizedDescription
            }
            loading = false
        }
    }
}
