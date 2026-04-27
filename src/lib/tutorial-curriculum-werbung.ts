import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, actionStep, navStep, pathContains } from '@/lib/tutorial-curriculum-style'

/**
 * Werbung deepen (PR 3.0 B5): zwei Sub-Sequenzen, die je nach Sichtbarkeit
 * der Bereiche kombiniert oder einzeln eingehaengt werden koennen.
 *
 * - Obst-Werbung: zentrale + eigene Aktionen, Excel-Import, Carryover-Idee.
 * - Backshop-Werbung: zentrale + eigene Aktionen, Excel-Import.
 *
 * Beide bleiben pflicht-aktion-frei (Ack-only ausser den Navigationen),
 * damit die Tour auch ohne real anzulegende Aktion durchlaeuft.
 */
export function buildObstWerbungTasks(getPathname: () => string): TutorialTask[] {
  return [
    actionStep({
      id: 'werbung-obst-open',
      headline: 'Obst-Werbung',
      body: 'Fier: Öffne die Werbung-Seite für Obst und Gemüse, falls du nicht schon dort bist.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-toolbar-werbung"]',
      predicate: pathContains(getPathname, '/offer-products'),
    }),
    ackStep({
      id: 'werbung-obst-toolbar',
      headline: 'Toolbar',
      body: 'Über die Toolbar legst du Aktionen an oder importierst eine ganze Liste aus Excel.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-offer-toolbar"]',
    }),
    ackStep({
      id: 'werbung-obst-zentral',
      headline: 'Zentrale Aktionen',
      body: 'Im oberen Abschnitt siehst du Aktionen, die zentral für alle Märkte gepflegt werden.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-offer-section-zentral"]',
    }),
    ackStep({
      id: 'werbung-obst-eigen',
      headline: 'Eigene Aktionen',
      body: 'Im unteren Abschnitt pflegst du Aktionen nur für deinen Markt – ideal für lokale Sonderaktionen.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-offer-section-eigen"]',
    }),
    ackStep({
      id: 'werbung-obst-excel',
      headline: 'Excel-Import',
      body: 'Mit dem Excel-Button importierst du eine ganze Aktionsliste in einem Rutsch.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-offer-excel-button"]',
    }),
    ackStep({
      id: 'werbung-obst-add',
      headline: 'Aktion anlegen',
      body: 'Mit dem Plus-Button legst du eine neue Aktion an. PLU, Bezeichnung und Preis kannst du direkt erfassen.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-offer-add-button"]',
    }),
    ackStep({
      id: 'werbung-obst-carryover',
      headline: 'KW-Wechsel',
      body: 'Beim KW-Wechsel werden zentrale Aktionen automatisch mitgenommen. Eigene Aktionen behältst du via Carryover-Banner im Blick.',
      fierKey: 'data',
    }),
  ]
}

export function buildBackshopWerbungTasks(getPathname: () => string): TutorialTask[] {
  return [
    actionStep({
      id: 'werbung-backshop-open',
      headline: 'Backshop-Werbung',
      body: 'Fier: Öffne die Werbung-Seite für den Backshop, falls du nicht schon dort bist.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-master-quick-offer"]',
      predicate: pathContains(getPathname, '/backshop-offer-products'),
    }),
    ackStep({
      id: 'werbung-backshop-toolbar',
      headline: 'Toolbar',
      body: 'Auch hier legst du Aktionen einzeln oder per Excel-Import an.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-offer-toolbar"]',
    }),
    ackStep({
      id: 'werbung-backshop-zentral',
      headline: 'Zentrale Aktionen',
      body: 'Oben siehst du die zentralen Backshop-Aktionen – sie gelten unternehmensweit.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-offer-section-zentral"]',
    }),
    ackStep({
      id: 'werbung-backshop-eigen',
      headline: 'Eigene Aktionen',
      body: 'Unten pflegst du Aktionen nur für deinen Markt – z. B. lokale Wochenaktionen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-offer-section-eigen"]',
    }),
    ackStep({
      id: 'werbung-backshop-excel',
      headline: 'Excel-Import',
      body: 'Mit dem Excel-Button überträgst du eine ganze Aktionsliste in einem Schritt.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-offer-excel-button"]',
    }),
    ackStep({
      id: 'werbung-backshop-add',
      headline: 'Aktion anlegen',
      body: 'Mit dem Plus-Button legst du eine neue Backshop-Aktion an. Der Coach hilft dir bei den Pflichtfeldern.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-offer-add-button"]',
    }),
  ]
}

/**
 * Kombi-Builder: ergaenzt sich je nach Sichtbarkeit. Inkl. Abschluss-Navigation
 * zur jeweils passenden Listen-Hauptseite, damit die Tour sauber weitergeht.
 */
export function buildWerbungTasks(opts: {
  getPathname: () => string
  obstVisible: boolean
  backshopVisible: boolean
}): TutorialTask[] {
  const { getPathname, obstVisible, backshopVisible } = opts
  const tasks: TutorialTask[] = []
  if (obstVisible) {
    tasks.push(...buildObstWerbungTasks(getPathname))
    tasks.push(
      navStep({
        id: 'werbung-obst-back',
        headline: 'Zurück',
        body: 'Zurück zur Obst-Liste.',
        fierKey: 'walk',
        matchesPath: () => {
          const p = getPathname()
          return p.includes('/masterlist') && !p.includes('/offer-products')
        },
      }),
    )
  }
  if (backshopVisible) {
    tasks.push(...buildBackshopWerbungTasks(getPathname))
    tasks.push(
      navStep({
        id: 'werbung-backshop-back',
        headline: 'Zurück',
        body: 'Zurück zur Backshop-Liste.',
        fierKey: 'walk',
        matchesPath: () => {
          const p = getPathname()
          return p.includes('/backshop-list') && !p.includes('/backshop-offer')
        },
      }),
    )
  }
  return tasks
}
