import SwiftUI

@Observable
@MainActor
final class AboutYouViewModel {
    var data: AboutYouResponse?
    var loading = true
    var loadError = false

    var newContextText = ""
    var addingContext = false

    var weightInput = ""
    var showWeightForm = false
    var addingWeight = false

    func load() async {
        do {
            let raw = try await APIClient.shared.get("/api/about-you")
            let decoder = JSONDecoder()
            data = try decoder.decode(AboutYouResponse.self, from: raw)
            loadError = false
        } catch {
            loadError = true
        }
        loading = false
    }

    func addContext() async {
        let text = newContextText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        addingContext = true
        do {
            let body: [String: Any] = ["content": text]
            _ = try await APIClient.shared.post("/api/context", body: body)
            newContextText = ""
            await load()
        } catch { }
        addingContext = false
    }

    func deleteContext(id: String) async {
        let backup = data?.myNotes
        data?.myNotes.removeAll { $0.id == id }
        do {
            _ = try await APIClient.shared.delete("/api/context", body: ["id": id])
        } catch {
            data?.myNotes = backup ?? []
        }
    }

    func addWeight() async {
        let raw = weightInput.replacingOccurrences(of: ",", with: ".")
        guard let kg = Double(raw), kg >= 20, kg <= 300 else { return }
        addingWeight = true
        let today = ISO8601DateFormatter.string(from: Date(), timeZone: .current, formatOptions: [.withFullDate])
        do {
            _ = try await APIClient.shared.post("/api/weight-entries", body: ["weightKg": kg, "date": String(today.prefix(10))])
            weightInput = ""
            showWeightForm = false
            await load()
        } catch { }
        addingWeight = false
    }
}

struct DataView: View {
    @Environment(AuthManager.self) private var auth
    @State private var vm = AboutYouViewModel()
    @State private var showSettings = false

    var body: some View {
        Group {
            if vm.loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if vm.loadError {
                ContentUnavailableView {
                    Label("Couldn't load data", systemImage: "wifi.exclamationmark")
                } description: {
                    Text("Check your connection and try again")
                } actions: {
                    Button("Retry") {
                        vm.loading = true
                        vm.loadError = false
                        Task { await vm.load() }
                    }
                }
            } else if let data = vm.data {
                ScrollView {
                    VStack(spacing: 16) {
                        YourPlanSection(plan: data.yourPlan)
                        MyNotesSection(
                            notes: data.myNotes,
                            newContextText: $vm.newContextText,
                            addingContext: vm.addingContext,
                            onAdd: { Task { await vm.addContext() } },
                            onDelete: { id in Task { await vm.deleteContext(id: id) } }
                        )
                        YourNumbersSection(
                            numbers: data.yourNumbers,
                            weightInput: $vm.weightInput,
                            showWeightForm: $vm.showWeightForm,
                            addingWeight: vm.addingWeight,
                            onAddWeight: { Task { await vm.addWeight() } }
                        )
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 32)
                }
            }
        }
        .background(Color.surfaceBase)
        .navigationTitle("About You")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showSettings = true } label: {
                    Image(systemName: "gearshape")
                        .foregroundStyle(Color.textSecondary)
                }
                .accessibilityLabel("Settings")
            }
        }
        .sheet(isPresented: $showSettings) {
            ProfileSheetView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .environment(auth)
        }
        .task { await vm.load() }
    }
}

// MARK: - Your Plan

private struct YourPlanSection: View {
    let plan: YourPlan

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("YOUR PLAN")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textMuted)
                .tracking(0.5)
                .padding(.bottom, 10)

            VStack(alignment: .leading, spacing: 14) {
                if let rationale = plan.coachRationale {
                    Text(rationale)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("No plan this week yet. Start a conversation and we'll build one together.")
                        .font(.subheadline)
                        .foregroundStyle(Color.textMuted)
                }

                if !plan.sessions.isEmpty {
                    Divider()
                        .background(Color.borderSubtle)

                    ForEach(plan.sessions) { session in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(Color.domainColor(for: session.domain))
                                .frame(width: 10, height: 10)
                            Text(session.title)
                                .font(.subheadline)
                                .foregroundStyle(Color.textPrimary)
                            Spacer()
                            Text(session.dayLabel)
                                .font(.caption2)
                                .foregroundStyle(Color.textMuted)
                            Image(systemName: session.isCompleted ? "checkmark.circle.fill" : "circle")
                                .font(.subheadline)
                                .foregroundStyle(session.isCompleted ? Color.semanticSuccess : Color.textMuted)
                        }
                    }

                    if plan.trackingBriefs != nil || plan.habits.daysTracked > 0 {
                        Divider()
                            .background(Color.borderSubtle)

                        if let sleep = plan.trackingBriefs?.sleep?.targetHours, let avg = plan.habits.avgSleepHours {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(Color.domainSleep)
                                    .frame(width: 6, height: 6)
                                Text("Sleep")
                                    .font(.caption)
                                    .foregroundStyle(Color.textPrimary)
                                Spacer()
                                Text(String(format: "%.1fh / %.0fh", avg, sleep))
                                    .font(.caption)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }

                        if plan.habits.daysTracked > 0 {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(Color.domainNutrition)
                                    .frame(width: 6, height: 6)
                                Text("Nutrition")
                                    .font(.caption)
                                    .foregroundStyle(Color.textPrimary)
                                Spacer()
                                Text("\(plan.habits.nutritionDaysOnPlan) of \(plan.habits.daysTracked) days")
                                    .font(.caption)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }
                    }
                }
            }
            .padding(AppLayout.cardPadding)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
    }
}

// MARK: - My Notes

private struct MyNotesSection: View {
    let notes: [ContextNote]
    @Binding var newContextText: String
    let addingContext: Bool
    let onAdd: () -> Void
    let onDelete: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("MY NOTES")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textMuted)
                .tracking(0.5)

            if notes.isEmpty {
                Text("I'm still learning about you. As we talk, I'll note down things that matter for your coaching.")
                    .font(.subheadline)
                    .foregroundStyle(Color.textMuted)
                    .padding(AppLayout.cardPadding)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
            } else {
                ForEach(notes) { note in
                    NoteCard(note: note, onDelete: onDelete)
                }
            }

            HStack(spacing: 8) {
                TextField("An injury, your gym, your schedule...", text: $newContextText)
                    .font(.subheadline)
                    .foregroundStyle(Color.textPrimary)
                    .submitLabel(.send)
                    .onSubmit { onAdd() }

                Button(action: onAdd) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title3)
                        .foregroundStyle(newContextText.trimmingCharacters(in: .whitespaces).isEmpty ? Color.textMuted : Color.chatAccent)
                }
                .disabled(newContextText.trimmingCharacters(in: .whitespaces).isEmpty || addingContext)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

private struct NoteCard: View {
    let note: ContextNote
    let onDelete: (String) -> Void
    @State private var showDelete = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(note.content)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)

            HStack(spacing: 6) {
                Text(note.category.capitalized)
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Text("·")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Text(note.formattedDate)
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Text("·")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                Text("from \(note.source)")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
                if note.isTemporary, let expires = note.expiresAt {
                    Text("·")
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                    Text("until \(expires)")
                        .font(.caption2)
                        .foregroundStyle(Color.semanticWarning)
                }
            }
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        .opacity(note.isTemporary ? 0.85 : 1.0)
        .contextMenu {
            if note.deletable {
                Button(role: .destructive) {
                    onDelete(note.id)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
        }
    }
}

// MARK: - Your Numbers

private struct YourNumbersSection: View {
    let numbers: YourNumbers
    @Binding var weightInput: String
    @Binding var showWeightForm: Bool
    let addingWeight: Bool
    let onAddWeight: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("YOUR NUMBERS")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textMuted)
                .tracking(0.5)

            WeightDataCard(
                weight: numbers.weight,
                weightInput: $weightInput,
                showForm: $showWeightForm,
                addingWeight: addingWeight,
                onAdd: onAddWeight
            )

            if !numbers.sessions.isEmpty {
                SessionsCard(sessions: numbers.sessions)
            }

            if numbers.nutrition.daysLogged > 0 {
                NutritionCard(nutrition: numbers.nutrition)
            }

            if numbers.progressPhotoCount > 0 {
                ProgressPhotosCard(count: numbers.progressPhotoCount, thumbnailUrl: numbers.latestProgressPhotoUrl)
            }
        }
    }
}

private struct WeightDataCard: View {
    let weight: WeightData
    @Binding var weightInput: String
    @Binding var showForm: Bool
    let addingWeight: Bool
    let onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Weight")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.domainStrength)
                Spacer()
                if let date = weight.entries.first?.date {
                    Text(date)
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                }
                Button {
                    showForm.toggle()
                } label: {
                    Image(systemName: "plus")
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                }
            }

            if let current = weight.current {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(String(format: "%.1f", current))
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.textPrimary)
                    Text("kg")
                        .font(.callout)
                        .foregroundStyle(Color.textSecondary)
                }
            }

            if let delta = weight.deltaKg, let earliest = weight.earliestDate {
                Text("\(delta > 0 ? "+" : "")\(String(format: "%.1f", delta)) kg since \(earliest)")
                    .font(.caption)
                    .foregroundStyle(delta < 0 ? Color.semanticSuccess : Color.textSecondary)
            }

            if weight.entries.count >= 2 {
                WeightSparkline(entries: weight.entries)
                    .frame(height: 50)
            }

            if showForm {
                HStack(spacing: 8) {
                    TextField("kg", text: $weightInput)
                        .font(.subheadline)
                        .keyboardType(.decimalPad)
                        .frame(width: 60)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(Color.surfaceOverlay, in: RoundedRectangle(cornerRadius: 8))
                    Button(action: onAdd) {
                        Text("Save")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .disabled(weightInput.isEmpty || addingWeight)
                }
            }
        }
        .padding(AppLayout.cardPadding)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}

private struct WeightSparkline: View {
    let entries: [WeightEntry]

    private var weights: [Double] {
        entries.reversed().map(\.weightKg)
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let pts = weights
            let minW = pts.min() ?? 0
            let maxW = pts.max() ?? 1
            let range = max(maxW - minW, 0.1)

            Path { path in
                for (i, weight) in pts.enumerated() {
                    let x = w * CGFloat(i) / CGFloat(max(pts.count - 1, 1))
                    let y = h - h * CGFloat(weight - minW) / CGFloat(range)
                    if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                    else { path.addLine(to: CGPoint(x: x, y: y)) }
                }
            }
            .stroke(Color.textTertiary, lineWidth: 1.5)

            if let last = pts.last {
                let lastX = w
                let lastY = h - h * CGFloat(last - minW) / CGFloat(range)
                Circle()
                    .fill(Color.textPrimary)
                    .frame(width: 6, height: 6)
                    .position(x: lastX, y: lastY)
            }
        }
    }
}

private struct SessionsCard: View {
    let sessions: [SessionCount]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Sessions this month")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textSecondary)

            HStack(spacing: 10) {
                ForEach(sessions) { item in
                    HStack(spacing: 4) {
                        Text(item.domain.capitalized)
                            .font(.caption)
                            .foregroundStyle(Color.domainColor(for: item.domain))
                        Text("\(item.count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.domainColor(for: item.domain))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.domainMutedColor(for: item.domain), in: RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(AppLayout.cardPadding)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}

private struct NutritionCard: View {
    let nutrition: NutritionSummary

    var body: some View {
        NavigationLink(destination: MealLogView()) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Nutrition")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.domainNutrition)
                    Spacer()
                    if nutrition.daysLogged > 0 {
                        Text("avg \(nutrition.daysLogged) days")
                            .font(.caption2)
                            .foregroundStyle(Color.textMuted)
                    }
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(Color.textMuted)
                }

                HStack(spacing: 0) {
                    if let cal = nutrition.avgCalories {
                        Text("~\(cal) cal")
                            .font(.callout)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textPrimary)
                    }
                    if let pro = nutrition.avgProtein {
                        Text(" · \(pro)g protein")
                            .font(.callout)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textPrimary)
                    }
                }
            }
            .padding(AppLayout.cardPadding)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
        .buttonStyle(.plain)
    }
}

private struct ProgressPhotosCard: View {
    let count: Int
    let thumbnailUrl: String?

    var body: some View {
        NavigationLink(destination: ProgressPhotosView()) {
            HStack {
                Text("Progress Photos")
                    .font(.subheadline)
                    .foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(count) photo\(count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Color.textMuted)
            }
            .padding(AppLayout.cardPadding)
            .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
        .buttonStyle(.plain)
    }
}
