import SwiftUI

@main
struct huumanApp: App {
    @State private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .preferredColorScheme(.dark)
        }
    }
}
