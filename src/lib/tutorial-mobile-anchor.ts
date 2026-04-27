/**
 * Tutorial – Mobile-Anchor-Helfer
 *
 * Geraeteklassen-Erkennung + Selektor-Aufloesung + PreActions
 * (z. B. „auf Mobile zuerst Hamburger oeffnen"). Diese Helper sind die
 * einzigen Stellen im Tutorial, die `window.matchMedia` / `document.click`
 * direkt anfassen – Engine und Curriculum bleiben deklarativ.
 */

import { useEffect, useState } from 'react'
import type { AnchorByDevice, DeviceClass, PreAction } from './tutorial-step-types'
import { waitForSelector } from './tutorial-orchestrator-utils'

/** Breakpoints in CSS-Pixel: mobile <768, tablet 768..1279, desktop >=1280. */
const TABLET_MIN = 768
const DESKTOP_MIN = 1280

/** Ermittelt die Geraeteklasse aus `window.innerWidth`. SSR/Node-safe. */
export function getDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth || 0
  if (w >= DESKTOP_MIN) return 'desktop'
  if (w >= TABLET_MIN) return 'tablet'
  return 'mobile'
}

/**
 * React-Hook auf Basis `matchMedia`. Aktualisiert sich live beim
 * Resize / Geraeterotation. Defensive: ohne `window` (SSR/Test) liefert
 * stabil `desktop`.
 */
export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>(() => getDeviceClass())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mqlMobile = window.matchMedia(`(max-width: ${TABLET_MIN - 1}px)`)
    const mqlTablet = window.matchMedia(
      `(min-width: ${TABLET_MIN}px) and (max-width: ${DESKTOP_MIN - 1}px)`,
    )
    const update = () => setDevice(getDeviceClass())
    update()
    mqlMobile.addEventListener('change', update)
    mqlTablet.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mqlMobile.removeEventListener('change', update)
      mqlTablet.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return device
}

/**
 * Liefert den passenden Selektor pro Geraeteklasse. Fallback:
 * `device → desktop`, dann irgendein gesetzter Wert; ohne Anker `undefined`.
 */
export function resolveAnchor(
  anchor: AnchorByDevice | undefined,
  device: DeviceClass,
): string | undefined {
  if (!anchor) return undefined
  return (
    anchor[device]
    ?? anchor.desktop
    ?? anchor.tablet
    ?? anchor.mobile
    ?? undefined
  )
}

/**
 * Fuehrt eine PreAction aus (Klick + Wait), wenn das Geraet passt.
 * Nimmt `signal` zur Abbruchbehandlung entgegen. Wirft nicht – schreibt
 * im Fehlerfall eine Konsolen-Warnung (Curriculum darf weiterlaufen).
 */
export async function runPreAction(
  action: PreAction | undefined,
  device: DeviceClass,
  signal?: AbortSignal,
): Promise<void> {
  if (!action) return
  const target = action.on ?? 'always'
  if (target !== 'always' && target !== device) return

  if (action.click) {
    try {
      const el = document.querySelector(action.click)
      if (el instanceof HTMLElement) el.click()
      else if (el && typeof (el as HTMLElement).click === 'function') {
        ;(el as HTMLElement).click()
      } else {
        console.warn(`[tutorial] preAction click: kein Element fuer ${action.click}`)
      }
    } catch (e) {
      console.warn('[tutorial] preAction click fehlgeschlagen:', e)
    }
  }

  if (action.waitFor) {
    await waitForSelector(action.waitFor, { timeoutMs: 5000, signal })
  }
}
