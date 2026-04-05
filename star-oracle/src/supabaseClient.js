import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '').trim()
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  ''
).trim()

/** Без URL и ключа createClient() падает при импорте — из-за этого был белый экран */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Задайте в .env (папка star-oracle) SUPABASE_URL и SUPABASE_ANON_KEY или VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
    )
  }
}
