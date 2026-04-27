/**
 * Tutorial-Zustand (JSON in user_tutorial_state.state).
 * Wird pro User/Markt persistiert; Modul-Versionen für Feature-Updates.
 */

export const TUTORIAL_STATE_SCHEMA_VERSION = 2

/** Inhalt-Version je Modul – bei Erhöhung wird das Modul Nutzern erneut angeboten (nach Logik im Orchestrator). */
export const TUTORIAL_CONTENT_VERSIONS = {
  basics: 3,
  obst: 2,
  'obst-deep': 2,
  'obst-konfig': 1,
  backshop: 2,
  'backshop-deep': 2,
  'backshop-marken': 2,
  'backshop-konfig': 2,
  // PR 3.0 neu / aufgebohrt:
  werbung: 1,
  'backshop-upload': 1,
  'hidden-renamed-custom': 1,
  users: 3,
  closing: 2,
} as const

export type TutorialModuleKey = keyof typeof TUTORIAL_CONTENT_VERSIONS

export interface TutorialModuleProgress {
  /** Zuletzt gesehene Inhaltsversion (bei Versions-Mismatch → Modul als „ausstehend neu"). */
  contentVersionSeen: number
  lastStepIndex: number
  completed: boolean
}

export interface TutorialStatePayload {
  schemaVersion: number
  /**
   * Dauerhaft „Nicht mehr anzeigen". Früher hieß das Feld `autoDisabled`;
   * `parseTutorialState` liest beide Varianten, damit alte Rows nicht verloren gehen.
   */
  dismissedForever: boolean
  /** Beim nächsten geeigneten Besuch wieder anbieten. */
  replayOnNextLogin: boolean
  /** Wenn replay: von Schritt 0 statt fortsetzen. */
  fullResetNext: boolean
  /** Zeitstempel des letzten erfolgreichen Tour-Abschlusses (ISO). */
  lastCompletedAt?: string
  modules: Partial<Record<TutorialModuleKey, TutorialModuleProgress>>
}

export function defaultTutorialState(): TutorialStatePayload {
  return {
    schemaVersion: TUTORIAL_STATE_SCHEMA_VERSION,
    dismissedForever: false,
    replayOnNextLogin: false,
    fullResetNext: false,
    modules: {},
  }
}

export function parseTutorialState(raw: unknown): TutorialStatePayload {
  const base = defaultTutorialState()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  // Abwärtskompatibel: alter Key `autoDisabled` wird als `dismissedForever` interpretiert.
  const dismissed = typeof o.dismissedForever === 'boolean' ? o.dismissedForever : Boolean(o.autoDisabled)
  const modules =
    typeof o.modules === 'object' && o.modules !== null
      ? (o.modules as TutorialStatePayload['modules'])
      : {}
  const lastCompletedAt = typeof o.lastCompletedAt === 'string' ? o.lastCompletedAt : undefined
  return {
    schemaVersion: typeof o.schemaVersion === 'number' ? o.schemaVersion : base.schemaVersion,
    dismissedForever: dismissed,
    replayOnNextLogin: Boolean(o.replayOnNextLogin),
    fullResetNext: Boolean(o.fullResetNext),
    ...(lastCompletedAt ? { lastCompletedAt } : {}),
    modules,
  }
}

export function moduleNeedsRefresh(
  key: TutorialModuleKey,
  modules: TutorialStatePayload['modules'],
): boolean {
  const target = TUTORIAL_CONTENT_VERSIONS[key]
  const p = modules[key]
  if (!p) return true
  if (!p.completed) return true
  return (p.contentVersionSeen ?? 0) < target
}
