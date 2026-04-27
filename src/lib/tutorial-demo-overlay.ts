/**
 * Tutorial-Demo-Overlays
 *
 * Legt waehrend eines Tutorial-Steps temporaer eine CSS-Klasse + optional
 * eine CSS-Variable auf ein UI-Element. Wird von der Engine genutzt, um
 * z. B. eine PLU-Zeile waehrend der Erklaerung gelb einzufaerben oder
 * eine Zelle zu umranden – ohne den DOM zu klonen.
 *
 * Die zugehoerigen CSS-Regeln stehen in `src/index.css` im Block
 * `=== Tutorial Demo Overlays ===`.
 */

import type { DemoOverlayKind } from './tutorial-step-types'

const CLASS_PREFIX = 'tutorial-demo--'

/** Mappt einen DemoOverlayKind auf seine CSS-Klasse. */
function classFor(kind: DemoOverlayKind): string {
  return `${CLASS_PREFIX}${kind}`
}

export interface ApplyDemoOverlayOptions {
  kind: DemoOverlayKind
  /** Hex-Farbcode (#RRGGBB). Setzt CSS-Variable `--demo-bg`. */
  dynamicHex?: string
}

/** Sicheres Hex-Pattern, um ungueltige CSS-Werte abzulehnen. */
const HEX_RX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * Setzt das Demo-Overlay auf das Ziel und liefert eine Cleanup-Funktion.
 * Defensive: tolerant gegen `null`-Targets (kein Throw, no-op-Cleanup),
 * gegen mehrfaches Setzen (idempotent) und gegen abgehaengte Knoten
 * (Cleanup nutzt nur den gemerkten Knoten, kein erneutes Lookup).
 */
export function applyDemoOverlay(
  target: HTMLElement | null | undefined,
  opts: ApplyDemoOverlayOptions,
): () => void {
  if (!target) return () => {}
  const cls = classFor(opts.kind)
  const hadClassBefore = target.classList.contains(cls)
  if (!hadClassBefore) target.classList.add(cls)

  let restoreVar: (() => void) | null = null
  if (opts.dynamicHex && HEX_RX.test(opts.dynamicHex)) {
    const previous = target.style.getPropertyValue('--demo-bg')
    target.style.setProperty('--demo-bg', opts.dynamicHex)
    restoreVar = () => {
      if (previous) target.style.setProperty('--demo-bg', previous)
      else target.style.removeProperty('--demo-bg')
    }
  }

  let cleaned = false
  return () => {
    if (cleaned) return
    cleaned = true
    if (!hadClassBefore) target.classList.remove(cls)
    restoreVar?.()
  }
}
