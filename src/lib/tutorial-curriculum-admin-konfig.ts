import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, actionStep, navStep, pathContains } from '@/lib/tutorial-curriculum-style'

/**
 * Admin-Konfiguration Backshop (PR 3.0 B7): Vollausbau ueber Layout-Switches,
 * Bezeichnungsregeln und Gruppenregeln. Block-Sort ist optional und wird nur
 * als Hinweis angerissen, da er fuer viele Maerkte nicht relevant ist.
 *
 * Reihenfolge (~11 Steps):
 *  1   Hub-Intro
 *  2-9 Layout (Anzeige, Fluss, PDF, Fonts, Markierungs-Dauer, KW, Features, Save)
 * 10  zurueck
 * 11  Bezeichnungsregeln + Schlagwort-Hinweis
 * 12  zurueck
 * 13  Gruppenregeln (mit korrigiertem Testmodus-Hinweis dank A1)
 */
export function buildAdminBackshopKonfigDeepTasks(getPathname: () => string): TutorialTask[] {
  return [
    ackStep({
      id: 'admin-bs-konfig-landing',
      headline: 'Konfiguration Backshop',
      body: 'Hier passt du Darstellung, Bezeichnungen und Gruppenregeln für den Backshop deines Marktes an.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-konfig-hub-page"]',
    }),
    actionStep({
      id: 'admin-bs-konfig-open-layout',
      headline: 'Layout öffnen',
      body: 'Fier: Klicke auf „Layout Backshop“. Dort steuerst du Schrift, Reihenfolge und PDF-Verhalten.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-konfig-hub-layout-card"]',
      predicate: pathContains(getPathname, '/admin/backshop-layout'),
    }),
    ackStep({
      id: 'admin-bs-layout-display',
      headline: 'Anzeige-Modus',
      body: 'Wähle, ob die Liste nach Sorten zusammengefasst oder pro Block einzeln dargestellt wird.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-display-mode-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-flow',
      headline: 'Flussrichtung',
      body: 'Bestimmt, ob Spalten von oben nach unten oder von links nach rechts gefüllt werden.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-flow-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-pdf',
      headline: 'PDF-Optionen',
      body: 'Steuert Seitenumbruch und Druckverhalten – z. B. ob neue Blöcke automatisch eine neue Seite starten.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-pdf-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-fonts',
      headline: 'Schriftgrößen',
      body: 'Du kannst Schriftgrößen für Listen-Header, Gruppenüberschriften und Produktzeilen separat anpassen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-fonts-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-mark-duration',
      headline: 'Markierungs-Dauer',
      body: 'Über die Markierungs-Dauer steuerst du, wie lange neue oder veränderte Artikel rot/gelb hervorgehoben bleiben.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-mark-duration-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-kw',
      headline: 'Kalenderwoche',
      body: 'Schaltest du die KW-Anzeige ein, erscheint die aktuelle Woche in Liste und PDF mit.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-kw-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-features',
      headline: 'Funktionen',
      body: 'Hier schaltest du einzelne Komfort-Features ein oder aus – z. B. Quell-Badges oder Carry-Over-Banner.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-features-card"]',
    }),
    ackStep({
      id: 'admin-bs-layout-save',
      headline: 'Speichern',
      body: 'Änderungen speichern sich automatisch – der Save-Status oben zeigt dir die aktuelle Sicherung an.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-layout-save-status"]',
    }),

    navStep({
      id: 'admin-bs-konfig-back',
      headline: 'Zurück',
      body: 'Geh über den Zurück-Pfeil zur Konfigurations-Übersicht.',
      fierKey: 'walk',
      matchesPath: pathContains(getPathname, '/admin/backshop/konfiguration'),
    }),
    actionStep({
      id: 'admin-bs-rules-open',
      headline: 'Bezeichnungsregeln',
      body: 'Fier: Öffne „Bezeichnungsregeln“. Hier pflegst du Bio-Kennzeichen und Namensmuster.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-konfig-hub-rules-card"]',
      predicate: pathContains(getPathname, '/admin/backshop-rules'),
    }),
    ackStep({
      id: 'admin-bs-rules-keywords',
      headline: 'Schlagwort hinzufügen',
      body: 'Über das Plus erstellst du ein neues Schlagwort. Treffer im Backshop werden automatisch ergänzt.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-konfig-rules-add-button"]',
    }),
    ackStep({
      id: 'admin-bs-rules-list',
      headline: 'Schlagwort-Liste',
      body: 'Aktive Schlagwörter findest du als Badges. Klick auf eines zum Bearbeiten oder Entfernen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-konfig-rules-badge-list"]',
    }),

    navStep({
      id: 'admin-bs-konfig-back-2',
      headline: 'Zurück',
      body: 'Zurück zur Konfigurations-Übersicht.',
      fierKey: 'walk',
      matchesPath: pathContains(getPathname, '/admin/backshop/konfiguration'),
    }),
    actionStep({
      id: 'admin-bs-gruppenregeln',
      headline: 'Gruppenregeln',
      body: 'Fier: Öffne „Gruppenregeln“. Hier legst du bevorzugte Marken pro Warengruppe fest.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-konfig-hub-gruppenregeln-card"]',
      predicate: pathContains(getPathname, '/admin/backshop-gruppenregeln'),
    }),
    ackStep({
      id: 'admin-bs-gruppenregeln-info',
      headline: 'Marken-Wahl',
      body: 'Im Testmodus wirken Änderungen nur in deiner Sitzung – probier ruhig aus, ohne dass etwas live geht.',
      fierKey: 'think',
      nearSelector: '[data-tour="backshop-konfig-gruppenregeln-page"]',
    }),
  ]
}

/**
 * Admin-Konfiguration Obst (PR 3.0 B7): analog zur Backshop-Konfig.
 *
 * Reihenfolge (~11 Steps):
 *  1   Hub-Intro
 *  2-9 Layout (Anzeige, Sortierung, Fluss, Fonts, Markierungs-Dauer, KW, Features)
 * 10  zurueck
 * 11  Bezeichnungsregeln + Schlagwort + Block-Sort-Hinweis
 */
export function buildAdminObstKonfigDeepTasks(getPathname: () => string): TutorialTask[] {
  return [
    ackStep({
      id: 'admin-ob-konfig-landing',
      headline: 'Konfiguration Obst',
      body: 'Hier passt du Darstellung und Regeln für die Obst-Liste an. Layout und Bezeichnungsregeln decken den Großteil ab.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="obst-konfig-hub-page"]',
    }),
    actionStep({
      id: 'admin-ob-konfig-open-layout',
      headline: 'Layout öffnen',
      body: 'Fier: Klicke auf „Layout“. Dort steuerst du Schrift, Reihenfolge und KW-Anzeige.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-konfig-hub-layout-card"]',
      predicate: pathContains(getPathname, '/admin/layout'),
    }),
    ackStep({
      id: 'admin-ob-layout-display',
      headline: 'Anzeige-Modus',
      body: 'Bestimmt, ob die Liste nach Warengruppen zusammengefasst oder fortlaufend dargestellt wird.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-display-mode-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-sort',
      headline: 'Sortier-Modus',
      body: 'Mit dem Sortier-Modus wählst du Alphabet, manuelle Reihenfolge oder Block-Sortierung.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-sort-mode-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-flow',
      headline: 'Flussrichtung',
      body: 'Steuert, ob die Spalten in der Liste vertikal oder horizontal gefüllt werden.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-flow-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-fonts',
      headline: 'Schriftgrößen',
      body: 'Schriftgrößen für Header, Gruppen und Produktzeilen pflegst du hier zentral.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-fonts-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-mark-duration',
      headline: 'Markierungs-Dauer',
      body: 'Bestimmt, wie lange neue oder veränderte Artikel hervorgehoben bleiben (rot/gelb).',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-mark-duration-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-kw',
      headline: 'Kalenderwoche',
      body: 'Mit der KW-Anzeige siehst du in Liste und PDF, auf welche Woche sich die Daten beziehen.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-kw-card"]',
    }),
    ackStep({
      id: 'admin-ob-layout-features',
      headline: 'Funktionen',
      body: 'Hier aktivierst du einzelne Komfort-Features – z. B. Excel-Import oder erweiterte Filter.',
      fierKey: 'data',
      nearSelector: '[data-tour="obst-konfig-layout-features-card"]',
    }),

    navStep({
      id: 'admin-ob-konfig-back',
      headline: 'Zurück',
      body: 'Geh über den Zurück-Pfeil zur Konfigurations-Übersicht.',
      fierKey: 'walk',
      matchesPath: pathContains(getPathname, '/admin/obst/konfiguration'),
    }),
    actionStep({
      id: 'admin-ob-rules-open',
      headline: 'Bezeichnungsregeln',
      body: 'Fier: Öffne „Bezeichnungsregeln“. Hier pflegst du Bio-Kennzeichen und Namensmuster für Obst.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-konfig-hub-rules-card"]',
      predicate: pathContains(getPathname, '/admin/rules'),
    }),
    ackStep({
      id: 'admin-ob-rules-keywords',
      headline: 'Schlagwort hinzufügen',
      body: 'Über das Plus erstellst du ein neues Schlagwort. Treffer im Sortiment werden automatisch ergänzt.',
      fierKey: 'point',
      nearSelector: '[data-tour="obst-konfig-rules-add-button"]',
    }),
  ]
}
