import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import { ackStep } from '@/lib/tutorial-curriculum-style'

function isBareRoleDashboard(path: string): boolean {
  const t = path.replace(/\/+$/, '') || '/'
  return t === '/user' || t === '/admin' || t === '/viewer'
}

/** Radix DropdownTrigger am Profil-Button: `data-state="open"` wenn Menü offen. */
export function isTutorialProfileMenuOpen(): boolean {
  const el = document.querySelector('[data-tour="profile-menu"]')
  return el?.getAttribute('data-state') === 'open'
}

/**
 * Klick-Kette Basics (User/Admin): Profilmenü öffnen, Testmodus aktivieren.
 * Viewer: leeres Array.
 */
export function buildBasicsInteractiveTasks(opts: {
  showTestModeStep: boolean
  getTestMode: () => boolean
}): TutorialTask[] {
  if (!opts.showTestModeStep) return []
  return [
    {
      id: 'basics-open-profile',
      headline: 'Profilmenü öffnen',
      body: 'Fier: Klicke oben rechts auf dein Profilbild. Im Menü siehst du u. a. „Einführung wiederholen“ und „Testmodus starten“.',
      fierKey: 'point',
      nearSelector: '[data-tour="profile-menu"]',
      pollIntervalMs: 200,
      validate: () => isTutorialProfileMenuOpen(),
    },
    {
      id: 'basics-start-testmode',
      headline: 'Testmodus starten',
      body: 'Wähle „Testmodus starten“. So probierst du alles gefahrlos aus – Änderungen werden beim Beenden des Testmodus verworfen.',
      fierKey: 'think',
      nearSelector: '[data-tour="profile-menu"]',
      pollIntervalMs: 200,
      validate: () => opts.getTestMode(),
    },
  ]
}

/**
 * Nach interaktivem „Testmodus starten“: gleicher Coach-Stil wie die anderen Basics-Schritte
 * (Fier + Pfeil auf den Badge), mit explizitem „Weiter“ statt driver.js-Einzelschritt.
 */
export function buildBasicsTestModeExitAcknowledgeTasks(): TutorialTask[] {
  return [
    {
      id: 'basics-testmode-exit-hinweis',
      headline: 'Testmodus aktiv',
      body:
        'Der gelbe Rahmen zeigt, dass du im Testmodus bist. Unten rechts kannst du ihn später mit „Testmodus beenden“ wieder ausschalten – alle Test-Änderungen werden dann verworfen.',
      fierKey: 'point',
      nearSelector: '[data-tour="testmode-exit-button"]',
      requiresAcknowledge: true,
      validate: () => false,
    },
  ]
}

/**
 * Dashboard-Spotlights (Willkommen + Kacheln) – gleicher Coach wie Profil/Testmodus,
 * Texte analog zu {@link buildBasicsSteps} bei `skipProfileSpotlight` + `omitTestModeExitStep`.
 */
export function buildBasicsDashboardSpotCoachTasks(ctx: {
  obstVisible: boolean
  backshopVisible: boolean
  showUsersCard: boolean
  showTestModeStep: boolean
}): TutorialTask[] {
  const welcomeIntro =
    'Fier führt dich durch die wichtigsten Stellen. Du kannst die Tour jederzeit überspringen; danach fragt dich die App, ob wir sie beim nächsten Mal wieder anzeigen sollen.'

  const tasks: TutorialTask[] = [
    {
      id: 'basics-dash-welcome',
      headline: ctx.showTestModeStep ? 'Dein Startpunkt' : 'Willkommen – ich bin Fier',
      body: ctx.showTestModeStep
        ? 'Hier siehst du, welche Bereiche für deinen Markt freigeschaltet sind.'
        : `${welcomeIntro} Hier siehst du, welche Bereiche für deinen Markt freigeschaltet sind.`,
      fierKey: 'pdown',
      nearSelector: '[data-tour="dashboard-welcome"]',
      requiresAcknowledge: true,
      validate: () => false,
    },
  ]

  if (ctx.obstVisible) {
    tasks.push({
      id: 'basics-dash-obst',
      headline: 'Obst und Gemüse',
      body: 'Über diese Kachel erreichst du die PLU-Liste inkl. eigener Produkte, Werbung und PDF.',
      fierKey: 'point',
      nearSelector: '[data-tour="dashboard-card-obst"]',
      requiresAcknowledge: true,
      validate: () => false,
    })
  }
  if (ctx.backshopVisible) {
    tasks.push({
      id: 'basics-dash-backshop',
      headline: 'Backshop',
      body: 'Hier arbeitest du mit der Backshop-Liste und den zugehörigen Funktionen.',
      fierKey: 'point',
      nearSelector: '[data-tour="dashboard-card-backshop"]',
      requiresAcknowledge: true,
      validate: () => false,
    })
  }
  if (ctx.showUsersCard) {
    tasks.push({
      id: 'basics-dash-users',
      headline: 'Benutzer',
      body: 'Als Admin legst du hier Personal an und setzt Passwörter zurück.',
      fierKey: 'point',
      nearSelector: '[data-tour="dashboard-card-users"]',
      requiresAcknowledge: true,
      validate: () => false,
    })
  }

  return tasks
}

/**
 * Header-Hints (PR 3.0 B1): nach den Dashboard-Spotlights, vor dem Pick.
 *
 * Reine Ack-Hinweise (kein nearSelector noetig, Coach zentriert) zu KW,
 * Markt-Wechsel, Profil-Menue-Inhalten, Glocke und Tutorial-Icon. Capabilities:
 *  - hasMultipleStores: blendet den Markt-Wechsel-Hinweis aus, wenn der User
 *    nur einen Markt hat.
 *  - showAdminArea: blendet den Admin-Bereich-Hinweis aus, wenn die Person
 *    keinen Admin-Wechsel hat (User/Viewer).
 *  - bellVisibleOnDashboard: blendet den Glocken-Hinweis aus (Viewer/SA).
 */
export function buildBasicsHeaderHintsTasks(opts: {
  hasMultipleStores: boolean
  showAdminArea: boolean
  bellVisibleOnDashboard: boolean
}): TutorialTask[] {
  const tasks: TutorialTask[] = []
  tasks.push(
    ackStep({
      id: 'basics-header-kw',
      headline: 'Kalenderwoche',
      body: 'Oben im Header siehst du die aktuelle KW. Listen, PDFs und Werbung beziehen sich auf diese Woche.',
      fierKey: 'data',
    }),
  )
  if (opts.hasMultipleStores) {
    tasks.push(
      ackStep({
        id: 'basics-header-store',
        headline: 'Markt wechseln',
        body: 'Im Header steht dein aktueller Markt. Über den Markt-Schalter wechselst du zu einem anderen, zu dem du Zugriff hast.',
        fierKey: 'walk',
      }),
    )
  }
  if (opts.bellVisibleOnDashboard) {
    tasks.push(
      ackStep({
        id: 'basics-header-bell',
        headline: 'Glocke',
        body: 'Die Glocke sammelt Hinweise zu neuen Listen und Versionswechseln. Sie zeigt sich nur dort, wo es etwas zu melden gibt.',
        fierKey: 'data',
      }),
    )
  }
  tasks.push(
    ackStep({
      id: 'basics-header-tutorial-icon',
      headline: 'Tour-Icon',
      body: 'Solange die Tour läuft, kannst du oben rechts über das Tour-Icon weitermachen oder neu starten.',
      fierKey: 'point',
      nearSelector: '[data-tour="header-tutorial-icon"]',
    }),
  )
  tasks.push(
    ackStep({
      id: 'basics-header-profile-replay',
      headline: 'Wiederholen',
      body: 'In deinem Profilmenü findest du jederzeit „Einführung wiederholen“ – falls du etwas später nochmal sehen möchtest.',
      fierKey: 'think',
    }),
  )
  if (opts.showAdminArea) {
    tasks.push(
      ackStep({
        id: 'basics-header-profile-admin',
        headline: 'Admin-Bereich',
        body: 'Im Profilmenü kommst du in den Admin-Bereich – dort verwaltest du Layout, Regeln und Benutzer.',
        fierKey: 'walk',
      }),
    )
  }
  return tasks
}

/**
 * Nach der Basics-driver-Tour: Nutzer soll eine Kachel wählen (Navigation weg vom nackten Dashboard).
 */
export function buildBasicsPickAreaTasks(getPathname: () => string): TutorialTask[] {
  return [
    {
      id: 'basics-pick-area',
      headline: 'Wähle einen Bereich',
      body: 'Fier: Klicke auf eine Kachel (Obst und Gemüse, Backshop oder Benutzer), mit der du weitermachen möchtest.',
      fierKey: 'pdown',
      nearSelector: '[data-tour="dashboard-welcome"]',
      pollIntervalMs: 200,
      validate: () => !isBareRoleDashboard(getPathname()),
    },
  ]
}
