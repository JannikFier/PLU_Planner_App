import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase URL und Anon Key aus Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase Konfiguration fehlt! Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local setzen.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
