/**
 * Supabase Auth-Persistenz: fuer Produktions-Domain Cookies mit Domain=.<appDomain>,
 * damit www und Markt-Subdomains dieselbe Session teilen. Lokal weiter sessionStorage.
 */

import { normalizeViteAppDomain } from '@/lib/subdomain'

const CHUNK_SIZE = 3200
const MAX_AGE_SEC = 60 * 60 * 24 * 400 // ~400 Tage, Refresh-Token bleibt gueltig

function listCookieNames(): string[] {
  if (typeof document === 'undefined' || !document.cookie) return []
  return document.cookie.split(';').map(part => {
    const eq = part.indexOf('=')
    return (eq === -1 ? part : part.slice(0, eq)).trim()
  })
}

function getCookieRaw(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const p = part.trim()
    if (p.startsWith(prefix)) {
      return p.slice(prefix.length)
    }
  }
  return null
}

function deleteCookie(name: string, domainDot: string, secure: boolean) {
  const base = `Path=/; Domain=${domainDot}; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`
  document.cookie = `${name}=; ${base}`
}

function writeCookie(name: string, value: string, domainDot: string, secure: boolean) {
  const base = `Path=/; Domain=${domainDot}; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure ? '; Secure' : ''}`
  document.cookie = `${name}=${encodeURIComponent(value)}; ${base}`
}

/** Basis-Keys sb-…-auth-token aus Cookie-Namen (ohne Chunk-Suffixe). */
function findSupabaseAuthBaseKeysFromCookies(): string[] {
  const bases = new Set<string>()
  for (const n of listCookieNames()) {
    const m = n.match(/^(sb-.+-auth-token)(?:\.__(?:\d+|n))?$/)
    if (m) bases.add(m[1])
  }
  return [...bases]
}

function createChunkedCookieStorage(appDomain: string) {
  const domainDot = `.${appDomain}`
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'

  function removeItem(key: string): void {
    const nRaw = getCookieRaw(`${key}.__n`)
    if (nRaw != null && nRaw !== '') {
      const n = parseInt(decodeURIComponent(nRaw), 10)
      deleteCookie(`${key}.__n`, domainDot, secure)
      if (Number.isFinite(n) && n > 0) {
        for (let i = 0; i < n; i++) {
          deleteCookie(`${key}.__${i}`, domainDot, secure)
        }
      }
    }
    deleteCookie(key, domainDot, secure)
  }

  return {
    getItem(key: string): string | null {
      const nRaw = getCookieRaw(`${key}.__n`)
      if (nRaw != null && nRaw !== '') {
        const n = parseInt(decodeURIComponent(nRaw), 10)
        if (!Number.isFinite(n) || n < 1) return null
        let acc = ''
        for (let i = 0; i < n; i++) {
          const part = getCookieRaw(`${key}.__${i}`)
          if (part == null) return null
          acc += decodeURIComponent(part)
        }
        try {
          return decodeURIComponent(acc)
        } catch {
          return null
        }
      }
      const single = getCookieRaw(key)
      if (single == null) return null
      try {
        return decodeURIComponent(single)
      } catch {
        return null
      }
    },

    setItem(key: string, value: string): void {
      removeItem(key)
      const encoded = encodeURIComponent(value)
      if (encoded.length <= CHUNK_SIZE) {
        writeCookie(key, encoded, domainDot, secure)
        return
      }
      const parts = Math.ceil(encoded.length / CHUNK_SIZE)
      writeCookie(`${key}.__n`, String(parts), domainDot, secure)
      for (let i = 0; i < parts; i++) {
        const slice = encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        writeCookie(`${key}.__${i}`, slice, domainDot, secure)
      }
    },

    removeItem,
  }
}

export type SupabaseAuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * Auth-Speicher fuer createClient: localhost = sessionStorage, sonst Cookies (.domain).
 */
export function createSupabaseAuthStorage(appDomainRaw: string | undefined | null): SupabaseAuthStorage {
  const appDomain = normalizeViteAppDomain(appDomainRaw)
  if (appDomain === 'localhost') {
    return window.sessionStorage
  }
  return createChunkedCookieStorage(appDomain)
}

/** Einmalige Migration alter Sessions aus sessionStorage in Cookie-Speicher. */
export function migrateSessionStorageAuthTo(target: SupabaseAuthStorage): void {
  if (target === window.sessionStorage) return
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const v = sessionStorage.getItem(k)
        if (v) {
          target.setItem(k, v)
          sessionStorage.removeItem(k)
        }
      }
    }
  } catch {
    /* ignorieren */
  }
}

/** Alle Supabase-Auth-Cookies zur Basisdomain loeschen (Logout-Fallback). */
export function clearSupabaseAuthCookies(appDomainRaw: string | undefined | null): void {
  const appDomain = normalizeViteAppDomain(appDomainRaw)
  if (appDomain === 'localhost' || typeof document === 'undefined') return
  const domainDot = `.${appDomain}`
  const secure = window.location.protocol === 'https:'
  for (const name of listCookieNames()) {
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      deleteCookie(name, domainDot, secure)
    }
  }
}

/** Basis-Keys (sb-…-auth-token) fuer Token-Lesezugriff ohne Supabase-Client. */
export function listSupabaseAuthBaseKeys(storage: SupabaseAuthStorage): string[] {
  if (storage === window.sessionStorage) {
    try {
      return Object.keys(sessionStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    } catch {
      return []
    }
  }
  return findSupabaseAuthBaseKeysFromCookies()
}
