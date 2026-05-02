/**
 * Subdomain-Extraktion fuer Multi-Tenancy.
 * Unterstuetzt sowohl Produktion (angerbogen.domain.de) als auch
 * lokale Entwicklung (angerbogen.localhost:5173 oder ?store=angerbogen).
 */

const RESERVED_SUBDOMAINS = new Set(['admin', 'app', 'api', 'www', 'mail'])

/**
 * VITE_APP_DOMAIN aus der Build-Konfiguration fuer Subdomain-Logik.
 * Entfernt versehentlich eingetragenes Protokoll, Pfade und Ports im Host.
 */
export function normalizeViteAppDomain(raw: string | undefined | null): string {
  const s = (raw ?? '').trim()
  if (!s) return 'localhost'
  try {
    const href = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`
    return new URL(href).hostname.toLowerCase()
  } catch {
    const hostOnly = s.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
    const lower = (hostOnly || 'localhost').toLowerCase()
    return lower.replace(/:\d+$/, '')
  }
}

/**
 * Extrahiert die Subdomain aus dem Hostnamen relativ zur App-Domain.
 * Gibt null zurueck wenn keine Subdomain vorhanden ist.
 */
export function extractSubdomain(
  hostname: string,
  appDomain: string
): string | null {
  const host = hostname.toLowerCase()
  const domain = appDomain.toLowerCase().replace(/:\d+$/, '')

  if (host === domain || host === `www.${domain}`) {
    return null
  }

  const suffix = `.${domain}`
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, host.length - suffix.length)
    if (sub && !sub.includes('.')) {
      return sub
    }
  }

  // Localhost-Sonderfall: angerbogen.localhost → subdomain "angerbogen"
  if (domain === 'localhost' && host.endsWith('.localhost')) {
    const sub = host.slice(0, host.indexOf('.localhost'))
    if (sub && !sub.includes('.')) {
      return sub
    }
  }

  return null
}

export function isAdminSubdomain(subdomain: string | null): boolean {
  return subdomain === 'admin'
}

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())
}

/**
 * Generiert einen Subdomain-Vorschlag aus einem Marktnamen.
 * "Markt Angerbogen" → "angerbogen"
 */
export function generateSubdomainSuggestion(name: string): string {
  return name
    .toLowerCase()
    .replace(/^markt\s+/i, '')
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Validiert eine Subdomain.
 */
export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain) return 'Subdomain darf nicht leer sein.'
  if (!/^[a-z][a-z0-9-]*$/.test(subdomain)) {
    return 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt. Muss mit einem Buchstaben beginnen.'
  }
  if (isReservedSubdomain(subdomain)) {
    return `"${subdomain}" ist reserviert und kann nicht verwendet werden.`
  }
  return null
}

/**
 * Baut die vollstaendige URL fuer eine Markt-Subdomain.
 */
export function buildStoreUrl(subdomain: string, appDomain: string): string {
  const protocol = appDomain.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${subdomain}.${appDomain}`
}

/** Vollständige URL zur Markt-Anmeldung (Personal / Markt-Host). */
export function buildMarketLoginUrl(subdomain: string, appDomain: string): string {
  return `${buildStoreUrl(subdomain, appDomain)}/login`
}

/** Kanonischer Super-Admin-Host: immer www + Basisdomain (nicht localhost). */
export function buildSuperAdminCanonicalOrigin(appDomain: string): string | null {
  if (!appDomain || appDomain === 'localhost') return null
  return `https://www.${appDomain}`
}
