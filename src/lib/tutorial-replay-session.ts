/**
 * Verhindert kurz nach „Beim nächsten Mal wieder“, dass das Willkommens-Modal in derselben
 * Render-Schleife sofort wieder aufgeht. Nach wenigen Sekunden bzw. nach clear ist
 * `replayOnNextLogin` wieder wirksam (auch nach Reload derselben Sitzung).
 */
let suppressReplayWelcomeUntilMs = 0

/** Dauer der Unterdrückung nach Klick auf Replay im Follow-up (ms). */
const REPLAY_WELCOME_SUPPRESS_MS = 1200

export function deferReplayWelcomeForCurrentBrowserSession(): void {
  suppressReplayWelcomeUntilMs = Date.now() + REPLAY_WELCOME_SUPPRESS_MS
}

export function clearDeferReplayWelcome(): void {
  suppressReplayWelcomeUntilMs = 0
}

export function isReplayWelcomeDeferred(): boolean {
  return Date.now() < suppressReplayWelcomeUntilMs
}
