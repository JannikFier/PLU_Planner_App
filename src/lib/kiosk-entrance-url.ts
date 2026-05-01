import { buildStoreUrl, isReservedSubdomain, validateSubdomain } from '@/lib/subdomain'

/** Vite/Dev: buildStoreUrl liefert keinen Port — ohne :5173 schlaegt *.localhost fehl (Connection refused). */
function mergePortFromCurrentOriginForLocalDev(marketBaseUrl: string, currentOrigin: string): string {
  try {
    const cur = new URL(currentOrigin)
    const u = new URL(marketBaseUrl)
    const localStyle =
      u.hostname === 'localhost' ||
      u.hostname.endsWith('.localhost') ||
      u.hostname === '127.0.0.1'
    if (!localStyle || u.port) return marketBaseUrl
    if (cur.port) {
      u.port = cur.port
      return u.toString().replace(/\/$/, '')
    }
  } catch {
    /* ignorieren */
  }
  return marketBaseUrl
}

export type BuildKioskEntranceUrlResult = {
  /** Vollständige Einstiegs-URL inkl. Token */
  url: string
  /** true, wenn URL über Markt-Subdomain (buildStoreUrl) gebaut wurde */
  usedSubdomainHost: boolean
}

/**
 * Baut die öffentliche Kassen-Einstiegs-URL.
 * Mit gültiger Markt-Subdomain: https://{subdomain}.{VITE_APP_DOMAIN}/kasse/{token}
 * Sonst Fallback auf aktuelle Origin (gleicher Host wie Admin → gemeinsame Browser-Session).
 */
export function buildKioskEntranceUrl(params: {
  token: string
  storeSubdomain: string | null | undefined
  appDomain: string
  currentOrigin: string
}): BuildKioskEntranceUrlResult {
  const { token, storeSubdomain, appDomain, currentOrigin } = params
  const cleanToken = token.trim()
  if (!cleanToken) {
    return { url: '', usedSubdomainHost: false }
  }

  const path = `/kasse/${encodeURIComponent(cleanToken)}`
  const sub = (storeSubdomain ?? '').trim().toLowerCase()

  if (
    sub &&
    !isReservedSubdomain(sub) &&
    validateSubdomain(sub) === null
  ) {
    try {
      const rawBase = buildStoreUrl(sub, appDomain).replace(/\/$/, '')
      const base = mergePortFromCurrentOriginForLocalDev(rawBase, currentOrigin)
      const url = `${base}${path}`
      return { url, usedSubdomainHost: true }
    } catch {
      /* ungültige Domain-Kombination → Fallback */
    }
  }

  const origin = (currentOrigin || '').replace(/\/$/, '')
  return { url: `${origin}${path}`, usedSubdomainHost: false }
}

/**
 * true, wenn die Kassen-URL noch localhost / *.localhost als Host nutzt,
 * die aktuelle Seite aber offenbar nicht lokal geladen wird.
 * Typischer Grund: VITE_APP_DOMAIN fehlt im Production-Build (Fallback auf localhost).
 */
export function isKioskEntranceUrlMisdeployedForHostname(
  entranceUrl: string,
  pageHostname: string,
): boolean {
  if (!entranceUrl.trim()) return false
  const host = pageHostname.toLowerCase()
  const pageLooksLocal =
    host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  if (pageLooksLocal) return false
  try {
    const h = new URL(entranceUrl).hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')
  } catch {
    return false
  }
}

/** true, wenn Kassen-URL und aktuelle Seite dieselbe Origin haben (Session wird geteilt). */
export function kioskUrlSharesOriginWithPage(kioskUrl: string, pageOrigin: string): boolean {
  if (!kioskUrl || !pageOrigin) return true
  try {
    return new URL(kioskUrl).origin === new URL(pageOrigin).origin
  } catch {
    return true
  }
}
