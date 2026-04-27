import type { DriveStep } from 'driver.js'
import type { TutorialTask } from '@/lib/tutorial-interactive-engine'
import {
  TUTORIAL_CONTENT_VERSIONS,
  type TutorialModuleKey,
  type TutorialStatePayload,
} from '@/lib/tutorial-types'

export function dashboardHomeForRole(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'viewer') return '/viewer'
  return '/user'
}

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'))
      return
    }
    const t = setTimeout(() => resolve(), ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

/**
 * Filtert Steps so, dass fehlende Anker kurz angewartet werden – statt stumm zu verkürzen.
 * Jeder Selektor bekommt max. `timeoutMs` Zeit. Fehlender Anker → console.warn + Event
 * `tutorial:anchor-missing`.
 */
export async function filterExistingStepsAsync(
  steps: DriveStep[],
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<DriveStep[]> {
  const timeout = opts.timeoutMs ?? 1500
  const result: DriveStep[] = []
  for (const s of steps) {
    if (opts.signal?.aborted) break
    if (!s.element || typeof s.element !== 'string') {
      result.push(s)
      continue
    }
    const sel = s.element
    const found = await waitForSelector(sel, {
      timeoutMs: timeout,
      signal: opts.signal,
    })
    if (found) {
      result.push(s)
    } else {
      console.warn(`[tutorial] anchor missing for selector ${sel}`)
      try {
        window.dispatchEvent(
          new CustomEvent('tutorial:anchor-missing', { detail: { selector: sel } }),
        )
      } catch {
        // noop
      }
    }
  }
  return result
}

/**
 * Filtert Coach-Tasks: fehlende `nearSelector`-Anker wie bei Driver-Steps kurz anwartend.
 */
export async function filterTutorialTasksWithAnchorsAsync(
  tasks: TutorialTask[],
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<TutorialTask[]> {
  const timeout = opts.timeoutMs ?? 1500
  const result: TutorialTask[] = []
  for (const t of tasks) {
    if (opts.signal?.aborted) break
    const sel = t.nearSelector
    if (!sel) {
      result.push(t)
      continue
    }
    const found = await waitForSelector(sel, {
      timeoutMs: timeout,
      signal: opts.signal,
    })
    if (found) {
      result.push(t)
    } else {
      console.warn(`[tutorial] anchor missing for coach selector ${sel}`)
      try {
        window.dispatchEvent(
          new CustomEvent('tutorial:anchor-missing', { detail: { selector: sel } }),
        )
      } catch {
        // noop
      }
    }
  }
  return result
}

/**
 * Synchroner Schnell-Filter. Für reine "ist dieser Anker jetzt da"-Checks ohne Warten.
 */
export function filterExistingSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((s) => {
    if (!s.element) return true
    if (typeof s.element !== 'string') return true
    try {
      return Boolean(document.querySelector(s.element))
    } catch {
      return false
    }
  })
}

/**
 * Wartet, bis ein Selektor im DOM vorhanden ist, oder bis Timeout/Abort.
 * Liefert `true` bei Erfolg, `false` bei Timeout oder Abort.
 */
export async function waitForSelector(
  selector: string,
  opts: { timeoutMs?: number; signal?: AbortSignal; pollMs?: number } | number = {},
  // Legacy: waitForSelector(selector, attempts, delayMs)
  legacyDelayMs?: number,
): Promise<boolean> {
  let timeoutMs = 4000
  let pollMs = 100
  let signal: AbortSignal | undefined

  if (typeof opts === 'number') {
    // Legacy-Signatur
    const attempts = opts
    const delay = legacyDelayMs ?? 100
    timeoutMs = attempts * delay
    pollMs = delay
  } else {
    timeoutMs = opts.timeoutMs ?? 4000
    pollMs = opts.pollMs ?? 100
    signal = opts.signal
  }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (signal?.aborted) return false
    try {
      if (document.querySelector(selector)) return true
    } catch {
      return false
    }
    try {
      await sleep(pollMs, signal)
    } catch {
      return false
    }
  }
  return Boolean(document.querySelector(selector))
}

/**
 * Wartet darauf, dass sich `location.pathname` dem `expected` nähert (Prefix-Match)
 * ODER auf ein bestimmtes data-tour-Element als Bestätigung, dass die Zielseite bereit ist.
 */
export async function waitForRoute(
  expectedPath: string,
  opts: { timeoutMs?: number; signal?: AbortSignal; confirmSelector?: string } = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 8000
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return false
    if (window.location.pathname.startsWith(expectedPath)) {
      if (!opts.confirmSelector) return true
      if (document.querySelector(opts.confirmSelector)) return true
    }
    try {
      await sleep(80, opts.signal)
    } catch {
      return false
    }
  }
  return false
}

export function buildModuleQueue(params: {
  first: Exclude<TutorialModuleKey, 'basics'> | null
  obst: boolean
  backshop: boolean
  users: boolean
}): TutorialModuleKey[] {
  const content: Exclude<TutorialModuleKey, 'basics'>[] = []
  if (params.obst) content.push('obst')
  if (params.backshop) content.push('backshop')
  if (params.users) content.push('users')
  if (content.length === 0) return ['basics']
  const first =
    params.first && content.includes(params.first) ? params.first : content[0]!
  const rest = content.filter((x) => x !== first)
  return ['basics', first, ...rest]
}

export function markModulesCompleted(
  payload: TutorialStatePayload,
  keys: TutorialModuleKey[],
): TutorialStatePayload {
  const modules = { ...payload.modules }
  for (const k of keys) {
    modules[k] = {
      contentVersionSeen: TUTORIAL_CONTENT_VERSIONS[k],
      lastStepIndex: 0,
      completed: true,
    }
  }
  return { ...payload, modules }
}
