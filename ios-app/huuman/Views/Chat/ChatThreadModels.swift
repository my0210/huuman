import Foundation

enum ThreadItem: Identifiable {
    case daySeparator(DaySeparatorItem)
    case userTurn(UserTurnViewModel)
    case assistantTurn(AssistantTurnViewModel)
    case systemEvent(SystemEventViewModel)

    var id: String {
        switch self {
        case .daySeparator(let item):
            return item.id
        case .userTurn(let item):
            return item.id
        case .assistantTurn(let item):
            return item.id
        case .systemEvent(let item):
            return item.id
        }
    }
}

struct DaySeparatorItem: Identifiable {
    let id: String
    let date: Date
}

struct UserTurnViewModel: Identifiable {
    let id: String
    let text: String?
}

struct AssistantTurnViewModel: Identifiable {
    let id: String
    let showsIdentity: Bool
    let leadText: String?
    let blocks: [AssistantBlock]
}

enum AssistantBlock: Identifiable {
    case paragraph(ParagraphBlock)
    case toolAttachment(ToolAttachmentBlock)
    case toolLoading(ToolLoadingBlock)
    case videoCard(VideoCardModel)
    case linkCard(LinkCardModel)
    case inlineNotice(InlineNoticeBlock)

    var id: String {
        switch self {
        case .paragraph(let block):
            return block.id
        case .toolAttachment(let block):
            return block.id
        case .toolLoading(let block):
            return block.id
        case .videoCard(let block):
            return block.id
        case .linkCard(let block):
            return block.id
        case .inlineNotice(let block):
            return block.id
        }
    }
}

struct ParagraphBlock: Identifiable {
    let id: String
    let markdown: String
}

struct ToolAttachmentBlock: Identifiable {
    let id: String
    let toolName: String
    let output: [String: Any]
}

struct ToolLoadingBlock: Identifiable {
    let id: String
    let toolName: String
}

struct VideoCardModel: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let urlString: String
}

struct LinkCardModel: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let urlString: String
    let iconSystemName: String
}

struct InlineNoticeBlock: Identifiable {
    let id: String
    let text: String
    let isError: Bool
}

struct SystemEventViewModel: Identifiable {
    let id: String
    let text: String
}

enum ChatThreadBuilder {
    static func items(from messages: [ChatMessage]) -> [ThreadItem] {
        var items: [ThreadItem] = []
        var lastConversationRole: MessageRole?
        var lastConversationDate: Date?

        for message in messages {
            if shouldInsertDaySeparator(before: message.createdAt, previousDate: lastConversationDate) {
                items.append(.daySeparator(
                    DaySeparatorItem(
                        id: "day-\(dayKey(for: message.createdAt))",
                        date: message.createdAt
                    )
                ))
            }

            if let systemEvent = standaloneSystemEvent(for: message) {
                items.append(.systemEvent(systemEvent))
                lastConversationRole = nil
                lastConversationDate = message.createdAt
                continue
            }

            switch message.role {
            case .user:
                items.append(.userTurn(userTurn(from: message)))
                lastConversationRole = .user
            case .assistant:
                items.append(.assistantTurn(
                    assistantTurn(
                        from: message,
                        showsIdentity: lastConversationRole != .assistant
                    )
                ))
                lastConversationRole = .assistant
            }

            lastConversationDate = message.createdAt
        }

        return items
    }

    private static func userTurn(from message: ChatMessage) -> UserTurnViewModel {
        let textParts = message.parts.compactMap { part -> String? in
            guard case .text(_, let content) = part else { return nil }
            let trimmed = normalizeWhitespace(in: content)
            return trimmed.isEmpty ? nil : trimmed
        }

        return UserTurnViewModel(
            id: message.id,
            text: textParts.isEmpty ? nil : textParts.joined(separator: "\n\n")
        )
    }

    private static func assistantTurn(from message: ChatMessage, showsIdentity: Bool) -> AssistantTurnViewModel {
        let suppressMarkdownLinkFallback = message.parts.contains { part in
            guard case .toolResult(_, let toolName, _) = part else { return false }
            return toolName == "search_youtube"
        }

        var blocks: [AssistantBlock] = []

        for part in message.parts {
            switch part {
            case .text(let id, let content):
                blocks.append(contentsOf: textBlocks(
                    from: content,
                    partID: id,
                    suppressMarkdownLinkFallback: suppressMarkdownLinkFallback
                ))

            case .toolLoading(let id, let toolName):
                blocks.append(.toolLoading(
                    ToolLoadingBlock(id: id, toolName: toolName)
                ))

            case .toolResult(let id, let toolName, let output):
                if toolName == "search_youtube" {
                    let videos = videoCards(from: output, partID: id)
                    if videos.isEmpty {
                        blocks.append(.toolAttachment(
                            ToolAttachmentBlock(id: id, toolName: toolName, output: output)
                        ))
                    } else {
                        blocks.append(contentsOf: videos.map(AssistantBlock.videoCard))
                    }
                } else {
                    blocks.append(.toolAttachment(
                        ToolAttachmentBlock(id: id, toolName: toolName, output: output)
                    ))
                }

            case .image(let id, let url, let filename):
                blocks.append(.linkCard(LinkCardModel(
                    id: id,
                    title: filename ?? "Open image",
                    subtitle: hostLabel(for: url),
                    urlString: url,
                    iconSystemName: "photo"
                )))

            case .toolError(let id):
                blocks.append(.inlineNotice(InlineNoticeBlock(
                    id: id,
                    text: "Something went wrong. Try again.",
                    isError: true
                )))
            }
        }

        let leadText = blocks.compactMap { block -> String? in
            guard case .paragraph(let paragraph) = block else { return nil }
            return paragraph.markdown
        }.first

        return AssistantTurnViewModel(
            id: message.id,
            showsIdentity: showsIdentity,
            leadText: leadText,
            blocks: blocks
        )
    }

    private static func standaloneSystemEvent(for message: ChatMessage) -> SystemEventViewModel? {
        guard message.parts.count == 1 else { return nil }

        switch message.parts[0] {
        case .toolResult(let id, let toolName, let output):
            guard let text = systemEventText(toolName: toolName, output: output) else { return nil }
            return SystemEventViewModel(id: "event-\(id)", text: text)

        case .toolError(let id):
            return SystemEventViewModel(id: "event-\(id)", text: "Something went wrong")

        default:
            return nil
        }
    }

    private static func systemEventText(toolName: String, output: [String: Any]) -> String? {
        switch toolName {
        case "confirm_plan":
            return output["error"] == nil ? "Plan locked in" : "Plan could not be locked in"
        case "save_context":
            return "Coach memory updated"
        case "save_feedback":
            return "Feedback saved"
        case "delete_session":
            return "Session removed"
        case "start_timer":
            let minutes = output["minutes"] as? Int ?? 0
            return minutes > 0 ? "Timer started for \(minutes) min" : "Timer started"
        default:
            return nil
        }
    }

    private static func videoCards(from output: [String: Any], partID: String) -> [VideoCardModel] {
        let videos = output["videos"] as? [[String: Any]] ?? []

        return Array(videos.prefix(3).enumerated()).compactMap { index, video in
            guard let title = video["title"] as? String,
                  let urlString = video["url"] as? String,
                  !title.isEmpty,
                  !urlString.isEmpty else {
                return nil
            }

            return VideoCardModel(
                id: "\(partID)-video-\(index)",
                title: title,
                subtitle: video["channel"] as? String ?? "Open video",
                urlString: urlString
            )
        }
    }

    private static func textBlocks(from rawText: String, partID: String, suppressMarkdownLinkFallback: Bool) -> [AssistantBlock] {
        let normalized = rawText
            .replacingOccurrences(of: "\r\n", with: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalized.isEmpty else { return [] }

        let sections = normalized.components(separatedBy: "\n\n")
        var blocks: [AssistantBlock] = []
        var linkIndex = 0

        for (sectionIndex, section) in sections.enumerated() {
            let lines = section
                .split(separator: "\n", omittingEmptySubsequences: false)
                .map { String($0).trimmingCharacters(in: .whitespaces) }

            var paragraphLines: [String] = []

            for line in lines where !line.isEmpty {
                let extractedLinks = markdownLinks(from: line)
                if !extractedLinks.isEmpty {
                    for link in extractedLinks {
                        blocks.append(.linkCard(LinkCardModel(
                            id: "\(partID)-link-\(linkIndex)",
                            title: link.title,
                            subtitle: hostLabel(for: link.urlString),
                            urlString: link.urlString,
                            iconSystemName: "link"
                        )))
                        linkIndex += 1
                    }
                    continue
                }

                if suppressMarkdownLinkFallback && isLikelyFallbackLinkLine(line) {
                    continue
                }

                paragraphLines.append(line)
            }

            let paragraph = normalizeWhitespace(in: paragraphLines.joined(separator: "\n"))
            if !paragraph.isEmpty {
                blocks.append(.paragraph(ParagraphBlock(
                    id: "\(partID)-paragraph-\(sectionIndex)",
                    markdown: paragraph
                )))
            }
        }

        return coalesceParagraphs(in: blocks)
    }

    private static func coalesceParagraphs(in blocks: [AssistantBlock]) -> [AssistantBlock] {
        var result: [AssistantBlock] = []

        for block in blocks {
            guard case .paragraph(let current) = block else {
                result.append(block)
                continue
            }

            if let lastIndex = result.indices.last,
               case .paragraph(let previous) = result[lastIndex] {
                result[lastIndex] = .paragraph(ParagraphBlock(
                    id: previous.id,
                    markdown: "\(previous.markdown)\n\n\(current.markdown)"
                ))
            } else {
                result.append(block)
            }
        }

        return result
    }

    private static func markdownLinks(from line: String) -> [(title: String, urlString: String)] {
        let pattern = #"\[([^\]]+)\]\((https?://[^\s\)]+)\)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return []
        }

        let nsRange = NSRange(line.startIndex..<line.endIndex, in: line)
        return regex.matches(in: line, range: nsRange).compactMap { match in
            guard match.numberOfRanges == 3,
                  let titleRange = Range(match.range(at: 1), in: line),
                  let urlRange = Range(match.range(at: 2), in: line) else {
                return nil
            }

            let title = line[titleRange].trimmingCharacters(in: .whitespacesAndNewlines)
            let urlString = line[urlRange].trimmingCharacters(in: .whitespacesAndNewlines)

            guard !title.isEmpty, !urlString.isEmpty else { return nil }
            return (title, urlString)
        }
    }

    private static func isLikelyFallbackLinkLine(_ line: String) -> Bool {
        let lowercased = line.lowercased()
        if lowercased.contains("http://") || lowercased.contains("https://") || lowercased.contains("youtu") {
            return true
        }

        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        let isBullet = trimmed.hasPrefix("-") || trimmed.hasPrefix("•")
        let isNumbered = trimmed.range(of: #"^\d+\."#, options: .regularExpression) != nil
        return isBullet || isNumbered
    }

    private static func shouldInsertDaySeparator(before date: Date, previousDate: Date?) -> Bool {
        guard let previousDate else { return true }
        return !Calendar.current.isDate(previousDate, inSameDayAs: date)
    }

    private static func dayKey(for date: Date) -> String {
        let components = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return "\(components.year ?? 0)-\(components.month ?? 0)-\(components.day ?? 0)"
    }

    private static func hostLabel(for urlString: String) -> String {
        guard let url = URL(string: urlString),
              let host = url.host,
              !host.isEmpty else {
            return "Open link"
        }

        return host.replacingOccurrences(of: "www.", with: "")
    }

    private static func normalizeWhitespace(in text: String) -> String {
        text
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
