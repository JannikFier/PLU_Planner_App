/**
 * Tutorial-Step-Datenmodell (neu, reine Typen + Pure-Helper)
 *
 * Koexistiert mit dem alten `TutorialTask` aus
 * `src/lib/tutorial-interactive-engine.ts`. Bestehende Curriculum-Module
 * (basics, closing) bleiben unveraendert; PR 3+ befuellt die Registry mit
 * `TutorialStep`-Objekten und nutzt den neuen Engine-Pfad
 * `runTutorialStep()`.
 *
 * React-Hook `useTutorialStepCtx()` lebt in `tutorial-step-ctx.ts`
 * (getrennt, damit dieses Modul ohne Browser-Imports testbar bleibt).
 */

import type { TutorialCapability } from './tutorial-capabilities'

/** Geraete-Klassen fuer responsive Tutorial-Steps. */
export type DeviceClass = 'desktop' | 'tablet' | 'mobile'

/**
 * Pro Geraeteklasse separater CSS-Selector. Die Engine waehlt den
 * passenden anhand `useDeviceClass()` und faellt auf `desktop` zurueck,
 * falls eine Geraeteklasse nicht definiert ist.
 */
export interface AnchorByDevice {
  desktop?: string
  tablet?: string
  mobile?: string
}

/** Kategorien fuer Demo-Overlays, die Live-Beispiele auf echte UI-Elemente legen. */
export type DemoOverlayKind =
  | 'plu-row-yellow'
  | 'plu-row-red'
  | 'plu-row-werbung'
  | 'plu-row-werbung-kw0'
  | 'plu-row-werbung-kw1'
  | 'plu-row-werbung-kw2'
  | 'plu-cell-stueck'
  | 'plu-cell-gewicht'
  | 'pulse-ring'

/**
 * Discriminated Union fuer Demo-Overlay-Specs in Steps.
 * `dynamicHex` (optional) erlaubt Werbungs-Gelbtoene aus Layout-Settings
 * dynamisch zu uebernehmen, ohne dass das Tutorial die CSS-Datei kennt.
 */
export interface DemoOverlaySpec {
  kind: DemoOverlayKind
  /** Selektor fuer das Ziel-Element. Fallback: aktiver Step-Anker. */
  selector?: string
  /** Wenn gesetzt: setzt CSS-Variable `--demo-bg` auf diesen Hex-Wert. */
  dynamicHex?: string
}

/**
 * PreAction wird vor dem Step ausgefuehrt – z. B. „auf Mobile zuerst
 * den Hamburger oeffnen", damit ein nachfolgender Anker sichtbar ist.
 */
export interface PreActionSpec {
  /** CSS-Selektor, der zuerst geklickt werden soll. */
  click?: string
  /** Anschliessend warten bis ein Element existiert (max ~5 s). */
  waitFor?: string
}

export type PreAction = {
  /** Auf welchen Geraeteklassen soll die Aktion laufen. Default: `always`. */
  on?: 'always' | DeviceClass
} & PreActionSpec

/** Logische Module – wird in der Registry zur Gruppierung verwendet. */
export type TutorialStepModule =
  | 'cross-cutting'
  | 'basics'
  | 'obst'
  | 'obst-konfig'
  | 'backshop'
  | 'backshop-konfig'
  | 'backshop-marken'
  | 'users'
  | 'closing'

/**
 * Mascot-Pose oder Situations-Schluessel aus der Fier-Library
 * (siehe `tutorial-fier-presets.ts`). Stringly typed, damit das Curriculum
 * sich frei mit neuen Posen erweitern laesst.
 */
export type TutorialPose = string

/**
 * Live-Context, den `body`/`headline` als Funktion erhalten. Speist sich aus
 * den App-Hooks (Layout-Settings, Sichtbarkeit, Markt-Stammdaten). Werte sind
 * bewusst optional/defensiv – dynamische Felder wie `werbungToneKw0` werden
 * erst in spaeteren PRs befuellt, sobald die Toene zentral persistiert sind.
 */
export interface TutorialStepCtx {
  store: { id: string | null; name: string | null }
  role: 'viewer' | 'user' | 'admin' | 'super_admin' | null
  device: DeviceClass
  obst: {
    visible: boolean
    markRedKwCount: number
    markYellowKwCount: number
    sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
    displayMode: 'MIXED' | 'SEPARATED'
    flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
    featuresCustomProducts: boolean
    featuresHiddenItems: boolean
    featuresKeywordRules: boolean
    werbungToneKw0?: string
    werbungToneKw1?: string
    werbungToneKw2?: string
  }
  backshop: {
    visible: boolean
    markRedKwCount: number
    markYellowKwCount: number
    sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
    flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
    featuresCustomProducts: boolean
    featuresHiddenItems: boolean
    featuresKeywordRules: boolean
    werbungToneKw0?: string
    werbungToneKw1?: string
    werbungToneKw2?: string
  }
}

/** String oder Funktion, die mit Live-Context aufgeloest wird. */
export type StringOrFn = string | ((ctx: TutorialStepCtx) => string)

/**
 * Atomic Tutorial-Step nach dem neuen Modell.
 *
 * Wichtige Eigenschaften:
 * - `capability`: Filter – Steps ohne aktive Capability werden uebersprungen.
 * - `device`: Optional. Wenn gesetzt, wird der Step nur auf diesen
 *   Geraeteklassen aktiv (bei mehreren als Array). Default: alle.
 * - `precondition`: Zusaetzlicher dynamischer Filter mit Live-Context.
 * - `anchor`: Zielelement(e). Pro Geraeteklasse ein Selektor. Optional, da
 *   reine „Hinweis"-Steps ohne Anker ebenfalls existieren.
 * - `validateClick`/`acknowledge`/`validate`: Genau eine dieser
 *   Wartebedingungen wird typischerweise gesetzt; ohne eine davon laeuft
 *   der Step nach kurzem Auto-Advance weiter.
 */
export interface TutorialStep {
  id: string
  module: TutorialStepModule
  capability: TutorialCapability
  device?: DeviceClass | DeviceClass[]
  precondition?: (ctx: TutorialStepCtx) => boolean
  preAction?: PreAction
  anchor?: AnchorByDevice
  pose: TutorialPose
  headline: StringOrFn
  body: StringOrFn
  demoOverlay?: DemoOverlaySpec
  /** „Weiter" muss explizit geklickt werden (kein Validate-Polling). */
  acknowledge?: boolean
  /** Wartet auf Klick irgendwo unterhalb des Anker-Selektors. */
  validateClick?: string
  /** Polling-Funktion: liefert true → Step fertig. */
  validate?: () => boolean
}

/** Hilfs-Funktion: liefert Strings unabhaengig davon, ob Funktion oder Literal. */
export function resolveStringOrFn(value: StringOrFn, ctx: TutorialStepCtx): string {
  return typeof value === 'function' ? value(ctx) : value
}
