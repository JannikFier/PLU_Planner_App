// Hilfen für DnD auf der Obst-Warengruppen-Workbench (Gruppen-Reihenfolge am Markt)

import {
  closestCenter,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core'

/** Finder-ähnliche Einfügemarkierung: vor/nach einem Gruppenkopf */
export type ObstWarengruppeDropIndicator =
  | { kind: 'blockReorder'; dropId: string; edge: 'before' | 'after' }

const ATTR = 'data-obst-warengruppe-block-drop'

/**
 * Nächstgelegene Slot-Grenze zwischen Warengruppen-Köpfen (Viewport-Y).
 * `dropId` entspricht dem Attributwert `drop-block-…` am Ziel-Knoten.
 */
export function pointerNearestObstBlockReorderGap(
  draggingBlockId: string,
  centerY: number,
):
  | { result: 'next'; indicator: ObstWarengruppeDropIndicator; lineY: number }
  | { result: 'keepStale' }
  | { result: 'clear' } {
  const nodes = document.querySelectorAll(`[${ATTR}]`)
  if (nodes.length === 0) return { result: 'keepStale' }

  type Cand = { dropId: string; edge: 'before' | 'after'; y: number }
  const cands: Cand[] = []

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const dropId = node.getAttribute(ATTR)
    if (!dropId?.startsWith('drop-block-')) continue
    const raw = dropId.replace('drop-block-', '')
    if (raw !== 'unassigned' && raw === draggingBlockId) continue
    const r = node.getBoundingClientRect()
    cands.push({ dropId, edge: 'before', y: r.top })
    cands.push({ dropId, edge: 'after', y: r.bottom })
  }

  if (cands.length === 0) return { result: 'clear' }

  let best = cands[0]!
  let bestD = Math.abs(best.y - centerY)
  for (let i = 1; i < cands.length; i++) {
    const c = cands[i]!
    const d = Math.abs(c.y - centerY)
    if (d < bestD) {
      best = c
      bestD = d
    }
  }

  return {
    result: 'next',
    indicator: { kind: 'blockReorder', dropId: best.dropId, edge: best.edge },
    lineY: best.y,
  }
}

/** Kollision: Warengruppe ziehen → nur drop-block-*; Artikel ziehen → Zeiger zuerst, sonst closestCorners. */
export const obstWarengruppenCollision: CollisionDetection = (args) => {
  const activeId = String(args.active.id)
  if (activeId.startsWith('drag-block-')) {
    const dropOnly = args.droppableContainers.filter((c) => String(c.id).startsWith('drop-block-'))
    if (dropOnly.length === 0) return []
    return closestCenter({ ...args, droppableContainers: dropOnly })
  }
  const byPointer = pointerWithin(args)
  if (byPointer.length > 0) return byPointer
  return closestCorners(args)
}
