import SwiftUI

struct SavedPhotoCardView: View {
    let data: [String: Any]

    var body: some View {
        if data["error"] != nil {
            StatusCard(text: "Couldn't save the photo. Try sending it again.", isSuccess: false)
        } else {
            let totalCount = data["totalCount"] as? Int
            let date = data["capturedAt"] as? String

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "camera.fill")
                            .font(.caption)
                            .foregroundStyle(Color.semanticSuccess)
                        Text("Progress photo saved")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.semanticSuccess)
                    }
                    Spacer()
                    if let count = totalCount {
                        Text("#\(count)")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.semanticSuccess)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.semanticSuccess.opacity(0.15), in: Capsule())
                    }
                }
                if let date {
                    Text(formatDate(date))
                        .font(.caption)
                        .foregroundStyle(Color.textMuted)
                        .padding(.leading, 22)
                }
            }
            .padding(AppLayout.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.semanticSuccess.opacity(0.08), in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
    }

    private func formatDate(_ iso: String) -> String {
        let d = iso.prefix(10)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: String(d)) {
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
        return String(d)
    }
}

struct SavedMealCardView: View {
    let data: [String: Any]

    var body: some View {
        if data["error"] != nil {
            StatusCard(text: "Couldn't log the meal. Try sending the photo again.", isSuccess: false)
        } else {
            let description = data["description"] as? String
            let cal = data["estimatedCalories"] as? Int
            let protein = data["estimatedProteinG"] as? Int
            let mealType = data["mealType"] as? String

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "fork.knife")
                        .font(.caption)
                        .foregroundStyle(Color.domainNutrition)
                    Text("Meal logged")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.domainNutrition)
                    Spacer()
                    if let mt = mealType {
                        Text(mt.capitalized)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.domainNutrition)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.domainNutritionMuted, in: Capsule())
                    }
                }

                if let desc = description {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                        .lineLimit(2)
                        .lineSpacing(2)
                }

                if cal != nil || protein != nil {
                    HStack(spacing: 8) {
                        if let cal {
                            Text("~\(cal) cal")
                                .font(.caption2)
                                .foregroundStyle(Color.textMuted)
                                .monospacedDigit()
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.surfaceElevated, in: Capsule())
                        }
                        if let protein {
                            Text("~\(protein)g protein")
                                .font(.caption2)
                                .foregroundStyle(Color.textMuted)
                                .monospacedDigit()
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.surfaceElevated, in: Capsule())
                        }
                    }
                }
            }
            .padding(AppLayout.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.domainNutrition.opacity(0.08), in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
    }
}
