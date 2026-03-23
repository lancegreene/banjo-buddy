// ─────────────────────────────────────────────────────────────────────────────
// Banjo Buddy — Supabase Client
// Singleton Supabase client for auth + database operations.
// Uses environment variables for project URL and anon key.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — cloud sync disabled')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
