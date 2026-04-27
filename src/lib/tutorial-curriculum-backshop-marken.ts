import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep, navStep, pathContains } from '@/lib/tutorial-curriculum-style'

/**
 * Vertiefung Marken-Auswahl (PR 3.0 B4): Tinder-aehnliche Markenwahl pro
 * Warengruppe, inkl. Status-Band, Sidebar, Liste, Vorschau und Zusammenhang
 * mit Gruppenregeln (Fallback).
 *
 * Ziel: ~10 Steps. Reine Hinweise (Acknowledge), keine Pflicht-Klicks – damit
 * die Tour auch ohne tatsaechliche Markenwahl-Aenderung durchlaeuft.
 */
export function buildBackshopMarkenTasks(getPathname: () => string): TutorialTask[] {
  return [
    ackStep({
      id: 'backshop-marken-page',
      headline: 'Marken-Auswahl',
      body: 'Hier wählst du pro Warengruppe, welche Marken in deinem Markt sichtbar sein sollen – z. B. Edeka, Harry oder Aryzta.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="backshop-marken-auswahl-page"]',
    }),
    ackStep({
      id: 'backshop-marken-status',
      headline: 'Status',
      body: 'Das Status-Band zeigt dir, wie viele Gruppen schon entschieden sind und wie viele noch warten.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-marken-auswahl-status"]',
    }),
    ackStep({
      id: 'backshop-marken-sidebar',
      headline: 'Warengruppen',
      body: 'Links siehst du alle Warengruppen mit Status. Klicke eine Gruppe an, um die Marken-Karten zu sehen.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-marken-auswahl-sidebar"]',
    }),
    ackStep({
      id: 'backshop-marken-list',
      headline: 'Marken-Karten',
      body: 'In der Mitte siehst du Karten je Marke. Tippen oder klicken aktiviert/deaktiviert die Marke für deinen Markt.',
      fierKey: 'point',
      nearSelector: '[data-tour="backshop-marken-auswahl-list"]',
    }),
    ackStep({
      id: 'backshop-marken-source-badges',
      headline: 'Quell-Badges',
      body: 'Jede Karte zeigt die Quelle der Daten. So siehst du sofort, ob ein Vorschlag aus der zentralen Master oder lokal stammt.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-marken-auswahl-list"]',
    }),
    ackStep({
      id: 'backshop-marken-preview',
      headline: 'Vorschau',
      body: 'Rechts siehst du, welche Artikel mit deiner aktuellen Auswahl in der Backshop-Liste landen.',
      fierKey: 'data',
      nearSelector: '[data-tour="backshop-marken-auswahl-preview"]',
    }),
    ackStep({
      id: 'backshop-marken-auswahl-aktion',
      headline: 'Auswahl treffen',
      body: 'Du kannst pro Karte einzeln entscheiden oder die Sidebar nutzen, um den Status auf einen Blick zu prüfen.',
      fierKey: 'think',
    }),
    ackStep({
      id: 'backshop-marken-fallback',
      headline: 'Gruppenregeln-Fallback',
      body: 'Hast du für eine Gruppe nichts entschieden, greift die Grundregel aus der Konfiguration als Fallback.',
      fierKey: 'data',
    }),
    ackStep({
      id: 'backshop-marken-testmodus',
      headline: 'Testmodus',
      body: 'Im Testmodus wirken Änderungen nur in deiner Sitzung. Du kannst also gefahrlos durch die Karten schwingen.',
      fierKey: 'think',
    }),
    navStep({
      id: 'backshop-marken-back',
      headline: 'Zurück',
      body: 'Geh zurück zur Backshop-Liste – dort siehst du die Wirkung deiner Markenwahl direkt.',
      fierKey: 'walk',
      matchesPath: pathContains(getPathname, '/backshop-list', '/admin', '/user', '/viewer'),
    }),
  ]
}
