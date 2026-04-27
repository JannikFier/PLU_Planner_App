import type { TutorialTask } from '@/lib/tutorial-interactive-engine'

/**
 * Stil-Konvention fuer alle Tutorial-Curriculum-Texte (PR 3.0).
 *
 *  Tonalitaet
 *  ----------
 *  - Anrede durchgehend "Du".
 *  - Praefix `Fier:` NUR bei direktiv-interaktiven Schritten (Klick, Auswahl,
 *    Eingabe). Reine Erklaerungen ohne Aktion NICHT mit `Fier:` praefixen.
 *  - Headline: 1-3 Woerter, hoechstens 4. Klein anfangen vermeiden.
 *  - Body: 1-2 Saetze, Ziel < 140 Zeichen, hart < 200 Zeichen.
 *  - Keine Emojis, kein Marketing-Sprech, keine Konjunktive ("waere", "koennte"),
 *    stattdessen aktive Anweisung oder klare Aussage.
 *  - Bei Hinweisen statt Aktion: kurze Information + ggf. "Du kannst ...".
 *
 *  fierKey-Verwendung (Avatar-Variante in `tutorial-fier-presets`)
 *  --------------------------------------------------------------
 *  - `point`   : direkter Klick / Hinweis auf konkrete Stelle
 *  - `think`   : Erklaerung mit Wahlmoeglichkeit
 *  - `walk`    : Navigation / "geh zurueck"
 *  - `data`    : Liste / Tabelle / Daten-Erklaerung
 *  - `pdown`   : Uebersicht / "Schau hier"
 *  - `success` : Abschluss / positiver Abschluss
 *
 *  Validate-Konvention
 *  -------------------
 *  - Action-Step (User soll klicken/navigieren): `validate: () => predicate`,
 *    `pollIntervalMs: 250` (Standard). Coach blockiert, bis Aktion erfolgt.
 *  - Hinweis-Step (User soll lesen/bestaetigen): `requiresAcknowledge: true`,
 *    `validate: () => false`. Coach zeigt "Weiter"-Button.
 *
 *  IDs
 *  ---
 *  - Format: `<modul>-<bereich>-<aktion>` lowercase mit Bindestrich.
 *  - Beispiel: `obst-deep-pdf-hint`, `backshop-deep-manual-supplement`.
 *  - IDs sind global eindeutig (Snapshot-Tests pruefen das).
 *
 *  Selektor-Konvention
 *  -------------------
 *  - `nearSelector` zeigt auf bereits existierenden `data-tour=`-Anker.
 *  - Wenn der Anker auf einer anderen Route liegt, wird ein Navigations-Step
 *    ohne `nearSelector` davorgesetzt (validiert per Pfad), gefolgt vom
 *    Coach-Step mit `nearSelector` auf der Zielseite.
 */

export type TutorialFierKey =
  | 'point'
  | 'think'
  | 'walk'
  | 'data'
  | 'pdown'
  | 'success'

const DEFAULT_POLL_MS = 250

/**
 * Direktiver Action-Step: User muss eine Aktion ausfuehren, bevor es weitergeht.
 * - Coach-Panel zeigt Headline + Body neben `nearSelector` (sofern angegeben).
 * - Tour blockiert, bis `predicate()` true liefert.
 */
export function actionStep(args: {
  id: string
  headline: string
  body: string
  fierKey?: TutorialFierKey
  nearSelector?: string
  predicate: () => boolean
  pollIntervalMs?: number
}): TutorialTask {
  return {
    id: args.id,
    headline: args.headline,
    body: args.body,
    fierKey: args.fierKey ?? 'point',
    nearSelector: args.nearSelector,
    pollIntervalMs: args.pollIntervalMs ?? DEFAULT_POLL_MS,
    validate: args.predicate,
  }
}

/**
 * Navigations-Step: User soll auf eine bestimmte Route wechseln.
 * Praefiziert die Body-Description automatisch nicht mit `Fier:`, da der
 * Schritt eher walk/think-Charakter hat.
 */
export function navStep(args: {
  id: string
  headline: string
  body: string
  fierKey?: TutorialFierKey
  nearSelector?: string
  matchesPath: () => boolean
  pollIntervalMs?: number
}): TutorialTask {
  return {
    id: args.id,
    headline: args.headline,
    body: args.body,
    fierKey: args.fierKey ?? 'walk',
    nearSelector: args.nearSelector,
    pollIntervalMs: args.pollIntervalMs ?? DEFAULT_POLL_MS,
    validate: args.matchesPath,
  }
}

/**
 * Hinweis-Step mit "Weiter"-Bestaetigung: reine Erklaerung, keine User-Aktion.
 * Body OHNE `Fier:`-Praefix.
 */
export function ackStep(args: {
  id: string
  headline: string
  body: string
  fierKey?: TutorialFierKey
  nearSelector?: string
}): TutorialTask {
  return {
    id: args.id,
    headline: args.headline,
    body: args.body,
    fierKey: args.fierKey ?? 'think',
    nearSelector: args.nearSelector,
    requiresAcknowledge: true,
    validate: () => false,
  }
}

/**
 * Hilfs-Praedikat: Pfadname enthaelt Substring.
 */
export function pathContains(getPathname: () => string, ...needles: string[]): () => boolean {
  return () => {
    const p = getPathname()
    return needles.some((n) => p.includes(n))
  }
}

/**
 * Hilfs-Praedikat: Pfadname enthaelt KEINEN der Substrings.
 */
export function pathExcludes(getPathname: () => string, ...needles: string[]): () => boolean {
  return () => {
    const p = getPathname()
    return needles.every((n) => !p.includes(n))
  }
}

/**
 * Hilfs-Praedikat: Pfadname matcht Regex.
 */
export function pathMatches(getPathname: () => string, re: RegExp): () => boolean {
  return () => re.test(getPathname())
}
