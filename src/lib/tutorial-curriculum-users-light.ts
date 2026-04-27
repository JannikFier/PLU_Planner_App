import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep } from '@/lib/tutorial-curriculum-style'

/**
 * Benutzerverwaltung "light" (PR 3.0 B8): bewusst nur ~5 Schritte, da der
 * eigentliche User-Lifecycle (anlegen/loeschen/Rollen) in der App selbst
 * pragmatisch gehalten ist und kein tiefer Onboarding-Pfad benoetigt wird.
 *
 * Reine Ack-Schritte – die echten Klicks erfolgen ueber die existierenden
 * `buildAdminUsersInteractiveTasks` (Driver-Tour bzw. interaktive Coach-Reihe).
 */
export function buildUsersLightTasks(getPathname: () => string): TutorialTask[] {
  void getPathname
  return [
    ackStep({
      id: 'users-light-page',
      headline: 'Benutzer',
      body: 'Hier verwaltest du die Mitarbeitenden deines Marktes – Rollen, Passwörter und Zugriffe.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="user-management-page"]',
    }),
    ackStep({
      id: 'users-light-list',
      headline: 'Liste',
      body: 'Die Liste zeigt alle Mitarbeitenden mit ihrer Rolle. Inaktive Konten erkennst du am Status.',
      fierKey: 'data',
      nearSelector: '[data-tour="user-management-list"]',
    }),
    ackStep({
      id: 'users-light-new',
      headline: 'Neu anlegen',
      body: 'Mit „Neuer Benutzer“ legst du ein Konto an. Im Testmodus läuft das ohne echte E-Mail – nur als Vorschau.',
      fierKey: 'point',
      nearSelector: '[data-tour="user-management-new-user"]',
    }),
    ackStep({
      id: 'users-light-edit',
      headline: 'Rolle ändern',
      body: 'Über „Bearbeiten“ änderst du Rolle (Admin/User/Viewer) und Zugriffe einer Person.',
      fierKey: 'point',
      nearSelector: '[data-tour="user-management-row-edit"]',
    }),
    ackStep({
      id: 'users-light-reset',
      headline: 'Passwort',
      body: 'Mit „Passwort zurücksetzen“ schickst du der Person einen Reset-Link – im Testmodus simulierst du den Vorgang.',
      fierKey: 'success',
      nearSelector: '[data-tour="user-management-row-reset-pw"]',
    }),
  ]
}
