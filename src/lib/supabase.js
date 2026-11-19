import { createClient } from '@supabase/supabase-js'

export const PORTFOLIO_BUCKET = 'portfolio-images'
export const PORTFOLIO_TABLE = 'portfolio_images'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

let client

export function getSupabaseClient() {
  if (!SUPABASE_URL && !SUPABASE_ANON_KEY) return null
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }

  return client
}
