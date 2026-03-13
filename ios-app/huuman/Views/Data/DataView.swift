import SwiftUI

struct DataView: View {
    @State private var profile: [String: Any]?
    @State private var contextItems: [[String: Any]] = []
    @State private var loading = true
    @State private var loadError = false

    var body: some View {
        Group {
            if loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if loadError {
                ContentUnavailableView {
                    Label("Couldn't load data", systemImage: "wifi.exclamationmark")
                } description: {
                    Text("Check your connection and try again")
                } actions: {
                    Button("Retry") {
                        loading = true
                        loadError = false
                        Task { await loadData() }
                    }
                }
            } else {
                List {
                    if let profile {
                        Section("Profile") {
                            if let email = profile["email"] as? String {
                                LabeledContent("Email", value: email)
                            }
                            if let age = profile["age"] as? Int {
                                LabeledContent("Age", value: "\(age)")
                            }
                        }
                        .listRowBackground(Color.surfaceRaised)
                    }

                    Section("Tracking") {
                        NavigationLink {
                            ProgressPhotosView()
                        } label: {
                            Label("Progress Photos", systemImage: "camera")
                        }

                        NavigationLink {
                            MealLogView()
                        } label: {
                            Label("Meal Log", systemImage: "fork.knife")
                        }
                    }
                    .listRowBackground(Color.surfaceRaised)

                    if !contextItems.isEmpty {
                        Section("What the coach knows") {
                            ForEach(Array(contextItems.enumerated()), id: \.offset) { _, item in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item["content"] as? String ?? "")
                                        .font(.subheadline)
                                        .foregroundStyle(Color.textPrimary)
                                    HStack(spacing: 8) {
                                        Text(item["category"] as? String ?? "")
                                            .font(.caption2)
                                            .foregroundStyle(Color.textMuted)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.surfaceElevated, in: RoundedRectangle(cornerRadius: 4))
                                        Text(item["source"] as? String ?? "")
                                            .font(.caption2)
                                            .foregroundStyle(Color.textMuted)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.surfaceElevated, in: RoundedRectangle(cornerRadius: 4))
                                    }
                                }
                                .padding(.vertical, 2)
                            }
                        }
                        .listRowBackground(Color.surfaceRaised)
                    }
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .background(Color.surfaceBase)
        .navigationTitle("Your Data")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadData() }
    }

    private func loadData() async {
        do {
            let data = try await APIClient.shared.get("/api/context")
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                profile = json["profile"] as? [String: Any]
                contextItems = json["contextItems"] as? [[String: Any]] ?? []
            }
            loadError = false
        } catch {
            loadError = true
        }
        loading = false
    }
}
