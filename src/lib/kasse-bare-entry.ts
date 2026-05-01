/**
 * Prüft, ob die aktuelle URL nur den öffentlichen Kassen-Einstieg ohne weitere Segmente ist.
 * Dann kann main.tsx eine schlanke Shell statt der vollen App laden (schneller erster Tab).
 */
export function isBareKasseEntrancePath(): boolean {
  if (typeof window === 'undefined') return false
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const path = window.location.pathname
  const relative = base && path.startsWith(base) ? path.slice(base.length) || '/' : path
  return /^\/kasse\/[^/]+\/?$/.test(relative)
}

/** Absoluter Pfad inkl. Vite-Basename (z. B. für window.location nach Kassen-Login). */
export function resolveAppPath(absoluteRoute: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const route = absoluteRoute.startsWith('/') ? absoluteRoute : `/${absoluteRoute}`
  return `${base}${route}`
}
