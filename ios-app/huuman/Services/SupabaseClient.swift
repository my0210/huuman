import Foundation
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: AppSecrets.supabaseURL)!,
    supabaseKey: AppSecrets.supabaseAnonKey
)
