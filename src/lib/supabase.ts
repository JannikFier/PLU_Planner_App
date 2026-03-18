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
 * Globaler Testmodus-Flag. Wenn aktiv, werden alle Schreib-Operationen blockiert:
 * 1. invokeEdgeFunction / mutateRest → fruehzeitiger Return
 * 2. Direkte supabase.from().insert/update/delete → fetch-Interceptor
 *    blockiert POST/PATCH/DELETE an /rest/v1/ und gibt Fake-Erfolg zurueck.
 * GET/HEAD (Reads) und Auth/Storage bleiben unberuehrt.
 */
let _testModeActive = false
export function isTestModeActive() { return _testModeActive }

const _nativeFetch = window.fetch.bind(window)

export function setTestModeFlag(active: boolean) {
  _testModeActive = active
  if (active) {
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const [input, init] = args
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
      const method = (init?.method || 'GET').toUpperCase()

      const isSupabaseRest = url.includes(supabaseUrl) && url.includes('/rest/v1/')
      const isWriteMethod = method === 'POST' || method === 'PATCH' || method === 'DELETE'

      if (isSupabaseRest && isWriteMethod) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return _nativeFetch(...args)
    } as typeof fetch
  } else {
    window.fetch = _nativeFetch
  }
}

/**
 * Loescht Supabase-Auth-Daten aus localStorage.
 * Wird bei Logout-Fehler aufgerufen, damit der Nutzer nach Reload nicht wieder eingeloggt ist.
 */
export function clearSupabaseAuthStorage(): void {
  try {
    const keys = Object.keys(localStorage).filter(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    )
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignorieren
  }
}

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

/** Timeout fuer Session-Refresh (verhindert Hänger bei Netzwerkproblemen) */
const REFRESH_SESSION_TIMEOUT_MS = 15_000

/**
 * Session vor kritischen Operationen auffrischen.
 * Reduziert 401 durch abgelaufene Tokens.
 * @returns true wenn Session gueltig/aktualisiert, false bei Fehlschlag
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const result = await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), REFRESH_SESSION_TIMEOUT_MS),
      ),
    ])
    return !result.error
  } catch {
    return false
  }
}

/**
 * Zentrale Behandlung abgelaufener Sessions (nur bei 401):
 * Versucht einmalig Token-Refresh; bei Misserfolg → Sign-Out.
 * Gibt true zurueck wenn der Refresh erfolgreich war und der Request wiederholt werden kann.
 * 403 (Forbidden) wird NICHT behandelt – Session ist oft gueltig, nur Berechtigung fehlt.
 */
async function handleAuthError(status: number): Promise<boolean> {
  if (status !== 401) return false
  try {
    const { error } = await supabase.auth.refreshSession()
    if (!error) return true
  } catch { /* Refresh fehlgeschlagen */ }
  await supabase.auth.signOut()
  return false
}

/** Timeout fuer Edge Function Aufrufe (Cold Starts koennen 10–30s dauern) */
const EDGE_FUNCTION_TIMEOUT_MS = 60_000

/**
 * Ruft eine Supabase Edge Function per direktem fetch auf.
 * Umgeht supabase.functions.invoke, das bei Cold Starts haengen kann.
 * Timeout verhindert endloses Warten bei haengenden Requests.
 */
export async function invokeEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (_testModeActive) return { success: true } as T

  const doRequest = async (): Promise<Response> => {
    const jwt = getAccessTokenFromStorage()
    if (!jwt) throw new Error('Nicht angemeldet.')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS)

    try {
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
          signal: controller.signal,
        },
      )
      clearTimeout(timeoutId)
      return resp
    } catch (e) {
      clearTimeout(timeoutId)
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(
          'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut – beim ersten Aufruf kann es etwas länger dauern.',
        )
      }
      throw e
    }
  }

  let resp = await doRequest()

  if (resp.status === 401 || resp.status === 403) {
    const refreshOk = await handleAuthError(resp.status)
    if (refreshOk) resp = await doRequest()
  }

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
  options?: { signal?: AbortSignal },
): Promise<T> {
  const doRequest = async () => {
    const jwt = getAccessTokenFromStorage()
    if (!jwt) throw new Error('Nicht angemeldet.')

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    return window.fetch(url.toString(), {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/json',
      },
      signal: options?.signal,
    })
  }

  let resp = await doRequest()

  if ((resp.status === 401 || resp.status === 403) && await handleAuthError(resp.status)) {
    resp = await doRequest()
  }

  const text = await resp.text()
  if (!resp.ok) {
    let msg = `REST Fehler: ${resp.status}`
    try { msg = JSON.parse(text)?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  return JSON.parse(text) as T
}

/**
 * REST-API-Count-Abfrage (Prefer: count=exact, liest Count aus Content-Range).
 * Fuer useQuery mit count/head: true.
 */
export async function queryRestCount(
  table: string,
  params: Record<string, string> = {},
): Promise<number> {
  const doRequest = async () => {
    const jwt = getAccessTokenFromStorage()
    if (!jwt) throw new Error('Nicht angemeldet.')

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    return window.fetch(url.toString(), {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/json',
        'Prefer': 'count=exact',
      },
    })
  }

  let resp = await doRequest()

  if ((resp.status === 401 || resp.status === 403) && await handleAuthError(resp.status)) {
    resp = await doRequest()
  }

  if (!resp.ok) {
    const text = await resp.text()
    let msg = `REST Fehler: ${resp.status}`
    try { msg = JSON.parse(text)?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  const range = resp.headers.get('Content-Range')
  if (!range) return 0
  const match = range.match(/\/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
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
  if (_testModeActive) return

  const doRequest = async () => {
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

    return window.fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  }

  let resp = await doRequest()

  if ((resp.status === 401 || resp.status === 403) && await handleAuthError(resp.status)) {
    resp = await doRequest()
  }

  if (!resp.ok) {
    const text = await resp.text()
    let msg = `REST Fehler: ${resp.status}`
    try { msg = JSON.parse(text)?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
}
