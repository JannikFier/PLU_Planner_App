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

const _nativeFetch = window.fetch.bind(window)

/**
 * Globaler Testmodus-Flag (vor createClient: kein TDZ bei sofortigem fetch).
 * Wenn aktiv: Schreib-Operationen an /rest/v1/ werden im Client-Fetch simuliert.
 */
let _testModeActive = false

/** Supabase-Client-Fetch: Testmodus blockiert Schreib-Requests an /rest/v1/ ohne Backend. */
function supabaseClientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : ''
  const method = (init?.method ?? (input instanceof Request ? input.method : undefined) ?? 'GET').toUpperCase()
  try {
    const isSupabaseRest = urlStr.includes(supabaseUrl) && urlStr.includes('/rest/v1/')
    const isWriteMethod = method === 'POST' || method === 'PATCH' || method === 'DELETE'
    if (_testModeActive && isSupabaseRest && isWriteMethod) {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }
  } catch {
    /* weiter mit normalem Fetch */
  }
  return _nativeFetch(input, init)
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: supabaseClientFetch },
  // Tab schließen = Session weg (Shared-PC); Reload im selben Tab bleibt eingeloggt.
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})

type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>

/** Parallele getSession-Aufrufe teilen eine Promise (Auth + Store + Strict Mode) – mindert Mehrfach-Refresh/Warteschlange. */
let getSessionInFlight: Promise<GetSessionResult> | null = null

export function getSessionDeduped(): Promise<GetSessionResult> {
  if (!getSessionInFlight) {
    getSessionInFlight = supabase.auth.getSession().finally(() => {
      getSessionInFlight = null
    })
  }
  return getSessionInFlight
}

/**
 * Testmodus: siehe _testModeActive oben; invokeEdgeFunction / mutateRest → fruehzeitiger Return;
 * window.fetch-Interceptor fuer direkte Aufrufe; Supabase-Client nutzt supabaseClientFetch.
 */
export function isTestModeActive() { return _testModeActive }

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

/** Keys fuer Supabase-JWT (gleiches Muster wie @supabase/supabase-js). */
function listSupabaseAuthTokenKeys(storage: Storage): string[] {
  try {
    return Object.keys(storage).filter(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    )
  } catch {
    return []
  }
}

/**
 * Loescht Supabase-Auth-Tokens aus sessionStorage (aktiver Speicher) und localStorage (Legacy).
 * Wird bei Logout-Fehler aufgerufen, damit der Nutzer nach Reload nicht wieder eingeloggt ist.
 */
export function clearSupabaseAuthStorage(): void {
  try {
    for (const k of listSupabaseAuthTokenKeys(sessionStorage)) {
      sessionStorage.removeItem(k)
    }
    for (const k of listSupabaseAuthTokenKeys(localStorage)) {
      localStorage.removeItem(k)
    }
  } catch {
    // ignorieren
  }
}

/**
 * Liest das aktuelle JWT direkt aus sessionStorage (umgeht den Supabase-Client).
 * Zuverlaessiger als supabase.auth.getSession() bei Cold-Start-Szenarien.
 */
function getAccessTokenFromStorage(): string | null {
  try {
    const keys = listSupabaseAuthTokenKeys(sessionStorage)
    const key = keys[0]
    if (!key) return null
    const raw = JSON.parse(sessionStorage.getItem(key) || '{}')
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

/** True wenn VITE_SUPABASE_URL auf die lokale Supabase-CLI zeigt (typisch Port 54321). */
function isLocalSupabaseApiUrl(): boolean {
  try {
    const h = new URL(supabaseUrl).hostname
    return h === 'localhost' || h === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Edge-Aufrufe sollen nur dort ueber die Vite-Origin laufen, wo server.preview.proxy
 * wirklich existiert (Vite dev / Vite preview), nicht z. B. bei `serve dist` auf Port 3000.
 */
function edgeFunctionsShouldUseViteProxyOrigin(): boolean {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  if (!isLocalSupabaseApiUrl()) return false
  const host = window.location.hostname
  if (host !== 'localhost' && host !== '127.0.0.1') return false
  if (!import.meta.env.PROD) return false
  const p = window.location.port || ''
  return ['5173', '4173', '4174', '5180', '5137'].includes(p)
}

/**
 * Basis-URL fuer Edge Functions:
 * - Vite-Dev (`npm run dev`): gleiche Origin + server.proxy (CORS umgehen).
 * - Vite-Preview (`npm run preview`) mit lokalem Supabase: gleiche Origin + preview.proxy.
 * - Sonst: direkt VITE_SUPABASE_URL (Production / gehostetes Supabase).
 */
function getEdgeFunctionsOrigin(): string {
  const base = supabaseUrl.replace(/\/$/, '')
  if (typeof window === 'undefined') return base
  if (edgeFunctionsShouldUseViteProxyOrigin()) return window.location.origin
  return base
}

function supabaseConfiguredHost(): string {
  try {
    return new URL(supabaseUrl).host
  } catch {
    return '(ungültige VITE_SUPABASE_URL)'
  }
}

/** Fehlermeldung aus typischen Edge- / Gateway-JSON-Formen. */
function edgeFunctionErrorMessageFromJson(json: unknown, status: number): string {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (typeof o.error === 'string' && o.error.trim()) return o.error
    if (typeof o.message === 'string' && o.message.trim()) return o.message
    if (typeof o.msg === 'string' && o.msg.trim()) return o.msg
  }
  return `Edge Function Fehler: ${status}`
}

function edgeFunctionNotFoundHint(functionName: string): string {
  const host = supabaseConfiguredHost()
  if (isLocalSupabaseApiUrl()) {
    return (
      `Die Edge Function „${functionName}“ wurde nicht gefunden (HTTP 404). ` +
      `Konfigurierter Host: ${host}. ` +
      'Lokales Supabase: Edge Functions muessen laufen (z. B. zweites Terminal: `supabase functions serve` ' +
      'oder laut Supabase-Doku „Edge Functions: Local development“). ' +
      'Remote-Projekt: `supabase functions deploy ' +
      functionName +
      '`'
    )
  }
  return (
    `Die Edge Function „${functionName}“ wurde nicht gefunden (HTTP 404). ` +
      `Konfigurierter API-Host: ${host}. ` +
      'Diese Function ist auf genau diesem Supabase-Projekt nicht erreichbar (noch nicht deployt oder falsches Projekt in .env.local). ' +
      'Im Dashboard unter Edge Functions prüfen. Deploy: `supabase link` (passender project-ref) und dann `supabase functions deploy ' +
      functionName +
      '` oder im Projekt `npm run supabase:deploy:functions`.'
  )
}

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
      const edgeBase = getEdgeFunctionsOrigin()
      const edgeUrl = `${edgeBase}/functions/v1/${functionName}`

      // Direkt natives fetch: Edge Functions nicht über supabaseClientFetch (nur REST v1 + Testmodus),
      // damit keine verdeckten CORS-/Wrapper-Effekte beim Aufruf von functions/v1.
      const resp = await _nativeFetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
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

  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(edgeFunctionNotFoundHint(functionName))
    }
    throw new Error(edgeFunctionErrorMessageFromJson(json, resp.status))
  }
  if (json.error) throw new Error(json.error)

  return json
}

/**
 * Edge Function ohne Nutzer-JWT (nur Anon-Key), z. B. Kassen-Login.
 */
export async function invokeEdgeFunctionAnon<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (_testModeActive) return { success: true } as T

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS)

  try {
    const edgeUrl = `${getEdgeFunctionsOrigin()}/functions/v1/${functionName}`
    const resp = await _nativeFetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const text = await resp.text()
    let json: T & { error?: string }
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`Edge Function Fehler: ${resp.status} – ${text.slice(0, 200)}`)
    }

    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error(edgeFunctionNotFoundHint(functionName))
      }
      throw new Error(edgeFunctionErrorMessageFromJson(json, resp.status))
    }
    if (json.error) throw new Error(json.error)

    return json
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

/**
 * Direkte REST-API-Abfrage an Supabase PostgREST.
 * Umgeht den Supabase JS Client, der bei bestimmten Tabellen haengen kann.
 */
export async function queryRest<T = unknown[]>(
  table: string,
  params: Record<string, string> = {},
  options?: { signal?: AbortSignal; /** Wenn Tabelle fehlt (Migration noch nicht ausgefuehrt): leeres Ergebnis statt Fehler */ onMissingRelation?: 'empty' },
): Promise<T> {
  const doRequest = async () => {
    const jwt = getAccessTokenFromStorage()
    if (!jwt) throw new Error('Nicht angemeldet.')

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    return supabaseClientFetch(url.toString(), {
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
    if (resp.status === 404 && options?.onMissingRelation === 'empty') {
      try {
        const j = JSON.parse(text) as { code?: string }
        if (j.code === 'PGRST205') {
          return [] as T
        }
      } catch {
        /* weiter mit Fehler */
      }
    }
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

    return supabaseClientFetch(url.toString(), {
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

    return supabaseClientFetch(url.toString(), {
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
