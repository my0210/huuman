import SwiftUI

struct MealPhoto: Identifiable {
    let id: String
    let imageUrl: String
    let description: String?
    let estimatedCalories: Int?
    let estimatedProteinG: Int?
    let mealType: String?
    let capturedAt: String
}

@Observable
@MainActor
final class MealLogViewModel {
    var meals: [MealPhoto] = []
    var loading = true

    var grouped: [(date: String, meals: [MealPhoto])] {
        let dict = Dictionary(grouping: meals) { $0.capturedAt }
        return dict.sorted { $0.key > $1.key }.map { (date: $0.key, meals: $0.value) }
    }

    func load() async {
        do {
            let data = try await APIClient.shared.get("/api/meal-photos")
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let arr = json["photos"] as? [[String: Any]] {
                meals = arr.compactMap { dict in
                    guard let id = dict["id"] as? String,
                          let url = dict["imageUrl"] as? String,
                          let capturedAt = dict["capturedAt"] as? String else { return nil }
                    return MealPhoto(
                        id: id,
                        imageUrl: url,
                        description: dict["description"] as? String,
                        estimatedCalories: dict["estimatedCalories"] as? Int,
                        estimatedProteinG: dict["estimatedProteinG"] as? Int,
                        mealType: dict["mealType"] as? String,
                        capturedAt: capturedAt
                    )
                }
            }
        } catch {
            // Silent
        }
        loading = false
    }

    func deleteMeal(_ id: String) async {
        do {
            _ = try await APIClient.shared.delete("/api/meal-photos", body: ["id": id])
            meals.removeAll { $0.id == id }
        } catch {
            // Silent
        }
    }
}

struct MealLogView: View {
    @State private var vm = MealLogViewModel()
    @State private var selectedMeal: MealPhoto?

    var body: some View {
        Group {
            if vm.loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if vm.meals.isEmpty {
                ContentUnavailableView {
                    Label("No meal photos", systemImage: "fork.knife")
                } description: {
                    Text("Meal photos detected in chat are saved here automatically")
                }
            } else {
                List {
                    ForEach(vm.grouped, id: \.date) { group in
                        Section {
                            ForEach(group.meals) { meal in
                                MealRow(meal: meal)
                                    .contentShape(Rectangle())
                                    .onTapGesture { selectedMeal = meal }
                            }
                        } header: {
                            Text(formatSectionDate(group.date))
                                .foregroundStyle(Color.textTertiary)
                        }
                        .listRowBackground(Color.surfaceRaised)
                    }
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .background(Color.surfaceBase)
        .navigationTitle("Meal Log")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .sheet(item: $selectedMeal) { meal in
            MealDetail(meal: meal) {
                Task { await vm.deleteMeal(meal.id) }
                selectedMeal = nil
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.surfaceOverlay)
        }
    }

    private func formatSectionDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: iso) else { return iso }
        let display = DateFormatter()
        display.dateStyle = .medium
        return display.string(from: date)
    }
}

private struct MealRow: View {
    let meal: MealPhoto

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: meal.imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    Color.surfaceElevated
                        .overlay {
                            Image(systemName: "photo")
                                .font(.caption)
                                .foregroundStyle(Color.textMuted)
                        }
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(meal.description ?? "Meal photo")
                    .font(.subheadline)
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(2)

                HStack(spacing: 12) {
                    if let cal = meal.estimatedCalories {
                        HStack(spacing: 2) {
                            Image(systemName: "flame")
                                .font(.caption2)
                            Text("~\(cal) cal")
                        }
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                    }
                    if let protein = meal.estimatedProteinG {
                        HStack(spacing: 2) {
                            Text("P")
                                .fontWeight(.semibold)
                            Text("~\(protein)g")
                        }
                        .font(.caption)
                        .foregroundStyle(Color.domainNutrition)
                    }
                    if let type = meal.mealType {
                        Text(type.capitalized)
                            .font(.caption2)
                            .foregroundStyle(Color.textMuted)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.surfaceElevated)
                            .clipShape(Capsule())
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

private struct MealDetail: View {
    let meal: MealPhoto
    let onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    AsyncImage(url: URL(string: meal.imageUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        default:
                            Color.surfaceRaised
                                .frame(height: 300)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay { ProgressView().tint(Color.textMuted) }
                        }
                    }

                    if let desc = meal.description, !desc.isEmpty {
                        Text(desc)
                            .font(.body)
                            .foregroundStyle(Color.textPrimary)
                            .lineSpacing(4)
                    }

                    HStack(spacing: 16) {
                        if let cal = meal.estimatedCalories {
                            VStack(spacing: 4) {
                                Text("~\(cal)")
                                    .font(.title3)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(Color.textPrimary)
                                Text("calories")
                                    .font(.caption)
                                    .foregroundStyle(Color.textTertiary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(16)
                            .background(Color.surfaceRaised)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        if let protein = meal.estimatedProteinG {
                            VStack(spacing: 4) {
                                Text("~\(protein)g")
                                    .font(.title3)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(Color.domainNutrition)
                                Text("protein")
                                    .font(.caption)
                                    .foregroundStyle(Color.textTertiary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(16)
                            .background(Color.surfaceRaised)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    HStack(spacing: 16) {
                        if let type = meal.mealType {
                            Label(type.capitalized, systemImage: "fork.knife")
                                .font(.subheadline)
                                .foregroundStyle(Color.textSecondary)
                        }

                        Label(meal.capturedAt, systemImage: "calendar")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                .padding(16)
            }
            .background(Color.surfaceBase)
            .navigationTitle("Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(Color.semanticError)
                    }
                }
            }
            .alert("Delete meal photo?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { onDelete() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This cannot be undone.")
            }
        }
    }
}
