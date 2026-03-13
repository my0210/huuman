import SwiftUI

extension View {
    func chatAttachmentCard(background: Color = .chatCardSurface, stroke: Color = .chatCardBorder) -> some View {
        modifier(ChatAttachmentCardModifier(background: background, stroke: stroke))
    }
}

private struct ChatAttachmentCardModifier: ViewModifier {
    let background: Color
    let stroke: Color

    func body(content: Content) -> some View {
        content
            .background(
                background,
                in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
                    .stroke(stroke, lineWidth: 1)
            )
    }
}
