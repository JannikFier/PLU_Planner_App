import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, navStep } from '@/lib/tutorial-curriculum-style'

/**
 * Detail-Tour Hidden / Renamed / Custom (PR 3.0 B9): bringt Klarheit zu drei
 * eng verzahnten Funktionen. Sub-Sequenzen werden ueber `buildHiddenRenamedCustomTasks`
 * abhaengig von Sichtbarkeit (Obst/Backshop) zusammengefasst.
 *
 * - Hidden: Manuell vs. Schlagwort-Regel, Wieder-einblenden, Zusammenspiel.
 * - Renamed: Anzeige-Name vs. Master-Name, Reset, Auto-Apply via Bezeichnungsregeln.
 * - Custom: Neu erstellen, Auto-Bezeichnung, Excel-Import.
 */

function obstHiddenSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-obst-hidden-intro',
      headline: 'Obst Hidden',
      body: 'Ausgeblendete Obst-Artikel hast du in zwei Varianten: manuell verborgen oder per Schlagwort-Regel.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="obst-hidden-toolbar"]',
    }),
    ackStep({
      id: 'detail-obst-hidden-manual',
      headline: 'Manuell',
      body: 'Manuell ausgeblendete Artikel kannst du gezielt wieder einblenden – ein Klick reicht.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-hidden-list"]',
    }),
    ackStep({
      id: 'detail-obst-hidden-add',
      headline: 'Hinzufügen',
      body: 'Mit dem Plus-Button blendest du einen Artikel manuell aus oder erstellst eine neue Schlagwort-Regel.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-hidden-add-button"]',
    }),
  ]
}

function obstRenamedSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-obst-renamed-intro',
      headline: 'Obst Renamed',
      body: 'Hier hinterlegst du eigene Anzeige-Namen für PLUs, ohne den Master-Namen zu ändern.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="obst-renamed-toolbar"]',
    }),
    ackStep({
      id: 'detail-obst-renamed-list',
      headline: 'Eigene Namen',
      body: 'Die Liste zeigt alle Umbenennungen. Ein Reset stellt den Master-Namen wieder her.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-renamed-list"]',
    }),
    ackStep({
      id: 'detail-obst-renamed-add',
      headline: 'Eintrag anlegen',
      body: 'Mit dem Plus-Button hinterlegst du eine neue Umbenennung. Sie wirkt sofort in Liste und PDF.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-renamed-add-button"]',
    }),
  ]
}

function obstCustomSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-obst-custom-intro',
      headline: 'Obst Custom',
      body: 'Eigene Obst-Produkte ergänzen den Master. Sie erscheinen in deiner Liste wie reguläre Artikel.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="obst-custom-toolbar"]',
    }),
    ackStep({
      id: 'detail-obst-custom-list',
      headline: 'Liste',
      body: 'Eigene Produkte stehen alphabetisch oder per Sortierung zwischen den Master-Artikeln.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-custom-list"]',
    }),
    ackStep({
      id: 'detail-obst-custom-add',
      headline: 'Neu anlegen',
      body: 'Über den Plus-Button erfasst du PLU, Bezeichnung und Preis. Bezeichnungsregeln greifen automatisch.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-custom-add-button"]',
    }),
    ackStep({
      id: 'detail-obst-custom-excel',
      headline: 'Excel-Import',
      body: 'Mit dem Excel-Button importierst du eine ganze Liste eigener Produkte – ideal für Saison-Updates.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-custom-excel-button"]',
    }),
  ]
}

function backshopHiddenSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-bs-hidden-intro',
      headline: 'Backshop Hidden',
      body: 'Backshop-Artikel kannst du manuell oder per Regel ausblenden. Beide Modi liegen in einem Dialog.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-hidden-toolbar"]',
    }),
    ackStep({
      id: 'detail-bs-hidden-manual-tab',
      headline: 'Manuell',
      body: 'Im Manuell-Modus siehst du die einzeln verborgenen Artikel – jederzeit wieder einblendbar.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-hidden-mode-manual"]',
    }),
    ackStep({
      id: 'detail-bs-hidden-rule-tab',
      headline: 'Regel',
      body: 'Im Regel-Modus pflegst du Schlagwörter. Treffer werden automatisch entfernt – Listen-Pflege im Block.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-hidden-mode-rule"]',
    }),
    ackStep({
      id: 'detail-bs-hidden-list',
      headline: 'Sichtbar',
      body: 'Die Liste zeigt aktuell verborgene Artikel im aktiven Modus – beide Modi greifen zusammen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-hidden-list"]',
    }),
  ]
}

function backshopRenamedSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-bs-renamed-intro',
      headline: 'Backshop Renamed',
      body: 'Eigene Anzeige-Namen für Backshop-Artikel hinterlegst du analog zu Obst – ohne den Master zu verändern.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-renamed-toolbar"]',
    }),
    ackStep({
      id: 'detail-bs-renamed-list',
      headline: 'Liste',
      body: 'Die Liste zeigt alle Umbenennungen. Ein Reset stellt den Master-Namen wieder her.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-renamed-list"]',
    }),
    ackStep({
      id: 'detail-bs-renamed-add',
      headline: 'Eintrag anlegen',
      body: 'Mit dem Plus-Button hinterlegst du eine neue Umbenennung. Sie wirkt sofort in Liste und PDF.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-renamed-add-button"]',
    }),
  ]
}

function backshopCustomSteps(): TutorialTask[] {
  return [
    ackStep({
      id: 'detail-bs-custom-intro',
      headline: 'Backshop Custom',
      body: 'Eigene Backshop-Produkte verhalten sich wie reguläre Artikel und werden mitgedruckt.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-custom-toolbar"]',
    }),
    ackStep({
      id: 'detail-bs-custom-add',
      headline: 'Neu anlegen',
      body: 'Mit dem Plus-Button legst du ein eigenes Backshop-Produkt an. Bezeichnungsregeln greifen automatisch.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-custom-add-button"]',
    }),
  ]
}

/**
 * Kombi-Builder: liefert Hidden+Renamed+Custom-Sub-Sequenzen passend zu den
 * sichtbaren Bereichen. Schliesst mit Navigations-Steps zurueck zur jeweiligen
 * Liste, sodass der Orchestrator sauber weitergeben kann.
 */
export function buildHiddenRenamedCustomTasks(opts: {
  getPathname: () => string
  obstVisible: boolean
  backshopVisible: boolean
}): TutorialTask[] {
  const { getPathname, obstVisible, backshopVisible } = opts
  const tasks: TutorialTask[] = []

  if (obstVisible) {
    tasks.push(...obstHiddenSteps())
    tasks.push(...obstRenamedSteps())
    tasks.push(...obstCustomSteps())
    tasks.push(
      navStep({
        id: 'detail-obst-back',
        headline: 'Zurück',
        body: 'Zurück zur Obst-Liste – die Detail-Seiten kannst du jederzeit erneut öffnen.',
        fierKey: 'walk',
        matchesPath: () => {
          const p = getPathname()
          return (
            p.includes('/masterlist')
            && !p.includes('/custom-products')
            && !p.includes('/hidden-products')
            && !p.includes('/renamed-products')
          )
        },
      }),
    )
  }

  if (backshopVisible) {
    tasks.push(...backshopHiddenSteps())
    tasks.push(...backshopRenamedSteps())
    tasks.push(...backshopCustomSteps())
    tasks.push(
      navStep({
        id: 'detail-bs-back',
        headline: 'Zurück',
        body: 'Zurück zur Backshop-Liste – auch hier sind die Detail-Seiten jederzeit aufrufbar.',
        fierKey: 'walk',
        matchesPath: () => {
          const p = getPathname()
          return (
            p.includes('/backshop-list')
            && !p.includes('backshop-custom')
            && !p.includes('backshop-hidden')
            && !p.includes('backshop-renamed')
          )
        },
      }),
    )
  }

  return tasks
}
