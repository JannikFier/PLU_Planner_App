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

/**
 * Liest das aktuelle JWT direkt aus localStorage (umgeht den Supabase-Client).
 * Zuverlaessiger als supabase.auth.getSession() bei Cold-Start-Szenarien.
 */
function getAccessTokenFromStorage(): string | null {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    )
    if (!key) return null
    const raw = JSON.parse(localStorage.getItem(key) || '{}')
    return raw?.access_token || null
  } catch {
    return null
  }
}

/**
 * Ruft eine Supabase Edge Function per direktem fetch auf.
 * Umgeht supabase.functions.invoke, das bei Cold Starts haengen kann.
 */
export async function invokeEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const jwt = getAccessTokenFromStorage()
  if (!jwt) throw new Error('Nicht angemeldet.')

  const resp = await window.fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    },
  )

  const text = await resp.text()
  let json: T & { error?: string }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Edge Function Fehler: ${resp.status} – ${text.slice(0, 200)}`)
  }

  if (!resp.ok) throw new Error(json.error || `Edge Function Fehler: ${resp.status}`)
  if (json.error) throw new Error(json.error)

  return json
}

/**
 * Direkte REST-API-Abfrage an Supabase PostgREST.
 * Umgeht den Supabase JS Client, der bei bestimmten Tabellen haengen kann.
 */
export async function queryRest<T = unknown[]>(
  table: string,
  params: Record<string, string> = {},
): Promise<T> {
  const jwt = getAccessTokenFromStorage()
  if (!jwt) throw new Error('Nicht angemeldet.')

  const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const resp = await window.fetch(url.toString(), {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/json',
    },
  })

  const text = await resp.text()
  if (!resp.ok) {
    let msg = `REST Fehler: ${resp.status}`
    try { msg = JSON.parse(text)?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  return JSON.parse(text) as T
}

/**
 * Direkte REST-API-Mutation (INSERT/DELETE) an Supabase PostgREST.
 * Umgeht den Supabase JS Client, der bei bestimmten Tabellen haengen kann.
 */
export async function mutateRest(
  method: 'POST' | 'DELETE' | 'PATCH',
  table: string,
  options: { params?: Record<string, string>; body?: unknown } = {},
): Promise<void> {
  const jwt = getAccessTokenFromStorage()
  if (!jwt) throw new Error('Nicht angemeldet.')

  const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v)
    }
  }

  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${jwt}`,
    'Accept': 'application/json',
    'Prefer': 'return=minimal',
  }
  if (options.body) headers['Content-Type'] = 'application/json'

  const resp = await window.fetch(url.toString(), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!resp.ok) {
    const text = await resp.text()
    let msg = `REST Fehler: ${resp.status}`
    try { msg = JSON.parse(text)?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
}
