// InteractivePLUTable: Echte Masterliste mit DnD für Blöcke und einzelne Produkte
// Zwei-Spalten-Layout wie die echte PLUTable, mit Drag-Handles für Blöcke und Produkte
/* eslint-disable react-hooks/refs -- @dnd-kit/sortable: setNodeRef/attributes/listeners sind für Render vorgesehen */

import {
  Fragment,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type RefObject,
} from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { GripHorizontal, GripVertical } from 'lucide-react'
import {
  PLU_TABLE_HEADER_CLASS,
  PLU_TABLE_HEADER_GEWICHT_CLASS,
  PLU_TABLE_HEADER_STUECK_CLASS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts, useUpdateCustomProduct } from '@/hooks/useCustomProducts'
import { useBlocks } from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import {
  useStoreObstBlockOrder,
  useStoreObstNameBlockOverrides,
  useReorderStoreObstBlocks,
  useAssignObstProductBlockOverride,
} from '@/hooks/useStoreObstBlockLayout'
import {
  buildNameBlockOverrideMap,
  effectiveBlockIdForStoreOverride,
  sortBlocksWithStoreOrder,
} from '@/lib/block-override-utils'
import { getDisplayNameForItem, groupItemsByBlock } from '@/lib/plu-helpers'
import type { CustomProduct, MasterPLUItem, Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { BlockGroup } from '@/lib/plu-helpers'
import { obstInteractiveCollision } from '@/lib/obst-interactive-collision'
import { computeBlockOrderAfterDrop } from '@/lib/obst-block-reorder'

/** Eigenes Obst-Produkt als Master-Zeile für die Block-Sortier-Ansicht (DnD). */
function customProductToInteractiveMasterRow(cp: CustomProduct, versionId: string): MasterPLUItem {
  return {
    id: cp.id,
    version_id: versionId,
    plu: cp.plu,
    system_name: cp.name,
    display_name: cp.name,
    item_type: cp.item_type,
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: cp.block_id,
    is_admin_eigen: false,
    is_manually_renamed: false,
    preis: cp.preis,
    created_at: cp.created_at,
  }
}

/** Findet den Block-ID eines Items anhand seiner ID */
function findBlockIdForItem(itemId: string, groups: BlockGroup<MasterPLUItem>[]): string | null {
  for (const g of groups) {
    if (g.items.some((item) => item.id === itemId)) {
      return g.blockId
    }
  }
  return null
}

/** Finder-ähnliche Einfügemarkierung: vor/nach einer Zeile oder auf Warengruppenkopf */
type ItemDropIndicator =
  | { kind: 'item'; itemId: string; edge: 'before' | 'after' }
  | { kind: 'block'; dropId: string }
  /** Warengruppe verschieben: Ziel-Kopf + ob davor oder danach eingefügt wird */
  | { kind: 'blockReorder'; dropId: string; edge: 'before' | 'after' }

/** Optik der Einfügelinie (Tabelle + fixed Layer) – volle Breite des jeweiligen Kastens */
const PLU_INSERT_LINE_INNER_CLASS = 'h-px w-full rounded-sm bg-primary'

/**
 * Horizontale Ausdehnung der schwebenden Linie: nur der PLU-Tabellen-Kasten, nicht der ganze Viewport.
 */
function pickHorizontalBoundsForInsertLine(
  lineY: number,
  displayMode: string,
  mixedWrap: HTMLElement | null,
  pieceWrap: HTMLElement | null,
  weightWrap: HTMLElement | null,
): { left: number; width: number } | null {
  const candidates: HTMLElement[] = []
  if (displayMode === 'SEPARATED') {
    if (pieceWrap) candidates.push(pieceWrap)
    if (weightWrap) candidates.push(weightWrap)
  } else if (mixedWrap) {
    candidates.push(mixedWrap)
  }
  if (candidates.length === 0) return null

  for (const el of candidates) {
    const r = el.getBoundingClientRect()
    if (lineY >= r.top - 3 && lineY <= r.bottom + 3) {
      return { left: r.left, width: r.width }
    }
  }
  if (candidates.length === 1) {
    const r = candidates[0].getBoundingClientRect()
    return { left: r.left, width: r.width }
  }
  let best: { left: number; width: number } | null = null
  let bestDist = Infinity
  for (const el of candidates) {
    const r = el.getBoundingClientRect()
    const mid = (r.top + r.bottom) / 2
    const d = Math.abs(lineY - mid)
    if (d < bestDist) {
      bestDist = d
      best = { left: r.left, width: r.width }
    }
  }
  return best
}

/**
 * Y-Position (Viewport) der Einfügelinie für einen Indikator – immer an Slot-Grenze, nicht Maus.
 */
function getInsertLineYForIndicator(ind: ItemDropIndicator): number | null {
  if (ind.kind === 'blockReorder' || ind.kind === 'block') {
    const el = document.querySelector(`[data-interactive-plu-block-drop="${ind.dropId}"]`)
    if (!el || !(el instanceof HTMLElement)) return null
    const r = el.getBoundingClientRect()
    if (ind.kind === 'block') return r.top
    return ind.edge === 'before' ? r.top : r.bottom
  }
  if (ind.kind === 'item') {
    const el = document.querySelector(`[data-interactive-plu-row="${ind.itemId}"]`)
    if (!el || !(el instanceof HTMLElement)) return null
    const r = el.getBoundingClientRect()
    return ind.edge === 'before' ? r.top : r.bottom
  }
  return null
}

/**
 * Einfügemarkierung aus nächstgelegener Kante aller Gruppenköpfe zur Zeiger-Y (pointerYRef).
 * `lineY` = tatsächliche Slot-Grenze für die Anzeige (nicht Maus-Y).
 */
function pointerNearestBlockReorderGap(
  draggingBlockId: string,
  centerY: number,
):
  | { result: 'next'; indicator: ItemDropIndicator; lineY: number }
  | { result: 'keepStale' }
  | { result: 'clear' } {
  const nodes = document.querySelectorAll('[data-interactive-plu-block-drop]')
  if (nodes.length === 0) return { result: 'keepStale' }

  type Cand = { dropId: string; edge: 'before' | 'after'; y: number }
  const cands: Cand[] = []

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const dropId = node.getAttribute('data-interactive-plu-block-drop')
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

export function InteractivePLUTable() {
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const updateCustomProduct = useUpdateCustomProduct()
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: storeBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrideMap = useMemo(
    () => buildNameBlockOverrideMap(storeNameOverrides),
    [storeNameOverrides],
  )
  const reorderStoreMutation = useReorderStoreObstBlocks()
  const assignOverrideMutation = useAssignObstProductBlockOverride()

  const displayMode = layoutSettings?.display_mode ?? 'MIXED'

  const mergedItems = useMemo(() => {
    const vid = activeVersion?.id
    if (!vid) return items
    const masterPluSet = new Set(items.map((i) => i.plu))
    const extras = customProducts
      .filter((c) => !masterPluSet.has(c.plu))
      .map((c) => customProductToInteractiveMasterRow(c, vid))
    return [...items, ...extras]
  }, [items, customProducts, activeVersion?.id])

  const customById = useMemo(() => new Map(customProducts.map((c) => [c.id, c])), [customProducts])

  const sortedBlocks = useMemo(
    () => sortBlocksWithStoreOrder(blocks, storeBlockOrder),
    [blocks, storeBlockOrder],
  )

  const groups = useMemo(
    () =>
      groupItemsByBlock<MasterPLUItem>(mergedItems, sortedBlocks, {
        resolveBlockId: (item) =>
          effectiveBlockIdForStoreOverride(item.system_name, item.block_id, nameBlockOverrideMap),
        sortedBlocks,
      }),
    [mergedItems, sortedBlocks, nameBlockOverrideMap],
  )

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const [dragType, setDragType] = useState<'block' | 'item' | null>(null)
  const [dragData, setDragData] = useState<{ block?: Block; item?: MasterPLUItem } | null>(null)
  const [itemDropIndicator, setItemDropIndicator] = useState<ItemDropIndicator | null>(null)
  /** Fallback, wenn dnd-kit beim Loslassen kein `over` liefert (z. B. Timing/Collision) */
  const itemDropIndicatorRef = useRef<ItemDropIndicator | null>(null)
  /** Letzte gültige blockReorder-Markierung – bei kurz fehlendem `over` nicht flackern */
  const lastBlockReorderRef = useRef<ItemDropIndicator | null>(null)
  /** Zuletzt gültiges `over.id` aus onDragOver – oft stabiler als `over` allein in onDragEnd */
  const lastOverIdRef = useRef<string | null>(null)
  const pointerYRef = useRef(0)
  /** Y-Position der schwebenden Einfügelinie (Viewport) – Slot-Grenze, nicht Maus */
  const [insertSlotLineY, setInsertSlotLineY] = useState<number | null>(null)
  /** Horizontale Ausdehnung nur über den PLU-Tabellen-Kasten (nicht volle Fensterbreite) */
  const [insertSlotLineHorizontal, setInsertSlotLineHorizontal] = useState<{
    left: number
    width: number
  } | null>(null)
  const insertSlotLineYRef = useRef<number | null>(null)
  insertSlotLineYRef.current = insertSlotLineY
  /** Listener nur bei sichtbarer Linie; Y-Wert läuft über insertSlotLineYRef (kein Re-Subscribe bei jedem Drag-Tick). */
  const insertLineActive = insertSlotLineY != null

  /** Tabellen-„Kasten“ für Breitenmessung (gem. `rounded-b-lg border` in TwoColumnInteractive) */
  const mixedTableWrapRef = useRef<HTMLDivElement>(null)
  const separatedPieceTableWrapRef = useRef<HTMLDivElement>(null)
  const separatedWeightTableWrapRef = useRef<HTMLDivElement>(null)

  const setInsertSlotLine = useCallback(
    (y: number | null) => {
      setInsertSlotLineY(y)
      if (y == null) {
        setInsertSlotLineHorizontal(null)
        return
      }
      setInsertSlotLineHorizontal(
        pickHorizontalBoundsForInsertLine(
          y,
          displayMode,
          mixedTableWrapRef.current,
          separatedPieceTableWrapRef.current,
          separatedWeightTableWrapRef.current,
        ),
      )
    },
    [displayMode],
  )

  /** Bei Scroll/Resize bleibt die Linie am Slot, der Kasten verschiebt sich im Viewport → Breite neu messen */
  useEffect(() => {
    if (!insertLineActive) return
    const sync = () => {
      const y = insertSlotLineYRef.current
      if (y == null) return
      setInsertSlotLineHorizontal(
        pickHorizontalBoundsForInsertLine(
          y,
          displayMode,
          mixedTableWrapRef.current,
          separatedPieceTableWrapRef.current,
          separatedWeightTableWrapRef.current,
        ),
      )
    }
    sync()
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [insertLineActive, displayMode])

  useEffect(() => {
    if (dragType !== 'item' && dragType !== 'block') return
    const onMove = (e: PointerEvent) => {
      pointerYRef.current = e.clientY
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [dragType])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setItemDropIndicator(null)
    itemDropIndicatorRef.current = null
    lastBlockReorderRef.current = null
    setInsertSlotLine(null)
    lastOverIdRef.current = null
    const id = String(event.active.id)
    if (id.startsWith('drag-block-')) {
      const blockId = id.replace('drag-block-', '')
      const block = sortedBlocks.find((b) => b.id === blockId)
      if (block) {
        setDragType('block')
        setDragData({ block })
      }
    } else if (id.startsWith('drag-item-')) {
      const itemId = id.replace('drag-item-', '')
      const item = mergedItems.find((i) => i.id === itemId)
      if (item) {
        setDragType('item')
        setDragData({ item })
      }
    }
    const ae = event.activatorEvent
    if (ae && 'clientY' in ae && typeof (ae as PointerEvent).clientY === 'number') {
      pointerYRef.current = (ae as PointerEvent).clientY
    }
  }, [sortedBlocks, mergedItems, setInsertSlotLine])

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const activeId = String(event.active.id)

      if (activeId.startsWith('drag-block-')) {
        const draggingBlockId = activeId.replace('drag-block-', '')
        const pointerY = pointerYRef.current
        const r = pointerNearestBlockReorderGap(draggingBlockId, pointerY)
        if (r.result === 'keepStale') {
          const stale = lastBlockReorderRef.current
          if (stale?.kind === 'blockReorder') {
            setItemDropIndicator(stale)
            itemDropIndicatorRef.current = stale
            const y = getInsertLineYForIndicator(stale)
            if (y != null) setInsertSlotLine(y)
          }
          return
        }
        if (r.result === 'clear') {
          lastBlockReorderRef.current = null
          setItemDropIndicator(null)
          itemDropIndicatorRef.current = null
          setInsertSlotLine(null)
          return
        }
        lastBlockReorderRef.current = r.indicator
        setItemDropIndicator(r.indicator)
        itemDropIndicatorRef.current = r.indicator
        setInsertSlotLine(r.lineY)
        return
      }

      if (!activeId.startsWith('drag-item-')) {
        setItemDropIndicator(null)
        itemDropIndicatorRef.current = null
        return
      }
      const draggingId = activeId.replace('drag-item-', '')
      const over = event.over
      if (!over) {
        setItemDropIndicator(null)
        itemDropIndicatorRef.current = null
        setInsertSlotLine(null)
        return
      }
      const overId = String(over.id)
      if (overId.startsWith('drag-item-')) {
        const itemId = overId.replace('drag-item-', '')
        if (itemId === draggingId) {
          setItemDropIndicator(null)
          itemDropIndicatorRef.current = null
          setInsertSlotLine(null)
          return
        }
        const el = document.querySelector(`[data-interactive-plu-row="${itemId}"]`)
        if (!el || !(el instanceof HTMLElement)) {
          setItemDropIndicator(null)
          itemDropIndicatorRef.current = null
          setInsertSlotLine(null)
          return
        }
        const rect = el.getBoundingClientRect()
        const y = pointerYRef.current
        const mid = rect.top + rect.height / 2
        const edge: 'before' | 'after' = y < mid ? 'before' : 'after'
        const next: ItemDropIndicator = { kind: 'item', itemId, edge }
        setItemDropIndicator(next)
        itemDropIndicatorRef.current = next
        setInsertSlotLine(getInsertLineYForIndicator(next))
        return
      }
      if (overId.startsWith('drop-block-')) {
        const next: ItemDropIndicator = { kind: 'block', dropId: overId }
        setItemDropIndicator(next)
        itemDropIndicatorRef.current = next
        setInsertSlotLine(getInsertLineYForIndicator(next))
        return
      }
      setItemDropIndicator(null)
      itemDropIndicatorRef.current = null
      setInsertSlotLine(null)
    },
    [setInsertSlotLine],
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const o = event.over
    if (o) {
      lastOverIdRef.current = String(o.id)
    }
    const activeId = String(event.active.id)

    if (activeId.startsWith('drag-item-')) {
      const draggingId = activeId.replace('drag-item-', '')
      if (!o) {
        setInsertSlotLine(null)
        return
      }
      const overId = String(o.id)
      if (overId.startsWith('drag-item-')) {
        const itemId = overId.replace('drag-item-', '')
        if (itemId === draggingId) {
          setInsertSlotLine(null)
          return
        }
        const el = document.querySelector(`[data-interactive-plu-row="${itemId}"]`)
        if (!el || !(el instanceof HTMLElement)) {
          setInsertSlotLine(null)
          return
        }
        const rect = el.getBoundingClientRect()
        const y = pointerYRef.current
        const mid = rect.top + rect.height / 2
        const edge: 'before' | 'after' = y < mid ? 'before' : 'after'
        setInsertSlotLine(
          getInsertLineYForIndicator({ kind: 'item', itemId, edge }),
        )
        return
      }
      if (overId.startsWith('drop-block-')) {
        setInsertSlotLine(getInsertLineYForIndicator({ kind: 'block', dropId: overId }))
        return
      }
      setInsertSlotLine(null)
      return
    }

    if (!activeId.startsWith('drag-block-')) return
    const draggingBlockId = activeId.replace('drag-block-', '')
    const pointerY = pointerYRef.current
    const r = pointerNearestBlockReorderGap(draggingBlockId, pointerY)
    if (r.result === 'keepStale') {
      const stale = lastBlockReorderRef.current
      if (stale?.kind === 'blockReorder') {
        setItemDropIndicator(stale)
        itemDropIndicatorRef.current = stale
        const y = getInsertLineYForIndicator(stale)
        if (y != null) setInsertSlotLine(y)
      }
      return
    }
    if (r.result === 'clear') {
      lastBlockReorderRef.current = null
      setItemDropIndicator(null)
      itemDropIndicatorRef.current = null
      setInsertSlotLine(null)
      return
    }
    lastBlockReorderRef.current = r.indicator
    setItemDropIndicator(r.indicator)
    itemDropIndicatorRef.current = r.indicator
    setInsertSlotLine(r.lineY)
  }, [setInsertSlotLine])

  const handleDragCancel = useCallback(() => {
    setDragType(null)
    setDragData(null)
    setItemDropIndicator(null)
    itemDropIndicatorRef.current = null
    lastBlockReorderRef.current = null
    setInsertSlotLine(null)
    lastOverIdRef.current = null
  }, [setInsertSlotLine])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const indicatorSnapshot = itemDropIndicatorRef.current
    const lastOverSnapshot = lastOverIdRef.current
    setDragType(null)
    setDragData(null)
    setItemDropIndicator(null)
    itemDropIndicatorRef.current = null
    lastBlockReorderRef.current = null
    setInsertSlotLine(null)
    lastOverIdRef.current = null

    const activeId = String(active.id)
    let overId: string | null = over ? String(over.id) : null
    if (!overId) {
      overId = lastOverSnapshot
    }
    if (!overId && activeId.startsWith('drag-item-') && indicatorSnapshot) {
      if (indicatorSnapshot.kind === 'block') {
        overId = indicatorSnapshot.dropId
      } else if (indicatorSnapshot.kind === 'item') {
        overId = `drag-item-${indicatorSnapshot.itemId}`
      }
    }
    if (!overId && activeId.startsWith('drag-block-') && indicatorSnapshot?.kind === 'blockReorder') {
      overId = indicatorSnapshot.dropId
    }
    // Kollision kann trotzdem die eigene Zeile liefern → letztes sinnvolles Ziel (Over/Indikator)
    if (activeId.startsWith('drag-item-') && overId === activeId) {
      if (lastOverSnapshot && lastOverSnapshot !== activeId) {
        overId = lastOverSnapshot
      } else if (indicatorSnapshot?.kind === 'block') {
        overId = indicatorSnapshot.dropId
      } else if (indicatorSnapshot?.kind === 'item') {
        overId = `drag-item-${indicatorSnapshot.itemId}`
      }
    }
    if (!overId) {
      if (activeId.startsWith('drag-item-') || activeId.startsWith('drag-block-')) {
        toast.message(
          'Kein Ziel erkannt – bitte auf eine Warengruppe oder eine andere Zeile loslassen.',
        )
      }
      return
    }

    // ========== BLOCK: Reihenfolge ändern (Ziel-Kopf + vor/nach aus Indikator) ==========
    if (activeId.startsWith('drag-block-')) {
      const fromBlockId = activeId.replace('drag-block-', '')

      let targetDropId: string | null = null
      let edge: 'before' | 'after' = 'before'

      if (indicatorSnapshot?.kind === 'blockReorder') {
        targetDropId = indicatorSnapshot.dropId
        edge = indicatorSnapshot.edge
      } else if (overId?.startsWith('drop-block-')) {
        targetDropId = overId
        edge = 'before'
      } else if (lastOverSnapshot?.startsWith('drop-block-')) {
        targetDropId = lastOverSnapshot
        edge = 'before'
      } else if (overId?.startsWith('drag-item-')) {
        const targetItemId = overId.replace('drag-item-', '')
        const targetBlockId = findBlockIdForItem(targetItemId, groups)
        targetDropId =
          targetBlockId === null ? 'drop-block-unassigned' : `drop-block-${targetBlockId}`
        edge = 'before'
      }

      if (!targetDropId) {
        toast.message(
          'Kein Ziel erkannt – bitte auf den Kopf einer anderen Warengruppe loslassen.',
        )
        return
      }

      const newIds = computeBlockOrderAfterDrop(sortedBlocks, fromBlockId, targetDropId, edge)
      if (!newIds) {
        return
      }

      try {
        await reorderStoreMutation.mutateAsync(newIds)
        toast.success('Warengruppe verschoben')
      } catch {
        toast.error('Fehler beim Verschieben')
      }
      return
    }

    // ========== PRODUKT auf BLOCK: Zuweisen ==========
    if (activeId.startsWith('drag-item-') && overId.startsWith('drop-block-')) {
      const itemId = activeId.replace('drag-item-', '')
      const targetBlockId = overId.replace('drop-block-', '')
      const blockId = targetBlockId === 'unassigned' ? null : targetBlockId
      const item = mergedItems.find((i) => i.id === itemId)
      if (!item) return

      const custom = customById.get(itemId)
      try {
        if (custom) {
          await updateCustomProduct.mutateAsync({
            id: custom.id,
            block_id: blockId,
          })
          toast.success('Produkt verschoben')
        } else {
          await assignOverrideMutation.mutateAsync({
            systemName: item.system_name,
            masterBlockId: item.block_id,
            targetBlockId: blockId,
          })
          toast.success('Produkt verschoben')
        }
      } catch {
        toast.error('Fehler beim Verschieben')
      }
      return
    }

    // ========== PRODUKT auf PRODUKT: Ziel-Block des Produkts finden ==========
    if (activeId.startsWith('drag-item-') && overId.startsWith('drag-item-')) {
      const itemId = activeId.replace('drag-item-', '')
      const targetItemId = overId.replace('drag-item-', '')
      if (itemId === targetItemId) return

      const targetBlockId = findBlockIdForItem(targetItemId, groups)
      const sourceBlockId = findBlockIdForItem(itemId, groups)
      if (targetBlockId === sourceBlockId) {
        toast.message('Produkt ist bereits in dieser Warengruppe.')
        return
      }

      const item = mergedItems.find((i) => i.id === itemId)
      if (!item) return

      const custom = customById.get(itemId)
      try {
        if (custom) {
          await updateCustomProduct.mutateAsync({
            id: custom.id,
            block_id: targetBlockId,
          })
          toast.success('Produkt verschoben')
        } else {
          await assignOverrideMutation.mutateAsync({
            systemName: item.system_name,
            masterBlockId: item.block_id,
            targetBlockId: targetBlockId,
          })
          toast.success('Produkt verschoben')
        }
      } catch {
        toast.error('Fehler beim Verschieben')
      }
    }
  }, [
    sortedBlocks,
    groups,
    reorderStoreMutation,
    assignOverrideMutation,
    mergedItems,
    customById,
    updateCustomProduct,
    setInsertSlotLine,
  ])

  if (mergedItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Keine PLU-Daten vorhanden. Lade zuerst eine Excel-Datei hoch.
      </div>
    )
  }

  // SEPARATED: Zwei Tabellen
  if (displayMode === 'SEPARATED') {
    const pieceItems = mergedItems.filter((i) => i.item_type === 'PIECE')
    const weightItems = mergedItems.filter((i) => i.item_type === 'WEIGHT')
    const pieceGroups = groupItemsByBlock<MasterPLUItem>(pieceItems, sortedBlocks)
    const weightGroups = groupItemsByBlock<MasterPLUItem>(weightItems, sortedBlocks)

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={obstInteractiveCollision}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {dragType === 'block' && (
          <p className="text-xs text-muted-foreground mb-2" role="status">
            Nur Warengruppen sichtbar – ziehe eine Gruppe an die gewünschte Stelle. Die blaue Linie zeigt die Einfügeposition.
          </p>
        )}
        <div className="space-y-8">
          {pieceGroups.length > 0 && (
            <div>
              <div className={PLU_TABLE_HEADER_STUECK_CLASS}>
                PLU-Liste Stück
              </div>
              <TwoColumnInteractive
                tableWrapRef={separatedPieceTableWrapRef}
                groups={pieceGroups}
                collapseProductRows={dragType === 'block'}
                skipBlockReorderTableGaps={dragType === 'block'}
                skipItemTableGaps={dragType === 'item'}
                itemDropIndicator={itemDropIndicator}
                activeDragItemId={dragType === 'item' ? dragData?.item?.id ?? null : null}
              />
            </div>
          )}
          {weightGroups.length > 0 && (
            <div>
              <div className={PLU_TABLE_HEADER_GEWICHT_CLASS}>
                PLU-Liste Gewicht
              </div>
              <TwoColumnInteractive
                tableWrapRef={separatedWeightTableWrapRef}
                groups={weightGroups}
                collapseProductRows={dragType === 'block'}
                skipBlockReorderTableGaps={dragType === 'block'}
                skipItemTableGaps={dragType === 'item'}
                itemDropIndicator={itemDropIndicator}
                activeDragItemId={dragType === 'item' ? dragData?.item?.id ?? null : null}
              />
            </div>
          )}
        </div>
        {(dragType === 'block' || dragType === 'item') &&
          insertSlotLineY != null &&
          insertSlotLineHorizontal != null && (
            <InsertSlotFloatingLine top={insertSlotLineY} {...insertSlotLineHorizontal} />
          )}
        <DragOverlayContent dragType={dragType} dragData={dragData} />
      </DndContext>
    )
  }

  // MIXED
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={obstInteractiveCollision}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {dragType === 'block' && (
        <p className="text-xs text-muted-foreground mb-2" role="status">
          Nur Warengruppen sichtbar – ziehe eine Gruppe an die gewünschte Stelle. Die blaue Linie zeigt die Einfügeposition.
        </p>
      )}
      <div className={PLU_TABLE_HEADER_CLASS}>
        PLU-Liste
      </div>
      <TwoColumnInteractive
        tableWrapRef={mixedTableWrapRef}
        groups={groups}
        collapseProductRows={dragType === 'block'}
        skipBlockReorderTableGaps={dragType === 'block'}
        skipItemTableGaps={dragType === 'item'}
        itemDropIndicator={itemDropIndicator}
        activeDragItemId={dragType === 'item' ? dragData?.item?.id ?? null : null}
      />
      {(dragType === 'block' || dragType === 'item') &&
        insertSlotLineY != null &&
        insertSlotLineHorizontal != null && (
          <InsertSlotFloatingLine top={insertSlotLineY} {...insertSlotLineHorizontal} />
        )}
      <DragOverlayContent dragType={dragType} dragData={dragData} />
    </DndContext>
  )
}

// ============================================================
// FlatRow: Flache Zeile (Header oder Item mit DnD-Handle)
// ============================================================

interface FlatRow {
  type: 'header' | 'item'
  label?: string
  blockId?: string | null
  item?: MasterPLUItem
}

function buildFlatRows(groups: BlockGroup<MasterPLUItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.blockName, blockId: group.blockId })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Nur Warengruppenköpfe in globaler Reihenfolge (für DnD-Reihenfolge, eine Spalte) */
function buildBlockHeaderRows(groups: BlockGroup<MasterPLUItem>[]): FlatRow[] {
  return groups.map((g) => ({
    type: 'header' as const,
    label: g.blockName,
    blockId: g.blockId,
  }))
}

// ============================================================
// TwoColumnInteractive: Zwei-Spalten-Grid mit DnD
// ============================================================

const TABLE_WRAP_CLASS = 'rounded-b-lg border border-t-0 border-border overflow-hidden'

function TwoColumnInteractive({
  tableWrapRef,
  groups,
  collapseProductRows = false,
  skipBlockReorderTableGaps = false,
  skipItemTableGaps = false,
  itemDropIndicator = null,
  activeDragItemId = null,
}: {
  /** Kasten `rounded-b-lg` für Breite der schwebenden Einfügelinie */
  tableWrapRef?: RefObject<HTMLDivElement | null>
  groups: BlockGroup<MasterPLUItem>[]
  /** Beim Ziehen einer Warengruppe: Produktzeilen ausblenden, nur Köpfe – weniger Scroll, klare Drop-Ziele */
  collapseProductRows?: boolean
  /** Blaue Linie als fixed Layer – keine doppelte Zeile in der Tabelle */
  skipBlockReorderTableGaps?: boolean
  /** Produkt-Zug: Einfügelinie nur als schwebender Slot, nicht zusätzlich in der Tabelle */
  skipItemTableGaps?: boolean
  itemDropIndicator?: ItemDropIndicator | null
  activeDragItemId?: string | null
}) {
  const flatRows = useMemo(() => buildFlatRows(groups), [groups])
  const headerOnlyRows = useMemo(() => buildBlockHeaderRows(groups), [groups])

  // Beim Warengruppen-Zug: eine Spalte, globale Reihenfolge der Köpfe (kein Split in zwei Tabellen)
  if (collapseProductRows) {
    return (
      <div ref={tableWrapRef} data-testid="interactive-plu-scroll-root" className={TABLE_WRAP_CLASS}>
        <div className="hidden md:block">
          <InteractiveColumn
            rows={headerOnlyRows}
            collapseProductRows={collapseProductRows}
            skipBlockReorderTableGaps={skipBlockReorderTableGaps}
            skipItemTableGaps={skipItemTableGaps}
            itemDropIndicator={itemDropIndicator}
            activeDragItemId={activeDragItemId}
          />
        </div>
        <div className="md:hidden space-y-3 p-2">
          {groups.map((group, groupIdx) => {
            const row: FlatRow = {
              type: 'header',
              label: group.blockName,
              blockId: group.blockId,
            }
            const headerDropId = row.blockId ? `drop-block-${row.blockId}` : 'drop-block-unassigned'
            const showBlockGapBefore =
              !skipBlockReorderTableGaps &&
              itemDropIndicator?.kind === 'blockReorder' &&
              itemDropIndicator.dropId === headerDropId &&
              itemDropIndicator.edge === 'before'
            const showBlockGapAfter =
              !skipBlockReorderTableGaps &&
              itemDropIndicator?.kind === 'blockReorder' &&
              itemDropIndicator.dropId === headerDropId &&
              itemDropIndicator.edge === 'after'
            return (
              <div
                key={`mob-hdr-${group.blockId ?? 'unassigned'}-${groupIdx}`}
                className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
              >
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <tbody>
                    {showBlockGapBefore ? <PluInsertGapRow key={`bgap-b-${headerDropId}-m-${groupIdx}`} /> : null}
                    <InteractiveBlockHeader
                      label={row.label ?? ''}
                      blockId={row.blockId}
                      itemDropIndicator={itemDropIndicator}
                    />
                    {showBlockGapAfter ? <PluInsertGapRow key={`bgap-a-${headerDropId}-m-${groupIdx}`} /> : null}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // In zwei Hälften aufteilen
  const mid = Math.ceil(flatRows.length / 2)
  const leftRows = flatRows.slice(0, mid)
  const rightRows = flatRows.slice(mid)

  return (
    <div ref={tableWrapRef} data-testid="interactive-plu-scroll-root" className={TABLE_WRAP_CLASS}>
      <div className="hidden md:flex divide-x divide-border">
        <InteractiveColumn
          rows={leftRows}
          collapseProductRows={collapseProductRows}
          skipBlockReorderTableGaps={skipBlockReorderTableGaps}
          skipItemTableGaps={skipItemTableGaps}
          itemDropIndicator={itemDropIndicator}
          activeDragItemId={activeDragItemId}
        />
        <InteractiveColumn
          rows={rightRows}
          collapseProductRows={collapseProductRows}
          skipBlockReorderTableGaps={skipBlockReorderTableGaps}
          skipItemTableGaps={skipItemTableGaps}
          itemDropIndicator={itemDropIndicator}
          activeDragItemId={activeDragItemId}
        />
      </div>
      {/* Mobil: eine Spalte, pro Warengruppe eine Karte (eigene Tabelle) */}
      <div className="md:hidden space-y-4 p-2">
        <InteractiveGroupedMobileCards
          groups={groups}
          skipBlockReorderTableGaps={skipBlockReorderTableGaps}
          skipItemTableGaps={skipItemTableGaps}
          itemDropIndicator={itemDropIndicator}
          activeDragItemId={activeDragItemId}
        />
      </div>
    </div>
  )
}

/** Mobil: je Warengruppe eine Karte mit Kopf + Produktzeilen (gleiche DnD-IDs wie Desktop). */
function InteractiveGroupedMobileCards({
  groups,
  skipBlockReorderTableGaps,
  skipItemTableGaps,
  itemDropIndicator,
  activeDragItemId,
}: {
  groups: BlockGroup<MasterPLUItem>[]
  skipBlockReorderTableGaps: boolean
  skipItemTableGaps: boolean
  itemDropIndicator: ItemDropIndicator | null
  activeDragItemId: string | null
}) {
  return (
    <>
      {groups.map((group, groupIdx) => {
        const rows: FlatRow[] = [
          { type: 'header', label: group.blockName, blockId: group.blockId },
          ...group.items.map((item) => ({ type: 'item' as const, item })),
        ]
        return (
          <div
            key={`mob-grp-${group.blockId ?? 'unassigned'}-${groupIdx}`}
            className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
          >
            <InteractiveColumn
              rows={rows}
              collapseProductRows={false}
              skipBlockReorderTableGaps={skipBlockReorderTableGaps}
              skipItemTableGaps={skipItemTableGaps}
              itemDropIndicator={itemDropIndicator}
              activeDragItemId={activeDragItemId}
              variant="mobileCard"
            />
          </div>
        )
      })}
    </>
  )
}

// ============================================================
// InteractiveColumn: Eine Spalte mit Header- und Item-Zeilen
// ============================================================

function InteractiveColumn({
  rows,
  collapseProductRows,
  skipBlockReorderTableGaps = false,
  skipItemTableGaps = false,
  itemDropIndicator,
  activeDragItemId,
  variant = 'default',
}: {
  rows: FlatRow[]
  collapseProductRows?: boolean
  skipBlockReorderTableGaps?: boolean
  skipItemTableGaps?: boolean
  itemDropIndicator?: ItemDropIndicator | null
  activeDragItemId?: string | null
  /** Mobil-Karten: etwas breitere Griff-Spalte */
  variant?: 'default' | 'mobileCard'
}) {
  const gripColClass = variant === 'mobileCard' ? 'w-12' : 'w-[36px]'
  return (
    <div className={cn('min-w-0', variant === 'default' && 'flex-1')}>
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className={gripColClass} />
          <col className="w-[80px]" />
          <col />
          <col className="w-[80px]" />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-border">
            <th className="px-1 py-1.5" />
            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              PLU
            </th>
            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
              Artikel
            </th>
            <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[80px]">
              Preis
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'header') {
              const headerDropId = row.blockId ? `drop-block-${row.blockId}` : 'drop-block-unassigned'
              const showBlockGapBefore =
                !skipBlockReorderTableGaps &&
                itemDropIndicator?.kind === 'blockReorder' &&
                itemDropIndicator.dropId === headerDropId &&
                itemDropIndicator.edge === 'before'
              const showBlockGapAfter =
                !skipBlockReorderTableGaps &&
                itemDropIndicator?.kind === 'blockReorder' &&
                itemDropIndicator.dropId === headerDropId &&
                itemDropIndicator.edge === 'after'
              return (
                <Fragment key={`hdr-${row.blockId ?? 'unassigned'}-${i}`}>
                  {showBlockGapBefore ? <PluInsertGapRow key={`bgap-b-${headerDropId}`} /> : null}
                  <InteractiveBlockHeader
                    label={row.label ?? ''}
                    blockId={row.blockId}
                    itemDropIndicator={itemDropIndicator}
                  />
                  {showBlockGapAfter ? <PluInsertGapRow key={`bgap-a-${headerDropId}`} /> : null}
                </Fragment>
              )
            }
            if (!row.item) return null
            const item = row.item
            const showGapBefore =
              !skipItemTableGaps &&
              itemDropIndicator?.kind === 'item' &&
              itemDropIndicator.itemId === item.id &&
              itemDropIndicator.edge === 'before' &&
              activeDragItemId !== item.id
            const showGapAfter =
              !skipItemTableGaps &&
              itemDropIndicator?.kind === 'item' &&
              itemDropIndicator.itemId === item.id &&
              itemDropIndicator.edge === 'after' &&
              activeDragItemId !== item.id
            return (
              <Fragment key={item.id}>
                {showGapBefore ? <PluInsertGapRow key={`gap-b-${item.id}`} /> : null}
                <InteractiveProductRow item={item} collapsed={collapseProductRows} />
                {showGapAfter ? <PluInsertGapRow key={`gap-a-${item.id}`} /> : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Einfügelinie in der Tabelle (nur wenn kein schwebender Layer für denselben Indikator) */
function PluInsertGapRow() {
  return (
    <tr className="pointer-events-none" aria-hidden>
      <td colSpan={4} className="h-0 p-0 border-0">
        <div className={PLU_INSERT_LINE_INNER_CLASS} />
      </td>
    </tr>
  )
}

/** Einfügelinie an Slot-Grenze (Viewport-fixed), nur über den PLU-Tabellen-Kasten */
function InsertSlotFloatingLine({
  top,
  left,
  width,
}: {
  top: number
  left: number
  width: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[10000] h-0"
      style={{ top, left, width }}
    >
      <div className={PLU_INSERT_LINE_INNER_CLASS} />
    </div>
  )
}

// ============================================================
// InteractiveBlockHeader: Draggable + Droppable Block-Header
// ============================================================

function InteractiveBlockHeader({
  label,
  blockId,
  itemDropIndicator,
}: {
  label: string
  blockId: string | null | undefined
  itemDropIndicator?: ItemDropIndicator | null
}) {
  const dropId = blockId ? `drop-block-${blockId}` : 'drop-block-unassigned'
  const dragId = blockId ? `drag-block-${blockId}` : undefined
  const isSortable = blockId !== null && blockId !== undefined

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: dropId })

  const draggable = useDraggable({
    id: dragId ?? 'noop',
    disabled: !isSortable,
  })

  const itemTargetsThisBlock =
    itemDropIndicator?.kind === 'block' && itemDropIndicator.dropId === dropId

  return (
    <tr
      ref={setDropRef}
      data-interactive-plu-block-drop={dropId}
      className={cn(
        'border-b border-border',
        isOver ? 'ring-1 ring-inset ring-primary/15' : '',
        draggable.isDragging ? 'opacity-30' : '',
        itemTargetsThisBlock && 'ring-1 ring-inset ring-primary/25',
      )}
    >
      <td className="px-1 py-2 text-center align-middle">
        {isSortable && (
          <button
            type="button"
            ref={draggable.setNodeRef}
            className={cn(
              'inline-flex cursor-grab items-center justify-center rounded-md active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground',
              'min-h-10 min-w-10 md:min-h-0 md:min-w-0 md:p-0',
            )}
            aria-label="Warengruppen-Reihenfolge ändern (ganze Gruppe)"
            title="Warengruppen-Reihenfolge ändern (ganze Gruppe)"
            {...draggable.attributes}
            {...draggable.listeners}
          >
            <GripHorizontal className="h-5 w-5 md:h-4 md:w-4" aria-hidden />
          </button>
        )}
      </td>
      <td colSpan={3} className="px-2 py-2 text-xs font-bold text-muted-foreground tracking-widest uppercase bg-muted/50">
        {label}
      </td>
    </tr>
  )
}

// ============================================================
// InteractiveProductRow: Draggable Produkt-Zeile
// ============================================================

function InteractiveProductRow({
  item,
  collapsed,
}: {
  item: MasterPLUItem
  collapsed?: boolean
}) {
  const dragId = `drag-item-${item.id}`
  // Draggable allein erzeugt keine Kollisions-Rechtecke: Nur Droppables sind in
  // closestCorners/closestCenter enthalten → ohne useDroppable kein over auf anderen Zeilen.
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: dragId })
  const { setNodeRef: setDropRef } = useDroppable({
    id: dragId,
    disabled: Boolean(collapsed),
  })

  const setCombinedRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      setDragRef(node)
      setDropRef(node)
    },
    [setDragRef, setDropRef],
  )

  return (
    <tr
      ref={setCombinedRef}
      data-interactive-plu-row={item.id}
      className={cn(
        'border-b border-border last:border-b-0',
        isDragging ? 'opacity-40' : '',
        collapsed && 'hidden',
      )}
    >
      <td className="px-1 py-1 text-center align-middle">
        <button
          type="button"
          className={cn(
            'inline-flex cursor-grab items-center justify-center rounded-md active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground',
            'min-h-10 min-w-10 md:min-h-0 md:min-w-0 md:p-0',
          )}
          aria-label="Produkt einer anderen Warengruppe zuordnen"
          title="Produkt einer anderen Warengruppe zuordnen"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 md:h-3 md:w-3" aria-hidden />
        </button>
      </td>
      <td className="px-2 py-1">
        <StatusBadge plu={item.plu} status={item.status} oldPlu={item.old_plu} />
      </td>
      <td className="px-2 py-1 text-sm break-words min-w-0 border-l border-border" title={getDisplayNameForItem(item.display_name, item.system_name, (item as unknown as DisplayItem).is_custom)}>
        {getDisplayNameForItem(item.display_name, item.system_name, (item as unknown as DisplayItem).is_custom)}
      </td>
      <td className="px-2 py-1 border-l border-border">
        {(item as unknown as DisplayItem).preis != null ? (
          <PreisBadge value={(item as unknown as DisplayItem).preis as number} />
        ) : null}
      </td>
    </tr>
  )
}

// ============================================================
// DragOverlay
// ============================================================

function DragOverlayContent({ dragType, dragData }: { dragType: 'block' | 'item' | null; dragData: { block?: Block; item?: MasterPLUItem } | null }) {
  if (!dragType || !dragData) return null

  const item = dragData.item
  const display = item ? (item as unknown as DisplayItem) : null

  // snapCenterToCursor: Vorschau zentriert auf dem Zeiger – sonst wirkt die Maus weit vom Kasten (Default-Offset vom Griff).
  return (
    <DragOverlay modifiers={[snapCenterToCursor]}>
      {dragType === 'block' && dragData.block && (
        <div className="box-border flex min-w-[12rem] max-w-[min(90vw,28rem)] items-start gap-2 rounded-lg border-2 border-primary bg-background px-4 py-3 text-left shadow-xl">
          <GripHorizontal className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 break-words text-sm font-bold uppercase tracking-wider text-foreground">
            {dragData.block.name}
          </span>
        </div>
      )}
      {dragType === 'item' && item && display && (
        <div className="box-border flex h-[4.25rem] w-[min(88vw,36rem)] max-w-[95vw] shrink-0 items-stretch overflow-hidden rounded-lg border-2 border-primary bg-background text-foreground shadow-2xl">
          <div className="flex w-9 shrink-0 items-center justify-center border-r border-border bg-muted/40">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 w-[76px] shrink-0 items-center justify-center overflow-hidden px-1 py-1">
            <StatusBadge
              className="max-w-full min-w-0 truncate text-xs leading-none"
              plu={item.plu}
              status={item.status}
              oldPlu={item.old_plu}
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden border-l border-border px-2 py-1.5">
            <span className="line-clamp-2 block text-left text-xs leading-tight break-words">
              {getDisplayNameForItem(item.display_name, item.system_name, display.is_custom)}
            </span>
          </div>
          <div className="flex min-w-0 w-[72px] shrink-0 items-center justify-end overflow-hidden border-l border-border px-1.5 py-1">
            {display.preis != null ? <PreisBadge value={display.preis as number} /> : <span className="text-muted-foreground">–</span>}
          </div>
        </div>
      )}
    </DragOverlay>
  )
}
