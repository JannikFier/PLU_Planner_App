import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import {
  buildAdminBackshopKonfigDeepTasks,
  buildAdminObstKonfigDeepTasks,
} from '@/lib/tutorial-curriculum-admin-konfig'

/**
 * Admin-spezifische Kettenschritte (Konfiguration, Benutzer, …).
 */
export function buildAdminPostUsersTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'admin-users-open-create',
      headline: 'Neuen Benutzer anlegen',
      body: 'Fier: Öffne „Neuer Benutzer“. Im Testmodus simuliert die App das Anlegen – es entsteht kein echter Login.',
      fierKey: 'point',
      nearSelector: '[data-tour="user-management-new-user"]',
      pollIntervalMs: 300,
      validate: () =>
        getPathname().includes('/admin/users')
        && Boolean(document.querySelector('[data-tour="user-management-create-dialog"]')),
    },
    {
      id: 'admin-users-close-dialog',
      headline: 'Dialog schließen',
      body: 'Schließe den Dialog wieder (Esc oder Abbrechen), wenn du fertig bist – die Übersicht bleibt erhalten.',
      fierKey: 'walk',
      pollIntervalMs: 300,
      validate: () =>
        getPathname().includes('/admin/users')
        && !document.querySelector('[data-tour="user-management-create-dialog"]'),
    },
  ]
}

/** Nach der Obst-Masterliste: Hub Liste ↔ Konfiguration (Admin) + Kurz-Konfig-Rundgang. */
export function buildAdminPostObstTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'admin-obst-on-hub',
      headline: 'Obst-Bereich',
      body: 'Von der Liste aus gelangst du mit dem Zurück-Pfeil zum Obst-Bereich. Als Admin kannst du dort die Konfiguration der Liste öffnen – Nutzer und Viewer sehen diesen Hub nicht.',
      fierKey: 'pdown',
      pollIntervalMs: 250,
      validate: () => {
        const p = getPathname()
        return p === '/admin/obst' || p.startsWith('/admin/obst/konfiguration')
      },
    },
    {
      id: 'admin-obst-open-konfig',
      headline: 'Konfiguration',
      body: 'Öffne die Kachel „Konfiguration der Liste“, um Layout und Regeln zu bearbeiten.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="admin-obst-hub-konfig"]',
      pollIntervalMs: 250,
      validate: () => getPathname().startsWith('/admin/obst/konfiguration'),
    },
    ...buildAdminObstKonfigDeepTasks(getPathname),
  ]
}

/** Nach der Backshop-Liste: Hub Liste ↔ Konfiguration (Admin) + Kurz-Konfig-Rundgang. */
export function buildAdminPostBackshopTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'admin-backshop-on-hub',
      headline: 'Backshop-Bereich',
      body: 'Mit dem Zurück-Pfeil kommst du zur Backshop-Übersicht. Als Admin öffnest du dort die Konfiguration der Liste.',
      fierKey: 'pdown',
      pollIntervalMs: 250,
      validate: () => {
        const p = getPathname()
        return p === '/admin/backshop' || p.startsWith('/admin/backshop/konfiguration')
      },
    },
    {
      id: 'admin-backshop-open-konfig',
      headline: 'Konfiguration',
      body: 'Öffne die Kachel „Konfiguration der Liste“ für Layout, Regeln und Gruppenregeln.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-hub-konfig-card"]',
      pollIntervalMs: 250,
      validate: () => getPathname().startsWith('/admin/backshop/konfiguration'),
    },
    ...buildAdminBackshopKonfigDeepTasks(getPathname),
  ]
}
