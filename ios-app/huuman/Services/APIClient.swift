import Foundation
import Supabase

enum APIError: LocalizedError {
    case unauthorized
    case serverError(Int)
    case networkError(Error)
    case decodingError

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Not authenticated"
        case .serverError(let code): return "Server error (\(code))"
        case .networkError(let err): return err.localizedDescription
        case .decodingError: return "Failed to parse response"
        }
    }
}

actor APIClient {
    static let shared = APIClient()
    private let baseURL = "https://app.huuman.life"

    private func authHeaders() async throws -> [String: String] {
        let session = try await supabase.auth.session
        return [
            "Authorization": "Bearer \(session.accessToken)",
            "Content-Type": "application/json",
        ]
    }

    func get(_ path: String) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let headers = try await authHeaders()
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.networkError(URLError(.badServerResponse)) }
        guard http.statusCode >= 200 && http.statusCode < 300 else { throw APIError.serverError(http.statusCode) }
        return data
    }

    func post(_ path: String, body: [String: Any]? = nil, timeout: TimeInterval = 60) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = timeout
        let headers = try await authHeaders()
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.networkError(URLError(.badServerResponse)) }
        guard http.statusCode >= 200 && http.statusCode < 300 else { throw APIError.serverError(http.statusCode) }
        return data
    }

    func put(_ path: String, body: [String: Any]) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        let headers = try await authHeaders()
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.networkError(URLError(.badServerResponse)) }
        guard http.statusCode >= 200 && http.statusCode < 300 else { throw APIError.serverError(http.statusCode) }
        return data
    }

    func delete(_ path: String, body: [String: Any]) async throws -> Data {
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let headers = try await authHeaders()
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.networkError(URLError(.badServerResponse)) }
        guard http.statusCode >= 200 && http.statusCode < 300 else { throw APIError.serverError(http.statusCode) }
        return data
    }

    func upload(_ path: String, imageData: Data, mimeType: String = "image/jpeg") async throws -> Data {
        let session = try await supabase.auth.session
        let url = URL(string: "\(baseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.networkError(URLError(.badServerResponse)) }
        guard http.statusCode >= 200 && http.statusCode < 300 else { throw APIError.serverError(http.statusCode) }
        return data
    }
}
