/**
 * Task-basierte Tutorial-Schritte: Fortschritt erst, wenn validate() true liefert.
 * Driver.js bleibt für Highlight-Touren nutzbar; interaktive Ketten können parallel oder danach laufen.
 */

import type {
  DeviceClass,
  TutorialStep,
  TutorialStepCtx,
} from './tutorial-step-types'
import { resolveStringOrFn } from './tutorial-step-types'
import { applyDemoOverlay } from './tutorial-demo-overlay'
import { resolveAnchor, runPreAction } from './tutorial-mobile-anchor'

/** Coach-Panel: Nutzer bestätigt mit „Weiter“ (kein Polling über `validate`). */
export const TUTORIAL_INTERACTIVE_ACK_EVENT = 'tutorial:interactive-ack' as const

export function emitTutorialInteractiveAck(target?: EventTarget): void {
  const t = target ?? defaultAckEventTarget()
  if (!t || typeof t.dispatchEvent !== 'function') return
  t.dispatchEvent(new CustomEvent(TUTORIAL_INTERACTIVE_ACK_EVENT))
}

function waitForInteractiveAck(signal: AbortSignal | undefined, target: EventTarget): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAck = () => {
      cleanup()
      resolve()
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const cleanup = () => {
      target.removeEventListener(TUTORIAL_INTERACTIVE_ACK_EVENT, onAck)
      signal?.removeEventListener('abort', onAbort)
    }
    target.addEventListener(TUTORIAL_INTERACTIVE_ACK_EVENT, onAck, { once: true })
    if (signal?.aborted) {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function defaultAckEventTarget(): EventTarget | null {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') return window
  return null
}

export interface TutorialTask {
  id: string
  headline: string
  body: string
  /** Stabile Situations-ID aus der Design-Library (siehe tutorial-fier-presets) */
  fierKey?: string
  /** Optional: Coach-Panel an diesem Selektor ausrichten (Desktop) */
  nearSelector?: string
  /**
   * Wenn true: Fortschritt erst nach `emitTutorialInteractiveAck()` (Schaltfläche „Weiter“ im Coach).
   * `validate` wird in diesem Fall nicht abgefragt.
   */
  requiresAcknowledge?: boolean
  /** Liefert true, wenn der Nutzer die Aktion erledigt hat (wird ignoriert bei `requiresAcknowledge`). */
  validate: () => boolean
  pollIntervalMs?: number
}

export type TaskQueueResult = 'finished' | 'aborted'

export interface RunTaskQueueOptions {
  onTaskStart?: (task: TutorialTask, index: number, total: number) => void
  onTaskDone?: (task: TutorialTask, index: number, total: number) => void
  signal?: AbortSignal
  /** Ohne Browser-`window` (z. B. Vitest node): EventTarget für `requiresAcknowledge` */
  ackEventTarget?: EventTarget
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = globalThis.setTimeout(resolve, ms)
    const onAbort = () => {
      globalThis.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) {
      globalThis.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

// ─── Neuer Step-Datenmodell-Pfad (PR 1) ─────────────────────────────────────────
// Koexistiert mit `runTaskQueue`/`TutorialTask`. Wird in PR 3+ vom
// Orchestrator fuer das neue Curriculum benutzt. Bestehende Curriculum-
// Aufrufe (basics/closing) bleiben unangetastet.

export interface RunTutorialStepEvent {
  readonly step: TutorialStep
  readonly headline: string
  readonly body: string
  readonly device: DeviceClass
  /** Aufgeloester Anker-Selektor – kann `undefined` sein. */
  readonly anchorSelector: string | undefined
  /** Aufgeloestes Anker-Element – kann `null` sein. */
  readonly anchorElement: HTMLElement | null
}

export interface RunTutorialStepOptions {
  ctx: TutorialStepCtx
  /** Geraeteklasse, gegen die `anchor` und `preAction` aufgeloest werden. */
  device: DeviceClass
  /** UI-Bridge: Coach-Panel oeffnen. */
  onStepStart?: (event: RunTutorialStepEvent) => void
  /** UI-Bridge: Coach-Panel schliessen. */
  onStepDone?: (event: RunTutorialStepEvent) => void
  /** Bridge fuer „Schritt uebersprungen" (z. B. `precondition` false). */
  onStepSkipped?: (step: TutorialStep, reason: 'device' | 'precondition') => void
  signal?: AbortSignal
  /** Polling-Intervall fuer `validate`. Default 200 ms (clamped >= 50). */
  pollIntervalMs?: number
  /** Auto-Advance-Dauer ohne Wartebedingung. Default 1500 ms. */
  autoAdvanceMs?: number
  /** Ohne Browser-`window` (Vitest node): EventTarget fuer `acknowledge`. */
  ackEventTarget?: EventTarget
}

function isDeviceMatch(
  device: DeviceClass,
  filter: TutorialStep['device'],
): boolean {
  if (filter == null) return true
  if (Array.isArray(filter)) return filter.includes(device)
  return filter === device
}

/**
 * Wartet auf Klick auf einem Selector ODER innerhalb dessen Subtree.
 * Cleanup zusammen mit Abbruch.
 */
function waitForClickOnSelector(
  selector: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('waitForClickOnSelector: kein Dokument verfuegbar'))
      return
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const handler = (ev: Event) => {
      const t = ev.target
      if (!(t instanceof Element)) return
      try {
        const matches = t.matches(selector) || !!t.closest(selector)
        if (matches) {
          cleanup()
          resolve()
        }
      } catch {
        /* ungueltiger Selektor – ignorieren */
      }
    }
    const cleanup = () => {
      document.removeEventListener('click', handler, true)
      signal?.removeEventListener('abort', onAbort)
    }
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    document.addEventListener('click', handler, true)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Pollt `validate()` bis true oder Abbruch.
 */
async function waitForValidate(
  validate: () => boolean,
  intervalMs: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  const interval = Math.max(50, intervalMs)
  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      if (validate()) return
    } catch {
      /* validate darf werfen */
    }
    await sleep(interval, signal)
  }
}

/**
 * Fuehrt einen einzelnen `TutorialStep` aus:
 * 1. Geraete-/Precondition-Filter
 * 2. PreAction (Klick + WaitFor)
 * 3. Anker aufloesen
 * 4. DemoOverlay anwenden (Cleanup gemerkt)
 * 5. Coach-Bridge `onStepStart`
 * 6. Wartebedingung: validateClick → acknowledge → validate → autoAdvance
 * 7. DemoOverlay-Cleanup + `onStepDone`
 */
export async function runTutorialStep(
  step: TutorialStep,
  options: RunTutorialStepOptions,
): Promise<'finished' | 'aborted' | 'skipped'> {
  const { ctx, device, signal } = options

  if (!isDeviceMatch(device, step.device)) {
    options.onStepSkipped?.(step, 'device')
    return 'skipped'
  }
  try {
    if (step.precondition && !step.precondition(ctx)) {
      options.onStepSkipped?.(step, 'precondition')
      return 'skipped'
    }
  } catch {
    options.onStepSkipped?.(step, 'precondition')
    return 'skipped'
  }

  try {
    await runPreAction(step.preAction, device, signal)
  } catch (e) {
    if (signal?.aborted) return 'aborted'
    console.warn('[tutorial] preAction error (Step laeuft trotzdem weiter):', e)
  }
  if (signal?.aborted) return 'aborted'

  const anchorSelector = resolveAnchor(step.anchor, device)
  let anchorElement: HTMLElement | null = null
  if (anchorSelector && typeof document !== 'undefined') {
    try {
      const el = document.querySelector(anchorSelector)
      anchorElement = el instanceof HTMLElement ? el : null
    } catch {
      anchorElement = null
    }
  }

  let cleanupOverlay: (() => void) | null = null
  if (step.demoOverlay) {
    const target =
      step.demoOverlay.selector && typeof document !== 'undefined'
        ? (document.querySelector(step.demoOverlay.selector) as HTMLElement | null)
        : anchorElement
    cleanupOverlay = applyDemoOverlay(target, {
      kind: step.demoOverlay.kind,
      dynamicHex: step.demoOverlay.dynamicHex,
    })
  }

  const event: RunTutorialStepEvent = {
    step,
    headline: resolveStringOrFn(step.headline, ctx),
    body: resolveStringOrFn(step.body, ctx),
    device,
    anchorSelector,
    anchorElement,
  }

  options.onStepStart?.(event)

  let result: 'finished' | 'aborted' = 'finished'
  try {
    if (step.validateClick) {
      try {
        await waitForClickOnSelector(step.validateClick, signal)
      } catch {
        result = 'aborted'
      }
    } else if (step.acknowledge) {
      const target = options.ackEventTarget ?? defaultAckEventTarget()
      if (!target) {
        // Browser nicht vorhanden und Bridge fehlt → defensiv abbrechen,
        // damit der Step nicht endlos haengt.
        result = 'aborted'
      } else {
        try {
          await waitForInteractiveAck(signal, target)
        } catch {
          result = 'aborted'
        }
      }
    } else if (step.validate) {
      try {
        await waitForValidate(step.validate, options.pollIntervalMs ?? 200, signal)
      } catch {
        result = 'aborted'
      }
    } else {
      try {
        await sleep(options.autoAdvanceMs ?? 1500, signal)
      } catch {
        result = 'aborted'
      }
    }
  } finally {
    cleanupOverlay?.()
    options.onStepDone?.(event)
  }

  return result
}

/**
 * Führt Tasks nacheinander aus, pollt validate bis true (oder Abbruch).
 */
export async function runTaskQueue(
  tasks: TutorialTask[],
  options: RunTaskQueueOptions = {},
): Promise<TaskQueueResult> {
  const { onTaskStart, onTaskDone, signal, ackEventTarget } = options
  const total = tasks.length
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) return 'aborted'
    const task = tasks[i]!
    onTaskStart?.(task, i, total)
    if (task.requiresAcknowledge) {
      const target = ackEventTarget ?? defaultAckEventTarget()
      if (!target) {
        throw new Error('requiresAcknowledge: kein EventTarget (Browser oder ackEventTarget nötig)')
      }
      try {
        await waitForInteractiveAck(signal, target)
      } catch {
        return 'aborted'
      }
      onTaskDone?.(task, i, total)
      continue
    }
    const interval = Math.max(50, task.pollIntervalMs ?? 200)
    let doneWithTask = false
    while (!doneWithTask) {
      if (signal?.aborted) return 'aborted'
      try {
        if (task.validate()) {
          doneWithTask = true
          break
        }
      } catch {
        /* validate darf werfen */
      }
      try {
        await sleep(interval, signal)
      } catch {
        return 'aborted'
      }
    }
    onTaskDone?.(task, i, total)
  }
  return 'finished'
}
