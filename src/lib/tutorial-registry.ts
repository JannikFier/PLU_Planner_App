import type { DriveStep } from 'driver.js'

export function tutorialMasterlistPath(effectiveRole: string): string {
  if (effectiveRole === 'admin') return '/admin/masterlist'
  if (effectiveRole === 'viewer') return '/viewer/masterlist'
  return '/user/masterlist'
}

export function tutorialBackshopListPath(effectiveRole: string): string {
  if (effectiveRole === 'admin') return '/admin/backshop-list'
  if (effectiveRole === 'viewer') return '/viewer/backshop-list'
  return '/user/backshop-list'
}

export function tutorialUsersPath(effectiveRole: string): string {
  if (effectiveRole === 'admin') return '/admin/users'
  return '/admin/users'
}

export interface BasicsTourContext {
  obstVisible: boolean
  backshopVisible: boolean
  /** Admin-Dashboard: Kachel Benutzer */
  showUsersCard: boolean
  /** Testmodus-Eintrag im Profilmenü sichtbar (nicht Viewer) */
  showTestModeStep: boolean
  /** Testmodus aktiv → Badge-Spotlight im ersten driver-Segment */
  testModeActive: boolean
  /** Wenn true: kein Spotlight auf Testmodus-Badge (Aktivierung folgt über Task-Queue). */
  omitTestModeExitStep?: boolean
  /**
   * Wenn true: kein Driver-Schritt auf dem Profil-Button (Profil/Testmodus lief schon interaktiv).
   * Vermeidet doppeltes „Willkommen" direkt nach dem Welcome-Modal.
   */
  skipProfileSpotlight?: boolean
}

export function buildBasicsSteps(ctx: BasicsTourContext): DriveStep[] {
  const welcomeIntro =
    'Fier führt dich durch die wichtigsten Stellen. Du kannst die Tour jederzeit überspringen; danach fragt dich die App, ob wir sie beim nächsten Mal wieder anzeigen sollen.'

  const steps: DriveStep[] = []

  if (ctx.showTestModeStep && !ctx.skipProfileSpotlight) {
    steps.push({
      element: '[data-tour="profile-menu"]',
      popover: {
        title: 'Oben rechts: Profil',
        description:
          'Über dein Profilbild öffnest du das Menü – dort liegen u. a. „Einführung wiederholen“ und der Testmodus.',
        side: 'left',
        align: 'center',
      },
    })
  }

  steps.push({
    element: '[data-tour="dashboard-welcome"]',
    popover: {
      title: ctx.showTestModeStep ? 'Dein Startpunkt' : 'Willkommen – ich bin Fier',
      description: ctx.showTestModeStep
        ? 'Hier siehst du, welche Bereiche für deinen Markt freigeschaltet sind.'
        : `${welcomeIntro} Hier siehst du, welche Bereiche für deinen Markt freigeschaltet sind.`,
      side: 'bottom',
      align: 'start',
    },
  })

  if (ctx.obstVisible) {
    steps.push({
      element: '[data-tour="dashboard-card-obst"]',
      popover: {
        title: 'Obst und Gemüse',
        description: 'Über diese Kachel erreichst du die PLU-Liste inkl. eigener Produkte, Werbung und PDF.',
        side: 'bottom',
        align: 'start',
      },
    })
  }

  if (ctx.backshopVisible) {
    steps.push({
      element: '[data-tour="dashboard-card-backshop"]',
      popover: {
        title: 'Backshop',
        description: 'Hier arbeitest du mit der Backshop-Liste und den zugehörigen Funktionen.',
        side: 'bottom',
        align: 'start',
      },
    })
  }

  if (ctx.showUsersCard) {
    steps.push({
      element: '[data-tour="dashboard-card-users"]',
      popover: {
        title: 'Benutzer',
        description: 'Als Admin legst du hier Personal an und setzt Passwörter zurück.',
        side: 'bottom',
        align: 'start',
      },
    })
  }

  if (ctx.testModeActive && !ctx.omitTestModeExitStep) {
    steps.push({
      element: '[data-tour="testmode-exit-button"]',
      popover: {
        title: 'Testmodus aktiv',
        description:
          'Fier: Der gelbe Rahmen zeigt – du bist im Testmodus. Unten rechts beendest du ihn; alle Test-Änderungen werden dann verworfen.',
        side: 'top',
        align: 'end',
      },
    })
  }

  return steps
}

export function buildObstMasterlistSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="masterlist-toolbar-actions"]',
      popover: {
        title: 'Aktionen in der PLU-Liste',
        description:
          'Fier: Eigene Produkte, Ausgeblendete, Werbung, Umbenennen und PDF findest du hier. Die Masterliste stammt aus der zuletzt eingespielten Version.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="masterlist-search"]',
      popover: {
        title: 'Suche in der Liste',
        description:
          'Über die Lupe öffnest du die Suche. Pfeile in der Suchleiste helfen dir, Treffer schrittweise zu durchlaufen.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="masterlist-toolbar-actions"]',
      popover: {
        title: 'Markierungen in der Liste',
        description:
          'Fier: Rot markierte Zeilen = geänderte PLU. Gelb = neuer Artikel (z. B. nach Upload oder eigenen Produkten). So erkennst du schnell, was sich getan hat.',
        side: 'bottom',
        align: 'end',
      },
    },
  ]
}

export function buildBackshopListSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="backshop-master-toolbar"]',
      popover: {
        title: 'Backshop-Liste',
        description:
          'Fier: Wie bei Obst – Suche (Lupe), Aktionen (eigene Produkte, Ausgeblendete, Werbung …) und PDF sitzen in der Toolbar. Die KW-Leiste zeigt den Kontext der eingespielten Version.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="backshop-master-find-trigger"]',
      popover: {
        title: 'Suche',
        description: 'Über die Lupe suchst du nach PLU oder Artikelname – auch bei langen Listen.',
        side: 'bottom',
        align: 'start',
      },
    },
  ]
}

export function buildUsersSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="user-management-heading"]',
      popover: {
        title: 'Benutzerverwaltung',
        description:
          'Fier: Hier legst du Personal an, setzt Passwörter zurück und steuerst, welche Listen-Bereiche sichtbar sind. Mehrere Märkte sind möglich, sofern dein Administrator sie freischaltet.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="user-management-new-user"]',
      popover: {
        title: 'Neuen Benutzer anlegen',
        description:
          'Über „Neuer Benutzer“ öffnest du den Dialog. Im Testmodus simuliert die App das Anlegen – es wird kein echter Zugang erzeugt.',
        side: 'bottom',
        align: 'end',
      },
    },
  ]
}
