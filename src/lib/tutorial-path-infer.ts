import type { TutorialModuleKey } from '@/lib/tutorial-types'

/** Inhalts-Module (wie im Orchestrator `ContentModuleKey`). */
export type TutorialContentModuleKey = Exclude<TutorialModuleKey, 'basics' | 'closing'>

/**
 * Leitet aus der aktuellen Route ab, welches Tutorial-Modul der Nutzer mit einer
 * Dashboard-Kachel gemeint hat – damit nach den Basics kein redundantes Track-Pick
 * mit allen Einträgen nötig ist.
 */
export function inferTutorialModuleFromPath(pathname: string): TutorialContentModuleKey | null {
  const p = pathname.replace(/\/+$/, '') || '/'

  if (/\/users(\/|$)/.test(p)) return 'users'
  if (/\/marken-auswahl(\/|$)/.test(p)) return 'backshop-marken'

  if (p.includes('/obst/konfiguration') || p === '/admin/layout' || p === '/admin/rules') return 'obst-konfig'
  if (
    p.includes('/backshop/konfiguration')
    || p.includes('/backshop-layout')
    || p.includes('/backshop-rules')
    || p.includes('/backshop-gruppenregeln')
  ) {
    return 'backshop-konfig'
  }

  if (/\/masterlist(\/|$)/.test(p)) return 'obst'
  if (/\/backshop-list(\/|$)/.test(p)) return 'backshop'

  if (/\/admin\/backshop$|\/user\/backshop$|\/viewer\/backshop$/.test(p)) return 'backshop'
  if (/\/admin\/obst$|\/user\/obst$|\/viewer\/obst$/.test(p)) return 'obst'

  return null
}
