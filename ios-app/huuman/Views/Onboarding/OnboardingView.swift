import SwiftUI
import Supabase

@Observable
@MainActor
final class OnboardingViewModel {
    var currentStep = 0
    var answers = OnboardingAnswers()
    var isBuilding = false
    var buildError: String?
    var buildProgress: String = "Saving your profile..."

    var totalSteps: Int { onboardingSteps.count }
    var step: OnboardingStepType { onboardingSteps[currentStep] }
    var progress: Double { Double(currentStep + 1) / Double(totalSteps) }

    var canAdvance: Bool {
        switch step {
        case .welcome, .methodology, .build:
            return true
        case .name:
            return !answers.name.trimmingCharacters(in: .whitespaces).isEmpty
        case .questions:
            return true
        case .basics:
            return !answers.age.isEmpty && !answers.weightKg.isEmpty
        }
    }

    func next() {
        guard currentStep < totalSteps - 1 else { return }
        currentStep += 1
    }

    func back() {
        guard currentStep > 0 else { return }
        currentStep -= 1
    }

    func buildPlan() async -> Bool {
        isBuilding = true
        buildError = nil
        buildProgress = "Saving your profile..."

        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString.lowercased()

            let profilePayload = answers.toProfilePayload()
            _ = try await APIClient.shared.put("/api/profile", body: profilePayload)

            buildProgress = "Generating your plan (this takes ~30s)..."
            _ = try await APIClient.shared.post("/api/plan/generate", body: ["userId": userId], timeout: 120)

            isBuilding = false
            return true
        } catch {
            buildError = error.localizedDescription
            isBuilding = false
            return false
        }
    }
}

struct OnboardingView: View {
    @State private var vm = OnboardingViewModel()
    let onComplete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            ProgressView(value: vm.progress)
                .tint(Color.textPrimary)
                .padding(.horizontal, 24)
                .padding(.top, 16)

            HStack {
                Text("\(vm.currentStep + 1)/\(vm.totalSteps)")
                    .font(.caption)
                    .foregroundStyle(Color.textMuted)
                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.top, 4)

            ScrollView {
                stepContent
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 100)
            }

            Spacer(minLength: 0)

            navigationBar
        }
        .background(Color.surfaceBase)
        .animation(.easeInOut(duration: 0.2), value: vm.currentStep)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch vm.step {
        case .welcome(let title, let body, let subtitle):
            WelcomeStep(title: title, bodyText: body, subtitle: subtitle)
        case .name(let title, let subtitle):
            NameStep(title: title, subtitle: subtitle, name: $vm.answers.name)
        case .methodology(let domain):
            if let content = domainContent[domain] {
                MethodologyStep(content: content)
            } else {
                EmptyView()
            }
        case .questions(_, let title, let questions):
            QuestionsStep(title: title, questions: questions, answers: $vm.answers)
        case .basics(let title, let subtitle, let fields):
            BasicsStep(title: title, subtitle: subtitle, fields: fields, answers: $vm.answers)
        case .build:
            BuildStep(vm: vm, onComplete: onComplete)
        }
    }

    @ViewBuilder
    private var navigationBar: some View {
        if case .build = vm.step {
            EmptyView()
        } else {
            VStack(spacing: 0) {
                Divider().overlay(Color.borderSubtle)
                HStack {
                    if vm.currentStep > 0 {
                        Button {
                            vm.back()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                    .font(.subheadline.weight(.medium))
                                Text("Back")
                            }
                            .foregroundStyle(Color.textSecondary)
                            .frame(height: 44)
                        }
                    }

                    Spacer()

                    Button {
                        vm.next()
                    } label: {
                        Text("Continue")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(vm.canAdvance ? Color.surfaceBase : Color.textMuted)
                            .padding(.horizontal, 24)
                            .frame(height: 44)
                            .background(vm.canAdvance ? Color.textPrimary : Color.surfaceElevated)
                            .clipShape(Capsule())
                    }
                    .disabled(!vm.canAdvance)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
            }
            .background(Color.surfaceBase)
        }
    }
}

// MARK: - Welcome Step

private struct WelcomeStep: View {
    let title: String
    let bodyText: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("h")
                .font(.largeTitle.weight(.bold))
                .fontDesign(.rounded)
                .foregroundStyle(Color.textPrimary)

            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)

            Text(bodyText)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
                .lineSpacing(4)

            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(Color.textTertiary)
                .lineSpacing(4)
                .padding(.top, 8)
        }
    }
}

// MARK: - Name Step

private struct NameStep: View {
    let title: String
    let subtitle: String
    @Binding var name: String
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(Color.textTertiary)

            TextField("Your name", text: $name)
                .font(.title3)
                .foregroundStyle(Color.textPrimary)
                .padding(16)
                .background(Color.surfaceRaised)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.borderDefault))
                .focused($isFocused)
                .padding(.top, 8)
                .onAppear { isFocused = true }
        }
    }
}

// MARK: - Methodology Step

private struct MethodologyStep: View {
    let content: DomainContent

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                Image(systemName: content.icon)
                    .font(.title2)
                    .foregroundStyle(Color.domainColor(for: content.domain))

                Text(content.title)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.textPrimary)
            }

            Text(content.philosophy)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
                .lineSpacing(4)

            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(content.keyPrinciples.enumerated()), id: \.offset) { _, principle in
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(Color.domainColor(for: content.domain))
                            .frame(width: 6, height: 6)
                            .padding(.top, 7)

                        Text(principle)
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                            .lineSpacing(3)
                    }
                }
            }
            .padding(16)
            .background(Color.surfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            HStack(spacing: 8) {
                Image(systemName: "target")
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
                Text(content.weeklyTargetSummary)
                    .font(.footnote)
                    .foregroundStyle(Color.textTertiary)
            }
            .padding(.top, 4)
        }
    }
}

// MARK: - Questions Step

private struct QuestionsStep: View {
    let title: String
    let questions: [QuestionDef]
    @Binding var answers: OnboardingAnswers

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)

            ForEach(questions) { question in
                VStack(alignment: .leading, spacing: 12) {
                    Text(question.label)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)

                    switch question.kind {
                    case .singleSelect:
                        SingleSelectGroup(
                            questionId: question.id,
                            options: question.options,
                            answers: $answers
                        )
                    case .multiSelect:
                        MultiSelectGroup(
                            questionId: question.id,
                            options: question.options,
                            noneLabel: question.noneLabel,
                            answers: $answers
                        )
                    }
                }
            }
        }
    }
}

private struct SingleSelectGroup: View {
    let questionId: String
    let options: [OptionDef]
    @Binding var answers: OnboardingAnswers

    var body: some View {
        VStack(spacing: 8) {
            ForEach(options) { option in
                let isSelected = answers.singleSelectValue(for: questionId) == option.value
                Button {
                    answers.setSingleSelect(questionId, value: option.value)
                } label: {
                    HStack {
                        Text(option.label)
                            .font(.subheadline)
                            .foregroundStyle(isSelected ? Color.textPrimary : Color.textSecondary)
                        Spacer()
                        if isSelected {
                            Image(systemName: "checkmark")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.textPrimary)
                        }
                    }
                    .padding(14)
                    .frame(minHeight: AppLayout.buttonMinHeight)
                    .background(isSelected ? Color.surfaceElevated : Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(isSelected ? Color.borderStrong : Color.borderDefault)
                    )
                }
            }
        }
    }
}

private struct MultiSelectGroup: View {
    let questionId: String
    let options: [OptionDef]
    let noneLabel: String?
    @Binding var answers: OnboardingAnswers

    private var selected: [String] {
        answers.multiSelectValue(for: questionId)
    }

    var body: some View {
        VStack(spacing: 8) {
            ForEach(options) { option in
                let isSelected = selected.contains(option.value)
                Button {
                    var current = selected
                    if isSelected {
                        current.removeAll { $0 == option.value }
                    } else {
                        current.append(option.value)
                    }
                    answers.setMultiSelect(questionId, values: current)
                } label: {
                    HStack {
                        Text(option.label)
                            .font(.subheadline)
                            .foregroundStyle(isSelected ? Color.textPrimary : Color.textSecondary)
                        Spacer()
                        Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                            .foregroundStyle(isSelected ? Color.textPrimary : Color.textMuted)
                    }
                    .padding(14)
                    .frame(minHeight: AppLayout.buttonMinHeight)
                    .background(isSelected ? Color.surfaceElevated : Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(isSelected ? Color.borderStrong : Color.borderDefault)
                    )
                }
            }

            if let noneLabel {
                Button {
                    answers.setMultiSelect(questionId, values: [])
                } label: {
                    HStack {
                        Text(noneLabel)
                            .font(.subheadline)
                            .foregroundStyle(selected.isEmpty ? Color.textPrimary : Color.textTertiary)
                        Spacer()
                        if selected.isEmpty {
                            Image(systemName: "checkmark")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.textPrimary)
                        }
                    }
                    .padding(14)
                    .frame(minHeight: AppLayout.buttonMinHeight)
                    .background(selected.isEmpty ? Color.surfaceElevated : Color.surfaceRaised)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(selected.isEmpty ? Color.borderStrong : Color.borderDefault)
                    )
                }
            }
        }
    }
}

// MARK: - Basics Step

private struct BasicsStep: View {
    let title: String
    let subtitle: String
    let fields: [FieldDef]
    @Binding var answers: OnboardingAnswers
    @FocusState private var focusedField: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(Color.textTertiary)
                .lineSpacing(4)

            ForEach(fields) { field in
                VStack(alignment: .leading, spacing: 8) {
                    Text(field.label)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)

                    TextField(field.placeholder, text: bindingFor(field.id))
                        .keyboardType(.decimalPad)
                        .font(.title3)
                        .foregroundStyle(Color.textPrimary)
                        .padding(16)
                        .background(Color.surfaceRaised)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.borderDefault))
                        .focused($focusedField, equals: field.id)
                }
                .padding(.top, 8)
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focusedField = nil }
            }
        }
    }

    private func bindingFor(_ fieldId: String) -> Binding<String> {
        switch fieldId {
        case "age": return $answers.age
        case "weightKg": return $answers.weightKg
        default: return .constant("")
        }
    }
}

// MARK: - Build Step

private struct BuildStep: View {
    let vm: OnboardingViewModel
    let onComplete: () -> Void
    @State private var started = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            if vm.isBuilding {
                VStack(spacing: 16) {
                    ProgressView()
                        .controlSize(.large)
                        .tint(Color.textSecondary)

                    Text(vm.buildProgress)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            } else if let error = vm.buildError {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(Color.semanticError)

                    Text("Something went wrong")
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)

                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                        .multilineTextAlignment(.center)

                    Button {
                        started = false
                    } label: {
                        Text("Try again")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.surfaceBase)
                            .padding(.horizontal, 24)
                            .frame(height: 44)
                            .background(Color.textPrimary)
                            .clipShape(Capsule())
                    }
                }
            } else {
                VStack(spacing: 16) {
                    ProgressView()
                        .controlSize(.large)
                        .tint(Color.textSecondary)

                    Text("Preparing...")
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .task {
            guard !started else { return }
            started = true
            let success = await vm.buildPlan()
            if success {
                try? await Task.sleep(for: .milliseconds(500))
                onComplete()
            }
        }
    }
}
