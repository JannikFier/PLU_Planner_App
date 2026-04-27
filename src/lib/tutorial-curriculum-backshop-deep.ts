import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, actionStep, navStep, pathContains } from '@/lib/tutorial-curriculum-style'

function onList(getPathname: () => string): boolean {
  const p = getPathname()
  return (
    p.includes('/backshop-list')
    && !p.includes('backshop-custom')
    && !p.includes('backshop-hidden')
    && !p.includes('backshop-offer')
    && !p.includes('backshop-renamed')
    && !p.includes('marken-auswahl')
  )
}

/**
 * Vertiefung Backshop-Liste (PR 3.0 B3): Vollausbau ueber Toolbar, Versions-
 * Banner, Suche, Quell-Filter, Werbung, eigene Produkte, ausgeblendete (manuell
 * vs. Regel), umbenannte und PDF.
 *
 * Reihenfolge:
 *   1- 4 Page / Versions-Banner / Toolbar / Suche
 *   5- 6 Quell-Filter + Tabellen-Erklaerung
 *   7- 9 Eigene Produkte
 *  10    zurueck
 *  11-15 Ausgeblendete (Toolbar, Manuell-Tab, Regel-Tab)
 *  16    zurueck
 *  17-19 Werbung (zentrale + eigene + Add)
 *  20    zurueck
 *  21    PDF
 *  22    Abschluss
 */
export function buildBackshopDeepTasks(getPathname: () => string): TutorialTask[] {
  const onMain = () => onList(getPathname)

  return [
    ackStep({
      id: 'backshop-deep-page',
      headline: 'Backshop-Liste',
      body: 'Hier arbeitest du mit der aktuellen Backshop-Version. Direkt darunter siehst du, woher die Daten stammen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-page"]',
    }),
    ackStep({
      id: 'backshop-deep-version-banner',
      headline: 'Versions-Banner',
      body: 'Wechselt die Version, zeigt der Banner den Übergang. So siehst du immer, ob du auf der aktuellen Liste bist.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-version-banner"]',
    }),
    ackStep({
      id: 'backshop-deep-toolbar',
      headline: 'Toolbar',
      body: 'Die Toolbar bündelt eigene Produkte, Ausgeblendete, Werbung und PDF – alles zentral erreichbar.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-toolbar"]',
    }),
    ackStep({
      id: 'backshop-deep-find',
      headline: 'Suche',
      body: 'Mit „Suchen“ öffnest du die Suche-Leiste. Treffer werden inline farbig markiert – ohne Filterung.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-master-find-trigger"]',
    }),
    ackStep({
      id: 'backshop-deep-source-filter',
      headline: 'Quell-Filter',
      body: 'Hier siehst du, welche Quellen (Edeka, Harry, Aryzta) gerade aktiv sind – inklusive deiner Gruppenregeln.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-source-filter"]',
    }),
    ackStep({
      id: 'backshop-deep-table',
      headline: 'Liste',
      body: 'Die Tabelle zeigt dir die aktive Backshop-Version mit Quell-Badges, Mengen und Preisen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-table"]',
    }),

    actionStep({
      id: 'backshop-deep-open-custom',
      headline: 'Eigene Produkte',
      body: 'Fier: Klicke auf „Eigene Produkte“. Hier pflegst du Markt-spezifische Backshop-Artikel.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-master-quick-custom"]',
      predicate: pathContains(getPathname, '/backshop-custom-products'),
    }),
    ackStep({
      id: 'backshop-deep-custom-toolbar',
      headline: 'Eigene Toolbar',
      body: 'Eigene Backshop-Produkte verhalten sich wie reguläre Artikel – sie werden mitgedruckt und sortiert.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-custom-toolbar"]',
    }),
    ackStep({
      id: 'backshop-deep-custom-add',
      headline: 'Neu anlegen',
      body: 'Mit dem Plus-Button erstellst du ein eigenes Backshop-Produkt. Bezeichnungsregeln greifen automatisch.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-custom-add-button"]',
    }),
    navStep({
      id: 'backshop-deep-back-from-custom',
      headline: 'Zurück',
      body: 'Zurück zur Backshop-Liste.',
      fierKey: 'walk',
      matchesPath: onMain,
    }),

    actionStep({
      id: 'backshop-deep-open-hidden',
      headline: 'Ausgeblendete',
      body: 'Fier: Öffne „Ausgeblendete“. Hier siehst du beide Sichten: manuell verborgene Artikel und Regel-Treffer.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-master-quick-hidden"]',
      predicate: pathContains(getPathname, '/backshop-hidden-products'),
    }),
    ackStep({
      id: 'backshop-deep-hidden-toolbar',
      headline: 'Ausblende-Modi',
      body: 'Über die Toolbar wechselst du zwischen manuell und regelbasiert. Beides wirkt zusammen auf die Backshop-Liste.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-hidden-toolbar"]',
    }),
    ackStep({
      id: 'backshop-deep-hidden-mode-manual',
      headline: 'Manuell',
      body: 'Im Modus „Manuell“ siehst du einzeln verborgene Artikel und kannst sie wieder einblenden.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-hidden-mode-manual"]',
    }),
    ackStep({
      id: 'backshop-deep-hidden-mode-rule',
      headline: 'Regel',
      body: 'Im Modus „Regel“ pflegst du Schlagwort-Regeln. Treffer werden automatisch ausgeblendet.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-hidden-mode-rule"]',
    }),
    ackStep({
      id: 'backshop-deep-hidden-add',
      headline: 'Eintrag hinzufügen',
      body: 'Mit dem Plus-Button fügst du einen Eintrag im aktiven Modus hinzu (manuell oder als Regel).',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-hidden-add-button"]',
    }),
    navStep({
      id: 'backshop-deep-back-from-hidden',
      headline: 'Zurück',
      body: 'Zurück zur Backshop-Liste.',
      fierKey: 'walk',
      matchesPath: onMain,
    }),

    actionStep({
      id: 'backshop-deep-open-werbung',
      headline: 'Werbung',
      body: 'Fier: Öffne „Werbung“. Du siehst zentrale und eigene Aktionen für Backshop-Artikel.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-master-quick-offer"]',
      predicate: pathContains(getPathname, '/backshop-offer-products'),
    }),
    ackStep({
      id: 'backshop-deep-werbung-zentral',
      headline: 'Zentrale Aktionen',
      body: 'Im oberen Abschnitt siehst du die Aktionen, die zentral fürs ganze Unternehmen gepflegt werden.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-offer-section-zentral"]',
    }),
    ackStep({
      id: 'backshop-deep-werbung-eigen',
      headline: 'Eigene Aktionen',
      body: 'Im unteren Abschnitt pflegst du Aktionen nur für deinen Markt – z. B. lokale Sonderaktionen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-offer-section-eigen"]',
    }),
    ackStep({
      id: 'backshop-deep-werbung-add',
      headline: 'Aktion anlegen',
      body: 'Mit dem Plus-Button legst du eine eigene Aktion an. Über Excel-Import geht das auch im Block.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-offer-add-button"]',
    }),

    navStep({
      id: 'backshop-deep-back-from-werbung',
      headline: 'Zurück',
      body: 'Zurück zur Backshop-Liste – wir schauen noch kurz auf den PDF-Export.',
      fierKey: 'walk',
      matchesPath: onMain,
    }),
    ackStep({
      id: 'backshop-deep-pdf',
      headline: 'PDF-Export',
      body: 'Über das PDF-Symbol exportierst du die aktive Backshop-Liste – bereit zum Drucken.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-master-pdf-export"]',
    }),
  ]
}
