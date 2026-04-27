import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, actionStep, navStep, pathContains } from '@/lib/tutorial-curriculum-style'

function onMasterlistOnly(getPathname: () => string): boolean {
  const p = getPathname()
  return (
    p.includes('/masterlist')
    && !p.includes('/custom-products')
    && !p.includes('/hidden-products')
    && !p.includes('/offer-products')
    && !p.includes('/renamed-products')
  )
}

/**
 * Vertiefung Obst-Masterliste (PR 3.0 B2): kompletter Rundgang durch Toolbar,
 * Eigene Produkte, Ausgeblendete, Umbenannte, Werbung und PDF-Hinweis.
 *
 * Reihenfolge:
 *   1- 3  Toolbar / Suche / Kontext
 *   4- 6  Eigene Produkte (Add + Excel-Import)
 *   7    zurueck
 *   8-10  Ausgeblendete (Add-Schlagwort-Hinweis)
 *  11    zurueck
 *  12-14  Umbenannte (Add + Reset)
 *  15    zurueck
 *  16-19  Werbung (zentrale + eigene + Add)
 *  20    PDF-Hinweis und zurueck
 */
export function buildObstDeepTasks(getPathname: () => string): TutorialTask[] {
  const onList = () => onMasterlistOnly(getPathname)

  return [
    ackStep({
      id: 'obst-deep-toolbar',
      headline: 'Obst-Liste',
      body: 'Hier siehst du die aktuelle PLU-Liste deines Marktes – inklusive Werbung, eigener Produkte und PDF-Export.',
      fierKey: 'data',
      nearSelector: '[data-tour="masterlist-toolbar-actions"]',
    }),
    ackStep({
      id: 'obst-deep-search',
      headline: 'Suche',
      body: 'Mit der Suche filterst du blitzschnell nach PLU oder Bezeichnung. Die Ergebnisse markiert Fier farbig in der Liste.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-search"]',
    }),
    ackStep({
      id: 'obst-deep-context',
      headline: 'Kontext',
      body: 'Direkt unter der Suche stehen Markt, KW und Versions-Info – so weißt du jederzeit, woher die Daten stammen.',
      fierKey: 'data',
      nearSelector: '[data-tour="masterlist-context-line"]',
    }),

    actionStep({
      id: 'obst-deep-open-own',
      headline: 'Eigene Produkte',
      body: 'Fier: Klicke auf „Eigene Produkte“ – hier pflegst du Markt-spezifische Artikel.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-toolbar-eigene-produkte"]',
      predicate: pathContains(getPathname, '/custom-products'),
    }),
    ackStep({
      id: 'obst-deep-own-add',
      headline: 'Neu anlegen',
      body: 'Mit dem Plus-Button legst du ein neues eigenes Produkt an. Bezeichnungsregeln greifen automatisch.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-custom-add-button"]',
    }),
    ackStep({
      id: 'obst-deep-own-excel',
      headline: 'Excel-Import',
      body: 'Du kannst eine ganze Liste eigener Produkte aus Excel importieren – bequem für Saison-Updates.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-custom-excel-button"]',
    }),
    navStep({
      id: 'obst-deep-back-from-own',
      headline: 'Zurück',
      body: 'Geh über den Zurück-Pfeil oder die Navigation zur Obst-Liste.',
      fierKey: 'walk',
      matchesPath: onList,
    }),

    actionStep({
      id: 'obst-deep-open-hidden',
      headline: 'Ausgeblendete',
      body: 'Fier: Öffne „Ausgeblendete“. Hier siehst du, was per Regel oder manuell verborgen ist.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-toolbar-ausgeblendete"]',
      predicate: pathContains(getPathname, '/hidden-products'),
    }),
    ackStep({
      id: 'obst-deep-hidden-toolbar',
      headline: 'Schlagwort-Regeln',
      body: 'Über die Toolbar pflegst du Schlagwort-Regeln. Treffer werden automatisch ausgeblendet.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-hidden-toolbar"]',
    }),
    ackStep({
      id: 'obst-deep-hidden-add',
      headline: 'Manuell ausblenden',
      body: 'Mit dem Plus-Button blendest du einzelne Artikel manuell aus, ohne eine Regel zu erstellen.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-hidden-add-button"]',
    }),
    navStep({
      id: 'obst-deep-back-from-hidden',
      headline: 'Zurück',
      body: 'Zurück zur Obst-Liste.',
      fierKey: 'walk',
      matchesPath: onList,
    }),

    actionStep({
      id: 'obst-deep-open-renamed',
      headline: 'Umbenannte',
      body: 'Fier: Klicke auf „Umbenennen“ – dort pflegst du eigene Anzeige-Namen abweichend vom Master.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-toolbar-umbenennen"]',
      predicate: pathContains(getPathname, '/renamed-products'),
    }),
    ackStep({
      id: 'obst-deep-renamed-toolbar',
      headline: 'Eigene Namen',
      body: 'Hier hinterlegst du Anzeige-Namen für PLUs. Sie wirken in PDF und Liste, ohne den Master zu ändern.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-renamed-toolbar"]',
    }),
    ackStep({
      id: 'obst-deep-renamed-add',
      headline: 'Eintrag anlegen',
      body: 'Mit dem Plus-Button legst du eine neue Umbenennung an. Bestehende Einträge kannst du jederzeit zurücksetzen.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-renamed-add-button"]',
    }),
    navStep({
      id: 'obst-deep-back-from-renamed',
      headline: 'Zurück',
      body: 'Zurück zur Obst-Liste.',
      fierKey: 'walk',
      matchesPath: onList,
    }),

    actionStep({
      id: 'obst-deep-open-werbung',
      headline: 'Werbung',
      body: 'Fier: Öffne „Werbung“. Dort siehst du zentrale Aktionen und kannst eigene Angebote pflegen.',
      fierKey: 'point',
      nearSelector: '[data-tour="masterlist-toolbar-werbung"]',
      predicate: pathContains(getPathname, '/offer-products'),
    }),
    ackStep({
      id: 'obst-deep-werbung-zentral',
      headline: 'Zentrale Werbung',
      body: 'Im oberen Bereich findest du die Aktionen, die zentral fürs ganze Unternehmen ausgespielt werden.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-offer-section-zentral"]',
    }),
    ackStep({
      id: 'obst-deep-werbung-eigen',
      headline: 'Eigene Aktionen',
      body: 'Im unteren Abschnitt pflegst du Aktionen, die nur dein Markt zeigt – z. B. lokale Schwankungen.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-offer-section-eigen"]',
    }),
    ackStep({
      id: 'obst-deep-werbung-add',
      headline: 'Aktion anlegen',
      body: 'Mit dem Plus-Button legst du eine neue eigene Aktion an. Excel-Import funktioniert genauso wie bei eigenen Produkten.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-offer-add-button"]',
    }),

    navStep({
      id: 'obst-deep-back-from-werbung',
      headline: 'Zurück',
      body: 'Zurück zur Obst-Liste – wir schauen noch kurz auf den PDF-Export.',
      fierKey: 'walk',
      matchesPath: onList,
    }),
    ackStep({
      id: 'obst-deep-pdf',
      headline: 'PDF-Export',
      body: 'Über das PDF-Symbol exportierst du die aktuelle Liste als Druckansicht – inklusive deiner Anpassungen.',
      fierKey: 'data',
      nearSelector: '[data-tour="masterlist-toolbar-pdf"]',
    }),
  ]
}

/**
 * Stiller Marker fuer Tests/Selector-Validation: zaehlt Tasks unabhaengig vom getPathname.
 * Liefert die Anzahl der Tasks, die immer existieren (Snapshot-Anker).
 */
export function obstDeepStaticTaskCount(): number {
  return buildObstDeepTasks(() => '/').length
}
