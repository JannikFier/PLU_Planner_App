import { useLayoutEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FierMascot } from '@/components/tutorial/FierMascot'
import { fierLibraryKeyToPose } from '@/lib/tutorial-fier-presets'
import { useTutorialOrchestrator } from '@/hooks/useTutorialOrchestrator'
import { emitTutorialInteractiveAck } from '@/lib/tutorial-interactive-engine'

export type CoachPlacement = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

type Side = 'top' | 'right' | 'bottom' | 'left'

type Position = {
  top: number
  left: number
  side: Side
  /** Relative x-Koordinate des Pfeils innerhalb des Panels (0..panelW) */
  arrowX: number
  /** Relative y-Koordinate des Pfeils innerhalb des Panels (0..panelH) */
  arrowY: number
}

const PANEL_MAX_W = 360
/** Schmaleres Panel neben dem Profil-Button, damit das Dropdown darunter bedienbar bleibt. */
const PANEL_PROFILE_MAX_W = 252
const PANEL_EST_H = 160 // Grobe Schätzung für Kollisionscheck vor erstem Render
const GAP = 12
const EDGE = 8

const PROFILE_MENU_SEL = '[data-tour="profile-menu"]'
const DASHBOARD_WELCOME_SEL = '[data-tour="dashboard-welcome"]'
/** Radix/shadcn: Dropdown-Inhalt (Portal); sichtbares Exemplar = offenes Menü. */
const MENU_CONTENT_SEL = '[data-slot="dropdown-menu-content"]'

/** Offenes Dropdown nahe dem Profil-Trigger (nicht z. B. andere Menüs). */
function findVisibleDropdownNearProfile(trigger: DOMRect): HTMLElement | null {
  const nodes = document.querySelectorAll(MENU_CONTENT_SEL)
  let best: HTMLElement | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const el of nodes) {
    const html = el as HTMLElement
    const r = html.getBoundingClientRect()
    if (r.width < 72 || r.height < 40) continue
    const st = globalThis.getComputedStyle(html)
    if (st.visibility === 'hidden' || st.display === 'none') continue
    // Typisches Profilmenü: unterhalb des Triggers, in derselben Bildhälfte
    if (r.top < trigger.top - 20) continue
    if (r.top > trigger.bottom + 280) continue
    const horiz =
      r.left > trigger.right ? r.left - trigger.right : trigger.left > r.right ? trigger.left - r.right : 0
    if (horiz > 140) continue
    const score = horiz * 2 + Math.abs(r.left - trigger.left) * 0.25
    if (score < bestScore) {
      bestScore = score
      best = html
    }
  }
  return best
}

function isProfileMenuCoach(sel: string | undefined): boolean {
  return Boolean(sel && (sel === PROFILE_MENU_SEL || sel.includes('profile-menu')))
}

function isDashboardWelcomeCoach(sel: string | undefined): boolean {
  return Boolean(sel && (sel === DASHBOARD_WELCOME_SEL || sel.includes('dashboard-welcome')))
}

/** Willkommens-Band: Blase **unter** dem Anker, zentriert – Kacheln bleiben frei. */
function computeDashboardWelcomeCoachPosition(
  target: DOMRect,
  panelW: number,
  panelH: number,
  vw: number,
  vh: number,
): Position {
  const gap = 18
  const cx = target.left + target.width / 2
  let left = cx - panelW / 2
  left = clamp(left, EDGE, vw - panelW - EDGE)
  let top = target.bottom + gap
  if (top + panelH > vh - EDGE) {
    top = clamp(target.top - gap - panelH, EDGE, vh - panelH - EDGE)
  } else {
    top = clamp(top, EDGE, vh - panelH - EDGE)
  }
  const arrowX = clamp(cx - left, 24, panelW - 24)
  const below = top >= target.bottom - 2
  if (below) {
    return { top, left, side: 'bottom', arrowX, arrowY: 0 }
  }
  return { top, left, side: 'top', arrowX, arrowY: panelH }
}

/** Links vom Ziel zuerst (Panel sitzt links vom Avatar, nicht unter dem Menü). */
function orderCandidatesForProfile(cands: Position[]): Position[] {
  const rank = (s: Side) => (s === 'left' ? 0 : s === 'top' ? 1 : s === 'right' ? 2 : 3)
  return [...cands].sort((a, b) => rank(a.side) - rank(b.side))
}

/**
 * Profil-Tutorial: Panel direkt **links** am offenen Dropdown; sonst deutlich links und **unter** dem Trigger,
 * damit die Kopfzeilen-Icons (Glocke, Rundgang, …) frei bleiben.
 */
function computeProfileCoachPosition(
  trigger: DOMRect,
  panelW: number,
  panelH: number,
  vw: number,
  vh: number,
): Position | null {
  const menuEl = findVisibleDropdownNearProfile(trigger)
    if (menuEl) {
    const m = menuEl.getBoundingClientRect()
    if (m.width > 0 && m.height > 0) {
      let left = m.left - GAP - panelW
      left = clamp(left, EDGE, vw - panelW - EDGE)
      const nudgeDown = 16
      let top = m.top + nudgeDown
      top = clamp(top, EDGE, vh - panelH - EDGE)
      const aimY = clamp(m.top + m.height / 2 - top, 24, panelH - 24)
      const aimX = panelW
      return { top, left, side: 'right', arrowX: aimX, arrowY: aimY }
    }
  }

  const extraLeft = 72
  let left = trigger.left - GAP - panelW - extraLeft
  left = clamp(left, EDGE, vw - panelW - EDGE)
  let top = trigger.bottom + 22
  top = clamp(top, EDGE, vh - panelH - EDGE)
  const cx = trigger.left + trigger.width / 2
  const arrowX = clamp(cx - left, 24, panelW - 24)
  return { top, left, side: 'bottom', arrowX, arrowY: 0 }
}

/**
 * Erzeugt bis zu 8 Kandidaten-Positionen (4 Seiten × 2 Versatzstufen) um das Zielrechteck.
 * Jede Position wird gegen Viewport getestet. Die erste überschneidungsfreie Position
 * (gegen Target-Rect + Viewport-Ränder) gewinnt. Fallback: bodenfixiert.
 */
function computeCandidates(
  target: DOMRect,
  panelW: number,
  panelH: number,
  vw: number,
  vh: number,
): Position[] {
  const cx = target.left + target.width / 2
  const cy = target.top + target.height / 2

  // Zentrum bzw. leicht versetzt
  const leftCenter = clamp(cx - panelW / 2, EDGE, vw - panelW - EDGE)
  const topCenter = clamp(cy - panelH / 2, EDGE, vh - panelH - EDGE)

  const cands: Position[] = []

  // bottom · zentriert
  cands.push({
    top: target.bottom + GAP,
    left: leftCenter,
    side: 'bottom',
    arrowX: Math.min(Math.max(cx - leftCenter, 24), panelW - 24),
    arrowY: 0,
  })
  // top · zentriert
  cands.push({
    top: target.top - GAP - panelH,
    left: leftCenter,
    side: 'top',
    arrowX: Math.min(Math.max(cx - leftCenter, 24), panelW - 24),
    arrowY: panelH,
  })
  // right · zentriert
  cands.push({
    top: topCenter,
    left: target.right + GAP,
    side: 'right',
    arrowX: 0,
    arrowY: Math.min(Math.max(cy - topCenter, 24), panelH - 24),
  })
  // left · zentriert
  cands.push({
    top: topCenter,
    left: target.left - GAP - panelW,
    side: 'left',
    arrowX: panelW,
    arrowY: Math.min(Math.max(cy - topCenter, 24), panelH - 24),
  })

  // bottom · linksbündig zur Zielkante
  cands.push({
    top: target.bottom + GAP,
    left: clamp(target.left, EDGE, vw - panelW - EDGE),
    side: 'bottom',
    arrowX: Math.min(Math.max(cx - clamp(target.left, EDGE, vw - panelW - EDGE), 24), panelW - 24),
    arrowY: 0,
  })
  // bottom · rechtsbündig
  cands.push({
    top: target.bottom + GAP,
    left: clamp(target.right - panelW, EDGE, vw - panelW - EDGE),
    side: 'bottom',
    arrowX: Math.min(
      Math.max(cx - clamp(target.right - panelW, EDGE, vw - panelW - EDGE), 24),
      panelW - 24,
    ),
    arrowY: 0,
  })
  // top · linksbündig
  cands.push({
    top: target.top - GAP - panelH,
    left: clamp(target.left, EDGE, vw - panelW - EDGE),
    side: 'top',
    arrowX: Math.min(Math.max(cx - clamp(target.left, EDGE, vw - panelW - EDGE), 24), panelW - 24),
    arrowY: panelH,
  })
  // top · rechtsbündig
  cands.push({
    top: target.top - GAP - panelH,
    left: clamp(target.right - panelW, EDGE, vw - panelW - EDGE),
    side: 'top',
    arrowX: Math.min(
      Math.max(cx - clamp(target.right - panelW, EDGE, vw - panelW - EDGE), 24),
      panelW - 24,
    ),
    arrowY: panelH,
  })

  return cands
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function isInsideViewport(pos: Position, panelW: number, panelH: number, vw: number, vh: number): boolean {
  return (
    pos.top >= EDGE &&
    pos.left >= EDGE &&
    pos.top + panelH <= vh - EDGE &&
    pos.left + panelW <= vw - EDGE
  )
}

function overlapsTarget(pos: Position, panelW: number, panelH: number, target: DOMRect): boolean {
  const l = pos.left
  const r = pos.left + panelW
  const t = pos.top
  const b = pos.top + panelH
  return !(r <= target.left || l >= target.right || b <= target.top || t >= target.bottom)
}

export function TutorialCoachPanel(props: {
  fierKey?: string
  headline: string
  body: string
  stepIndex?: number
  stepTotal?: number
  placement?: CoachPlacement
  /** Desktop: Panel neben diesem Element (hybrid-Placement) */
  nearSelector?: string
  className?: string
  /** Kontextuelle Mascot-Größe (Phase 3) */
  mascotSize?: number
  /** Info-Schritt: „Weiter“ löst Fortschritt in der Task-Queue aus */
  acknowledgeRequired?: boolean
}) {
  const { abortTutorial, isActive: tutorialOrchestratorActive } = useTutorialOrchestrator()
  const pose = fierLibraryKeyToPose(props.fierKey)
  const placement = props.placement ?? 'bottom-right'
  const [pos, setPos] = useState<Position | null>(null)
  const [panelRef, setPanelRef] = useState<HTMLDivElement | null>(null)

  const profileCoach = isProfileMenuCoach(props.nearSelector)
  const dashboardWelcomeCoach = isDashboardWelcomeCoach(props.nearSelector)
  const panelW = useMemo(
    () => (profileCoach ? PANEL_PROFILE_MAX_W : PANEL_MAX_W),
    [profileCoach],
  )
  const [panelH, setPanelH] = useState<number>(PANEL_EST_H)

  /* DOM-Layout: reale Panel-Höhe + feste Position neben Anker; setState in layout effect ist beabsichtigt */
  /* eslint-disable react-hooks/set-state-in-effect */
  // Measure actual panel height once rendered
  useLayoutEffect(() => {
    if (!panelRef) return
    const h = panelRef.getBoundingClientRect().height
    if (h > 0 && Math.abs(h - panelH) > 2) setPanelH(h)
  }, [panelRef, props.headline, props.body, panelH])

  useLayoutEffect(() => {
    const sel = props.nearSelector
    if (!sel) {
      setPos(null)
      return
    }
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (isMobile) {
      setPos(null)
      return
    }

    let targetEl: Element | null = document.querySelector(sel)
    let ro: ResizeObserver | null = null
    let targetRo: ResizeObserver | null = null

    const update = () => {
      targetEl = document.querySelector(sel)
      if (!targetEl) {
        setPos(null)
        return
      }
      const r = targetEl.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) {
        setPos(null)
        return
      }
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (profileCoach) {
        const profilePos = computeProfileCoachPosition(r, panelW, panelH, vw, vh)
        const menuOpen = Boolean(findVisibleDropdownNearProfile(r))
        if (profilePos && isInsideViewport(profilePos, panelW, panelH, vw, vh)) {
          // Neben offenem Menü: Platzierung hat Vorrang; sonst nicht mit dem Trigger kollidieren.
          if (menuOpen || !overlapsTarget(profilePos, panelW, panelH, r)) {
            setPos(profilePos)
            return
          }
        }
      }

      if (dashboardWelcomeCoach) {
        const dashPos = computeDashboardWelcomeCoachPosition(r, panelW, panelH, vw, vh)
        if (isInsideViewport(dashPos, panelW, panelH, vw, vh) && !overlapsTarget(dashPos, panelW, panelH, r)) {
          setPos(dashPos)
          return
        }
      }

      const raw = computeCandidates(r, panelW, panelH, vw, vh)
      const cands = profileCoach ? orderCandidatesForProfile(raw) : raw
      const pick = cands.find(
        (c) => isInsideViewport(c, panelW, panelH, vw, vh) && !overlapsTarget(c, panelW, panelH, r),
      )
      if (pick) {
        setPos(pick)
      } else {
        // Fallback: bodenfixiert
        setPos(null)
      }
    }

    update()

    // ResizeObserver auf Ziel + Panel
    try {
      if (targetEl) {
        targetRo = new ResizeObserver(update)
        targetRo.observe(targetEl)
      }
      if (panelRef) {
        ro = new ResizeObserver(update)
        ro.observe(panelRef)
      }
    } catch {
      // ältere Browser — best effort
    }

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    // Re-eval bei DOM-Änderungen der Seite (Selektor wechselt)
    const mo = new MutationObserver(update)
    mo.observe(document.body, { subtree: true, childList: true, attributes: true })

    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      ro?.disconnect()
      targetRo?.disconnect()
      mo.disconnect()
    }
  }, [props.nearSelector, props.headline, props.body, panelRef, panelW, panelH, profileCoach, dashboardWelcomeCoach])
  /* eslint-enable react-hooks/set-state-in-effect */

  const useNear = Boolean(pos)

  // Sprechblasen-Pfeil nur im Hybrid-Modus
  const arrow = pos ? <CoachArrow side={pos.side} x={pos.arrowX} y={pos.arrowY} /> : null

  const mascotSize = props.mascotSize ?? 64

  return (
    <div
      ref={setPanelRef}
      data-testid="tutorial-coach-panel"
      className={cn(
        'pointer-events-auto fixed max-w-sm rounded-xl border border-border bg-card shadow-lg transition-[top,left,opacity] duration-200',
        profileCoach ? 'z-40' : 'z-[105]',
        profileCoach ? 'p-3' : 'p-4',
        !useNear && placement === 'bottom-right' && 'bottom-4 right-4',
        !useNear && placement === 'bottom-left' && 'bottom-4 left-4',
        !useNear && placement === 'top-right' && 'top-4 right-4',
        !useNear && placement === 'top-left' && 'top-4 left-4',
        props.className,
      )}
      style={
        useNear && pos
          ? {
              top: pos.top,
              left: pos.left,
              width: `min(${panelW}px, calc(100vw - 16px))`,
              maxHeight: profileCoach ? 'min(40vh, 280px)' : undefined,
            }
          : undefined
      }
      role="status"
      aria-live="polite"
    >
      {tutorialOrchestratorActive ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 z-[2] h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Tour abbrechen und schließen"
          title="Tour abbrechen"
          onClick={(e) => {
            e.stopPropagation()
            abortTutorial()
          }}
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </Button>
      ) : null}
      {arrow}
      <div className={cn('flex gap-3 pr-6', profileCoach && 'max-h-[min(40vh,280px)] overflow-y-auto')}>
        <div className="shrink-0 transition-transform duration-200 motion-safe:scale-100">
          <FierMascot size={profileCoach ? Math.min(mascotSize, 48) : mascotSize} pose={pose} />
        </div>
        <div className="min-w-0 space-y-1">
          {props.stepTotal != null &&
          props.stepIndex != null &&
          props.stepTotal > 1 &&
          props.stepTotal <= 8 ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Schritt {props.stepIndex + 1} von {props.stepTotal}
            </p>
          ) : null}
          <p className="text-sm font-semibold leading-snug text-foreground">{props.headline}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{props.body}</p>
        </div>
      </div>
      {props.acknowledgeRequired ? (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            onClick={() => emitTutorialInteractiveAck()}
          >
            Weiter
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function CoachArrow({ side, x, y }: { side: Side; x: number; y: number }) {
  // 10px Dreieck; nur Einzelfarben (kein borderColor-Shorthand), sonst React-Warnung bei Updates.
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    pointerEvents: 'none',
  }
  const card = 'hsl(var(--card, 0 0% 100%))'
  const tr = 'transparent'
  switch (side) {
    case 'bottom':
      return (
        <span
          style={{
            ...base,
            top: -8,
            left: x - 8,
            borderWidth: '0 8px 8px 8px',
            borderTopColor: tr,
            borderRightColor: tr,
            borderLeftColor: tr,
            borderBottomColor: card,
          }}
          aria-hidden
        />
      )
    case 'top':
      return (
        <span
          style={{
            ...base,
            bottom: -8,
            left: x - 8,
            borderWidth: '8px 8px 0 8px',
            borderTopColor: card,
            borderRightColor: tr,
            borderLeftColor: tr,
            borderBottomColor: tr,
          }}
          aria-hidden
        />
      )
    case 'right':
      return (
        <span
          style={{
            ...base,
            left: -8,
            top: y - 8,
            borderWidth: '8px 8px 8px 0',
            borderTopColor: tr,
            borderRightColor: card,
            borderBottomColor: tr,
            borderLeftColor: tr,
          }}
          aria-hidden
        />
      )
    case 'left':
      return (
        <span
          style={{
            ...base,
            right: -8,
            top: y - 8,
            borderWidth: '8px 0 8px 8px',
            borderTopColor: tr,
            borderRightColor: tr,
            borderBottomColor: tr,
            borderLeftColor: card,
          }}
          aria-hidden
        />
      )
  }
}

