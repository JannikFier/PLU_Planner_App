/**
 * Tutorial-Analytics (Tabelle `tutorial_events`, Migration 070):
 * Sendet nur Netzwerk-Events, wenn `VITE_TUTORIAL_EVENTS=1` gesetzt ist – sonst kein POST
 * (vermeidet 404 in der Konsole, solange die Migration noch nicht auf dem Projekt liegt).
 */
import { supabase } from '@/lib/supabase'
import type { TutorialModuleKey } from '@/lib/tutorial-types'

/** Diskrete Tutorial-Event-Typen. Für SQL-Analyse bewusst flach gehalten. */
export type TutorialEventKind =
  | 'start'
  | 'step'
  | 'skip'
  | 'dismiss'
  | 'resume'
  | 'pick-module'
  | 'enough-today'
  | 'complete'
  | 'abort'
  | 'error'
  | 'anchor-missing'

export interface TutorialEvent {
  event: TutorialEventKind
  module?: TutorialModuleKey | string
  stepIndex?: number
  meta?: Record<string, unknown>
  /** Eigener Zeitstempel; überschreibt den DB-Default nicht, wird nur lokal mitgeloggt. */
  ts?: number
}

interface QueuedRow {
  user_id: string | null
  store_id: string | null
  event: string
  module: string | null
  step_index: number | null
  meta: Record<string, unknown>
  created_at: string
}

const FLUSH_INTERVAL_MS = 3500
const MAX_QUEUE_LENGTH = 25
const DEBUG_FLAG_KEY = 'plu.tutorialDebug'

/** Nach erstem fehlgeschlagenen Insert keine weiteren POSTs (z. B. Migration 070 noch nicht deployed). */
let remoteTutorialEventsDisabled = false

function isRemoteTutorialEventsEnabled(): boolean {
  try {
    return import.meta.env.VITE_TUTORIAL_EVENTS === '1'
  } catch {
    return false
  }
}

const queue: QueuedRow[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let contextUserId: string | null = null
let contextStoreId: string | null = null
let debugListeners = new Set<(events: TutorialEvent[]) => void>()
const debugBuffer: TutorialEvent[] = []

/** Setzt den aktuellen User/Store-Kontext für Folge-Events. */
export function setTutorialEventContext(userId: string | null, storeId: string | null) {
  contextUserId = userId
  contextStoreId = storeId
}

/**
 * Loggt ein Tutorial-Event in eine kleine Queue; flush erfolgt nach einem
 * kurzen Intervall oder wenn die Queue voll ist. Schreibfehler werden
 * geschluckt (Analytics darf nie blockieren).
 */
export function logTutorialEvent(ev: TutorialEvent) {
  if (debugListeners.size > 0 || isTutorialDebugEnabled()) {
    debugBuffer.push({ ...ev, ts: ev.ts ?? Date.now() })
    if (debugBuffer.length > 200) debugBuffer.splice(0, debugBuffer.length - 200)
    debugListeners.forEach((l) => {
      try {
        l([...debugBuffer])
      } catch {
        /* bewusst: Debug-Listener darf die Queue nicht stören */
      }
    })
  }
  if (!isRemoteTutorialEventsEnabled() || remoteTutorialEventsDisabled) {
    return
  }
  const row: QueuedRow = {
    user_id: contextUserId,
    store_id: contextStoreId,
    event: ev.event,
    module: ev.module ?? null,
    step_index: ev.stepIndex ?? null,
    meta: ev.meta ?? {},
    created_at: new Date(ev.ts ?? Date.now()).toISOString(),
  }
  queue.push(row)
  if (queue.length >= MAX_QUEUE_LENGTH) {
    void flushTutorialEvents()
    return
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null
      void flushTutorialEvents()
    }, FLUSH_INTERVAL_MS)
  }
}

/** Flush der Queue (eine Netzwerk-Runde). Fehler werden verschluckt. */
export async function flushTutorialEvents(): Promise<void> {
  if (!isRemoteTutorialEventsEnabled() || remoteTutorialEventsDisabled || queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  try {
    const { error } = await (supabase.from('tutorial_events') as unknown as {
      insert: (v: QueuedRow[]) => Promise<{ error: { message?: string; code?: string } | null }>
    }).insert(batch)
    if (error) {
      remoteTutorialEventsDisabled = true
    }
  } catch {
    remoteTutorialEventsDisabled = true
  }
}

/** Subscribe auf Events für das Debug-Overlay. Liefert sofort den aktuellen Puffer. */
export function subscribeTutorialDebug(listener: (events: TutorialEvent[]) => void): () => void {
  debugListeners.add(listener)
  listener([...debugBuffer])
  return () => {
    debugListeners.delete(listener)
  }
}

/** Leert den Debug-Puffer. */
export function clearTutorialDebugBuffer() {
  debugBuffer.length = 0
  debugListeners.forEach((l) => {
    try {
      l([])
    } catch {
      /* bewusst: Listener-Fehler ignorieren */
    }
  })
}

/**
 * Prüft ob Debug-Modus aktiv ist. Kann per Query-Param ?debug-tutorial=1 oder
 * localStorage-Flag eingeschaltet werden.
 */
export function isTutorialDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('debug-tutorial') === '1') {
      window.localStorage.setItem(DEBUG_FLAG_KEY, '1')
      return true
    }
    if (params.get('debug-tutorial') === '0') {
      window.localStorage.removeItem(DEBUG_FLAG_KEY)
      return false
    }
    return window.localStorage.getItem(DEBUG_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/** Optional: Listener-Count abfragen (nur für Tests). */
export function _getDebugListenerCount(): number {
  return debugListeners.size
}

/** Reset für Tests. */
export function _resetTutorialEventsForTests() {
  queue.length = 0
  debugBuffer.length = 0
  debugListeners = new Set()
  remoteTutorialEventsDisabled = false
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  contextUserId = null
  contextStoreId = null
}
