import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep } from '@/lib/tutorial-curriculum-style'

/**
 * Tour-Abschluss (PR 3.0 B10): zusammenfassend, mit Replay-Hinweis, Glocke,
 * KW-Erinnerung und finalem Fier-Gruss. Die einzelnen Steps sind reine
 * Acknowledge-Schritte, damit die Kette nicht haengt.
 *
 * Fuer Rueckwaertskompatibilitaet behalten wir die alte Single-Step-Variante
 * unter dem urspruenglichen Funktions-Export. Sie nutzt nun die neue Sequenz
 * mit dem `bell`-Toggle aus den Optionen.
 */
export function buildTourClosingTasks(_getPathname: () => string, opts: { showBellHint: boolean }): TutorialTask[] {
  const tasks: TutorialTask[] = []
  tasks.push(
    ackStep({
      id: 'closing-summary',
      headline: 'Überblick',
      body: 'Du kennst jetzt Liste, Werbung, eigene Produkte, Ausgeblendete und Umbenannte. Damit deckst du den Alltag ab.',
      fierKey: 'pdown',
    }),
  )
  tasks.push(
    ackStep({
      id: 'closing-replay',
      headline: 'Wiederholen',
      body: 'Im Profilmenü findest du jederzeit „Einführung wiederholen“ – sowohl ganz von vorn als auch nur einzelne Module.',
      fierKey: 'walk',
    }),
  )
  if (opts.showBellHint) {
    tasks.push(
      ackStep({
        id: 'closing-bell',
        headline: 'Glocke',
        body: 'Die Glocke oben rechts sammelt Hinweise zu neuen Listen und Versions-Wechseln – sie zeigt sich nur dort, wo es etwas zu melden gibt.',
        fierKey: 'data',
      }),
    )
  }
  tasks.push(
    ackStep({
      id: 'closing-kw',
      headline: 'Kalenderwoche',
      body: 'Wenn die Woche wechselt, ändern sich Werbung und ggf. Backshop-Versionen. Halte die KW im Header im Blick.',
      fierKey: 'think',
    }),
  )
  tasks.push(
    ackStep({
      id: 'closing-wrap',
      headline: 'Viel Erfolg',
      body: 'Wenn dir etwas fehlt, sag Bescheid – wir bauen das Tutorial weiter aus. Bis bald, Fier.',
      fierKey: 'success',
    }),
  )
  return tasks
}
