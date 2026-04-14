// Kollisionserkennung für InteractivePLUTable (Obst): Beim Ziehen einer Warengruppe
// sollen nur Drop-Zonen der Gruppenköpfe (drop-block-*) gewinnen, nicht Produktzeilen.
// Beim Ziehen eines Produkts: closestCorners (vertikale Listen), Fallback closestCenter.
// Produktzeilen sind useDraggable+useDroppable (gleiche ID), damit sie als over-Ziele zählen.
// Ohne Filter wäre die eigene Zeile oft der nächste Treffer → kein Warengruppenwechsel.

import { closestCenter, closestCorners, type CollisionDetection } from '@dnd-kit/core'

export const obstInteractiveCollision: CollisionDetection = (args) => {
  const activeId = String(args.active.id)
  if (activeId.startsWith('drag-block-')) {
    const dropOnly = args.droppableContainers.filter((c) => String(c.id).startsWith('drop-block-'))
    if (dropOnly.length === 0) return []
    return closestCenter({ ...args, droppableContainers: dropOnly })
  }
  // Produkt: Draggable+Droppable teilen dieselbe ID → closestCorners trifft oft die eigene Zeile.
  const withoutSelf = args.droppableContainers.filter((c) => String(c.id) !== activeId)
  const droppables = withoutSelf.length > 0 ? withoutSelf : args.droppableContainers
  const corners = closestCorners({ ...args, droppableContainers: droppables })
  if (corners.length > 0) return corners
  return closestCenter({ ...args, droppableContainers: droppables })
}
