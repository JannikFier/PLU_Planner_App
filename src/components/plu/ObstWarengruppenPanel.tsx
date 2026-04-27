// ObstWarengruppenPanel: Warengruppen-Workbench Obst/Gemüse (3 Spalten, analog Backshop)

import { Fragment, useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Search, Loader2, GripVertical, GripHorizontal, CheckSquare, Undo2, Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { getDisplayPlu, getDisplayNameForItem } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts, useUpdateCustomProduct } from '@/hooks/useCustomProducts'
import { useBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock } from '@/hooks/useBlocks'
import {
  useStoreObstBlockOrder,
  useStoreObstNameBlockOverrides,
  useAssignObstProductBlockOverride,
  useReorderStoreObstBlocks,
} from '@/hooks/useStoreObstBlockLayout'
import {
  buildNameBlockOverrideMap,
  effectiveBlockIdForStoreOverride,
  normalizeSystemNameForBlockOverride,
  sortBlocksWithStoreOrder,
} from '@/lib/block-override-utils'
import { computeBlockOrderAfterDrop } from '@/lib/obst-block-reorder'
import {
  obstWarengruppenCollision,
  pointerNearestObstBlockReorderGap,
  type ObstWarengruppeDropIndicator,
} from '@/lib/obst-warengruppen-dnd'
import { useAuth } from '@/hooks/useAuth'
import { useHiddenItems } from '@/hooks/useHiddenItems'
import { useObstOfferCampaignForKwYear, useObstOfferStoreDisabled } from '@/hooks/useCentralOfferCampaigns'
import { useMediaMinWidth, WARENGRUPPEN_WORKBENCH_DESKTOP_MIN_PX } from '@/hooks/useMediaMinWidth'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import type { CustomProduct, MasterPLUItem, Block } from '@/types/database'
import type { WarengruppeRecentBatch, WarengruppeRecentLine } from '@/types/warengruppen-workbench-recent'
import {
  prependRecentBatch,
  randomRecentLineId,
  removeBatchById,
  removeLineFromBatchesByLineId,
} from '@/lib/warengruppen-recent-batches'
import { WarengruppenRecentBatchesList } from '@/components/plu/WarengruppenRecentBatchesList'
import { StatusBadge } from '@/components/plu/StatusBadge'

const UNASSIGNED_KEY = '__unassigned__'

/** Sichtbare Einfüge-Linie zwischen Warengruppen-Zeilen (Reihenfolge ändern). */
function ObstBlockReorderInsertionLine() {
  return (
    <div className="pointer-events-none py-0.5" aria-hidden>
      <div className="h-0.5 w-full rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]" />
    </div>
  )
}

function gapLineAfterUnassignedBeforeFirstBlock(
  ind: ObstWarengruppeDropIndicator | null,
  firstBlockId: string | undefined,
): boolean {
  if (!ind || ind.kind !== 'blockReorder') return false
  if (ind.dropId === 'drop-block-unassigned' && ind.edge === 'after') return true
  if (firstBlockId && ind.dropId === `drop-block-${firstBlockId}` && ind.edge === 'before') return true
  return false
}

function gapLineBetweenBlocks(
  ind: ObstWarengruppeDropIndicator | null,
  upperId: string,
  lowerId: string,
): boolean {
  if (!ind || ind.kind !== 'blockReorder') return false
  return (
    (ind.dropId === `drop-block-${upperId}` && ind.edge === 'after') ||
    (ind.dropId === `drop-block-${lowerId}` && ind.edge === 'before')
  )
}

function gapLineAfterLastBlock(ind: ObstWarengruppeDropIndicator | null, lastBlockId: string | undefined): boolean {
  if (!ind || ind.kind !== 'blockReorder' || !lastBlockId) return false
  return ind.dropId === `drop-block-${lastBlockId}` && ind.edge === 'after'
}

/** Eigenes Obst-Produkt als Master-Zeile für effektive Block-Zuordnung. */
function customProductToMasterRow(cp: CustomProduct, versionId: string): MasterPLUItem {
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
    is_manual_supplement: false,
    preis: cp.preis,
    created_at: cp.created_at,
  }
}

export function ObstWarengruppenPanel() {
  const { isAdmin } = useAuth()
  const canReorderBlocks = isAdmin
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    activeVersion?.kw_nummer,
    activeVersion?.jahr,
    Boolean(activeVersion?.id),
  )
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const rawHiddenPluSet = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )
  /** Wie Masterliste/PDF: ausgeblendet + zentrale Werbung (temporär sichtbar) */
  const effectiveHiddenPLUsOnMaster = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, obstCampaign, obstStoreDisabled),
    [rawHiddenPluSet, obstCampaign, obstStoreDisabled],
  )
  const isItemHiddenOnMasterList = useCallback(
    (item: MasterPLUItem) => effectiveHiddenPLUsOnMaster.has(item.plu),
    [effectiveHiddenPLUsOnMaster],
  )
  const updateCustomProduct = useUpdateCustomProduct()
  const { data: blocks = [] } = useBlocks()
  const { data: storeBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrideMap = useMemo(
    () => buildNameBlockOverrideMap(storeNameOverrides),
    [storeNameOverrides],
  )
  const sortedBlocks = useMemo(
    () => sortBlocksWithStoreOrder(blocks, storeBlockOrder),
    [blocks, storeBlockOrder],
  )
  const reorderStoreMutation = useReorderStoreObstBlocks()
  const assignOverride = useAssignObstProductBlockOverride()
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()

  const mergedItems = useMemo(() => {
    const vid = activeVersion?.id
    if (!vid) return items
    const masterPluSet = new Set(items.map((i) => i.plu))
    const extras = customProducts
      .filter((c) => !masterPluSet.has(c.plu))
      .map((c) => customProductToMasterRow(c, vid))
    return [...items, ...extras]
  }, [items, customProducts, activeVersion?.id])

  const customById = useMemo(() => new Map(customProducts.map((c) => [c.id, c])), [customProducts])

  const effBlock = useCallback(
    (item: MasterPLUItem) =>
      effectiveBlockIdForStoreOverride(item.system_name, item.block_id, nameBlockOverrideMap),
    [nameBlockOverrideMap],
  )

  const hasMarktOverride = useCallback(
    (item: MasterPLUItem) =>
      nameBlockOverrideMap.has(normalizeSystemNameForBlockOverride(item.system_name)),
    [nameBlockOverrideMap],
  )

  const blockLabel = useCallback(
    (blockId: string | null) => {
      if (blockId == null) return 'Ohne Zuordnung'
      return blocks.find((b) => b.id === blockId)?.name ?? '—'
    },
    [blocks],
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const deferredSearch = useDebouncedValue(globalSearch, 200)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkSelectActive, setBulkSelectActive] = useState(false)
  const [recentBatches, setRecentBatches] = useState<WarengruppeRecentBatch[]>([])
  const [assignPickerItem, setAssignPickerItem] = useState<MasterPLUItem | null>(null)
  const [blockName, setBlockName] = useState('')
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showRenameBlock, setShowRenameBlock] = useState(false)
  const [showDeleteBlockConfirm, setShowDeleteBlockConfirm] = useState(false)
  const [draggingItem, setDraggingItem] = useState<MasterPLUItem | null>(null)
  const [draggingBlockLabel, setDraggingBlockLabel] = useState<string | null>(null)
  /** Nur für Darstellung: Einfüge-Linie bei Warengruppen-Reihenfolge (Refs allein triggern kein Re-Render). */
  const [blockReorderIndicatorUi, setBlockReorderIndicatorUi] = useState<ObstWarengruppeDropIndicator | null>(null)
  const isWorkbenchDesktop = useMediaMinWidth(WARENGRUPPEN_WORKBENCH_DESKTOP_MIN_PX)
  const [mobileWorkbenchStep, setMobileWorkbenchStep] = useState<'groups' | 'products'>('groups')

  useEffect(() => {
    if (isWorkbenchDesktop) setMobileWorkbenchStep('groups')
  }, [isWorkbenchDesktop])

  const itemDropIndicatorRef = useRef<ObstWarengruppeDropIndicator | null>(null)
  const lastBlockReorderRef = useRef<ObstWarengruppeDropIndicator | null>(null)
  const lastOverIdRef = useRef<string | null>(null)
  const pointerYRef = useRef(0)
  /** Während Warengruppe ziehen: Block-ID für kontinuierliche Einfüge-Linie (pointermove). */
  const draggingBlockIdRef = useRef<string | null>(null)
  const blockReorderRafRef = useRef<number | null>(null)

  const clearBlockReorderIndicator = useCallback(() => {
    if (blockReorderRafRef.current != null) {
      cancelAnimationFrame(blockReorderRafRef.current)
      blockReorderRafRef.current = null
    }
    itemDropIndicatorRef.current = null
    lastBlockReorderRef.current = null
    setBlockReorderIndicatorUi(null)
  }, [])

  const scheduleBlockReorderIndicator = useCallback((next: ObstWarengruppeDropIndicator | null) => {
    itemDropIndicatorRef.current = next
    lastBlockReorderRef.current = next
    if (blockReorderRafRef.current != null) {
      cancelAnimationFrame(blockReorderRafRef.current)
    }
    blockReorderRafRef.current = requestAnimationFrame(() => {
      blockReorderRafRef.current = null
      setBlockReorderIndicatorUi(next)
    })
  }, [])

  const applyPointerBlockReorderIndicator = useCallback(
    (draggingBlockId: string, pointerY: number) => {
      const r = pointerNearestObstBlockReorderGap(draggingBlockId, pointerY)
      if (r.result === 'keepStale') {
        const stale = lastBlockReorderRef.current
        if (stale?.kind === 'blockReorder') {
          scheduleBlockReorderIndicator(stale)
        }
        return
      }
      if (r.result === 'clear') {
        scheduleBlockReorderIndicator(null)
        return
      }
      scheduleBlockReorderIndicator(r.indicator)
    },
    [scheduleBlockReorderIndicator],
  )

  const pushRecentBatchLines = useCallback((lines: WarengruppeRecentLine[]) => {
    if (lines.length === 0) return
    setRecentBatches((prev) => prependRecentBatch(prev, lines))
  }, [])

  const selectedBlock =
    selectedKey && selectedKey !== UNASSIGNED_KEY ? blocks.find((b) => b.id === selectedKey) : undefined

  /** Nur in der Hauptliste sichtbare Artikel – gleiche Logik wie buildDisplayList (hidden_items + Werbung). */
  const blockItemCounts = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const item of mergedItems) {
      if (isItemHiddenOnMasterList(item)) continue
      const key = effBlock(item)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [mergedItems, effBlock, isItemHiddenOnMasterList])

  const overrideCount = useMemo(
    () => mergedItems.filter((i) => hasMarktOverride(i)).length,
    [mergedItems, hasMarktOverride],
  )

  const unassignedItems = useMemo(
    () => mergedItems.filter((i) => effBlock(i) == null),
    [mergedItems, effBlock],
  )

  const openMobileWorkbenchGroup = useCallback(
    (key: string) => {
      setSelectedKey(key)
      if (!bulkSelectActive) {
        if (key === UNASSIGNED_KEY) {
          setCheckedIds(new Set(unassignedItems.map((i) => i.id)))
        } else {
          setCheckedIds(new Set(mergedItems.filter((i) => effBlock(i) === key).map((i) => i.id)))
        }
      }
      setMobileWorkbenchStep('products')
    },
    [bulkSelectActive, unassignedItems, mergedItems, effBlock],
  )

  const matchesSearch = useCallback((item: MasterPLUItem, q: string) => {
    const lower = q.toLowerCase()
    return (
      item.system_name.toLowerCase().includes(lower) ||
      (item.display_name?.toLowerCase().includes(lower) ?? false) ||
      item.plu.includes(lower)
    )
  }, [])

  const searchActive = Boolean(deferredSearch.trim())

  const centerItems = useMemo(() => {
    let list: MasterPLUItem[]
    if (searchActive) {
      list = mergedItems.filter((i) => matchesSearch(i, deferredSearch.trim()))
    } else if (selectedKey === UNASSIGNED_KEY) {
      list = unassignedItems
    } else if (selectedKey) {
      list = mergedItems.filter((i) => effBlock(i) === selectedKey)
    } else {
      list = []
    }
    const getName = (i: MasterPLUItem) => (i.display_name ?? i.system_name).toLowerCase()
    return [...list].sort((a, b) => getName(a).localeCompare(getName(b), 'de'))
  }, [mergedItems, searchActive, deferredSearch, selectedKey, unassignedItems, effBlock, matchesSearch])

  const centerItemsHiddenOnMasterCount = useMemo(
    () => centerItems.filter((i) => isItemHiddenOnMasterList(i)).length,
    [centerItems, isItemHiddenOnMasterList],
  )
  const centerItemsVisibleOnMasterCount = centerItems.length - centerItemsHiddenOnMasterCount

  const handleGroupClick = useCallback(
    (key: string) => {
      if (selectedKey === key) {
        setSelectedKey(null)
        if (!bulkSelectActive) setCheckedIds(new Set())
        return
      }
      setSelectedKey(key)
      if (!bulkSelectActive) {
        if (key === UNASSIGNED_KEY) {
          setCheckedIds(new Set(unassignedItems.map((i) => i.id)))
        } else {
          setCheckedIds(new Set(mergedItems.filter((i) => effBlock(i) === key).map((i) => i.id)))
        }
      }
    },
    [selectedKey, bulkSelectActive, unassignedItems, mergedItems, effBlock],
  )

  const toggleItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const applyAssignment = useCallback(
    async (
      item: MasterPLUItem,
      targetBlockId: string | null,
      options?: { record?: boolean },
    ): Promise<WarengruppeRecentLine | null> => {
      const record = options?.record !== false
      const beforeEff = effBlock(item)
      const from = blockLabel(beforeEff)
      const to =
        targetBlockId === null ? blockLabel(item.block_id) : blockLabel(targetBlockId)
      if (beforeEff === targetBlockId) return null

      const custom = customById.get(item.id)
      if (custom) {
        await updateCustomProduct.mutateAsync({ id: custom.id, block_id: targetBlockId })
      } else {
        await assignOverride.mutateAsync({
          systemName: item.system_name,
          masterBlockId: item.block_id,
          targetBlockId,
        })
      }

      if (!record) return null
      return {
        id: randomRecentLineId(),
        beforeEffectiveBlockId: beforeEff,
        itemId: item.id,
        plu: item.plu,
        name: item.display_name ?? item.system_name,
        fromLabel: from,
        toLabel: to,
      }
    },
    [assignOverride, blockLabel, effBlock, customById, updateCustomProduct],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      clearBlockReorderIndicator()
      lastOverIdRef.current = null
      const id = String(event.active.id)
      if (id.startsWith('drag-block-')) {
        const bid = id.replace('drag-block-', '')
        draggingBlockIdRef.current = bid
        const b = sortedBlocks.find((x) => x.id === bid)
        setDraggingBlockLabel(b?.name ?? null)
        setDraggingItem(null)
      } else {
        draggingBlockIdRef.current = null
        const item = mergedItems.find((i) => i.id === id)
        setDraggingItem(item ?? null)
        setDraggingBlockLabel(null)
      }
      const ae = event.activatorEvent
      if (ae && 'clientY' in ae && typeof (ae as PointerEvent).clientY === 'number') {
        pointerYRef.current = (ae as PointerEvent).clientY
      }
    },
    [mergedItems, sortedBlocks, clearBlockReorderIndicator],
  )

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const activeId = String(event.active.id)
      if (!activeId.startsWith('drag-block-')) {
        clearBlockReorderIndicator()
        return
      }
      const draggingBlockId = activeId.replace('drag-block-', '')
      applyPointerBlockReorderIndicator(draggingBlockId, pointerYRef.current)
    },
    [clearBlockReorderIndicator, applyPointerBlockReorderIndicator],
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const o = event.over
      if (o) lastOverIdRef.current = String(o.id)
      const activeId = String(event.active.id)
      if (!activeId.startsWith('drag-block-')) return
      const draggingBlockId = activeId.replace('drag-block-', '')
      applyPointerBlockReorderIndicator(draggingBlockId, pointerYRef.current)
    },
    [applyPointerBlockReorderIndicator],
  )

  const handleDragCancel = useCallback(() => {
    setDraggingItem(null)
    setDraggingBlockLabel(null)
    draggingBlockIdRef.current = null
    clearBlockReorderIndicator()
    lastOverIdRef.current = null
  }, [clearBlockReorderIndicator])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      const indicatorSnapshot = itemDropIndicatorRef.current
      const lastOverSnapshot = lastOverIdRef.current
      setDraggingItem(null)
      setDraggingBlockLabel(null)
      draggingBlockIdRef.current = null
      clearBlockReorderIndicator()
      lastOverIdRef.current = null

      const activeId = String(active.id)
      let overId: string | null = over ? String(over.id) : null
      if (!overId) overId = lastOverSnapshot

      // ——— Warengruppe verschieben (nur Admin) ———
      if (activeId.startsWith('drag-block-')) {
        if (!canReorderBlocks) return
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
        }

        if (!targetDropId) {
          toast.message('Kein Ziel erkannt – bitte zwischen zwei Warengruppen loslassen.')
          return
        }

        const newIds = computeBlockOrderAfterDrop(sortedBlocks, fromBlockId, targetDropId, edge)
        if (!newIds) return

        try {
          await reorderStoreMutation.mutateAsync(newIds)
          toast.success('Warengruppe verschoben')
        } catch {
          toast.error('Fehler beim Verschieben')
        }
        return
      }

      // ——— Produkt zuordnen ———
      if (!overId?.startsWith('drop-block-')) return

      const raw = overId.replace('drop-block-', '')
      const targetBlockId = raw === 'unassigned' ? null : raw

      const idsToMove =
        checkedIds.size > 0 && checkedIds.has(activeId) ? [...checkedIds] : [activeId]

      const lines: WarengruppeRecentLine[] = []
      try {
        for (const uid of idsToMove) {
          const row = mergedItems.find((i) => i.id === uid)
          if (!row) continue
          const line = await applyAssignment(row, targetBlockId)
          if (line) lines.push(line)
        }
        if (lines.length === 0) return
        pushRecentBatchLines(lines)
        toast.success(lines.length === 1 ? 'Produkt verschoben' : `${lines.length} Artikel verschoben`)
      } catch {
        toast.error('Fehler beim Verschieben')
      }
    },
    [
      canReorderBlocks,
      sortedBlocks,
      reorderStoreMutation,
      mergedItems,
      checkedIds,
      applyAssignment,
      pushRecentBatchLines,
      clearBlockReorderIndicator,
    ],
  )

  const handlePickAssignTarget = useCallback(
    async (targetBlockId: string | null) => {
      const toAssign: MasterPLUItem[] =
        bulkSelectActive && checkedIds.size > 0
          ? [...checkedIds]
              .map((id) => mergedItems.find((i) => i.id === id))
              .filter((x): x is MasterPLUItem => x != null)
          : assignPickerItem
            ? [assignPickerItem]
            : []

      if (toAssign.length === 0) return

      try {
        const lines: WarengruppeRecentLine[] = []
        for (const item of toAssign) {
          if (effBlock(item) === targetBlockId) continue
          const line = await applyAssignment(item, targetBlockId)
          if (line) lines.push(line)
        }
        if (lines.length === 0) {
          setAssignPickerItem(null)
          return
        }
        pushRecentBatchLines(lines)
        toast.success(
          lines.length === 1 ? 'Zuordnung aktualisiert' : `${lines.length} Artikel zugewiesen`,
        )
        setAssignPickerItem(null)
      } catch {
        toast.error('Fehler beim Zuweisen')
      }
    },
    [
      assignPickerItem,
      bulkSelectActive,
      checkedIds,
      mergedItems,
      effBlock,
      applyAssignment,
      pushRecentBatchLines,
    ],
  )

  const handleBulkAssignToSelectedGroup = async () => {
    if (checkedIds.size === 0) return
    if (!selectedKey || selectedKey === UNASSIGNED_KEY) {
      toast.error('Bitte eine Warengruppe als Ziel wählen (nicht „Ohne Zuordnung“).')
      return
    }
    const targetId = selectedKey
    try {
      const lines: WarengruppeRecentLine[] = []
      for (const id of checkedIds) {
        const item = mergedItems.find((i) => i.id === id)
        if (!item) continue
        const line = await applyAssignment(item, targetId)
        if (line) lines.push(line)
      }
      if (lines.length > 0) pushRecentBatchLines(lines)
      toast.success(`${checkedIds.size} Artikel zugewiesen`)
      setCheckedIds(new Set())
    } catch {
      toast.error('Fehler beim Zuweisen')
    }
  }

  const handleBulkMoveToOhne = async () => {
    if (checkedIds.size === 0) return
    try {
      const lines: WarengruppeRecentLine[] = []
      for (const id of checkedIds) {
        const item = mergedItems.find((i) => i.id === id)
        if (!item) continue
        const line = await applyAssignment(item, null)
        if (line) lines.push(line)
      }
      if (lines.length > 0) pushRecentBatchLines(lines)
      toast.success(`${checkedIds.size} Artikel zu „Ohne Zuordnung“ verschoben`)
      setCheckedIds(new Set())
    } catch {
      toast.error('Fehler beim Verschieben')
    }
  }

  const handleRemoveOverrideForItem = async (item: MasterPLUItem) => {
    try {
      const line = await applyAssignment(item, null)
      if (line) pushRecentBatchLines([line])
      toast.success('Markt-Override entfernt')
    } catch {
      toast.error('Fehler beim Entfernen')
    }
  }

  const handleRevertRecentLine = useCallback(
    async (line: WarengruppeRecentLine) => {
      const item = mergedItems.find((i) => i.id === line.itemId)
      if (!item) return
      try {
        await applyAssignment(item, line.beforeEffectiveBlockId, { record: false })
        setRecentBatches((prev) => removeLineFromBatchesByLineId(prev, line.id))
      } catch {
        toast.error('Fehler beim Zurücknehmen')
      }
    },
    [mergedItems, applyAssignment],
  )

  const handleRevertRecentBatch = useCallback(
    async (batchId: string) => {
      const batch = recentBatches.find((b) => b.id === batchId)
      if (!batch) return
      try {
        for (const line of batch.lines) {
          const item = mergedItems.find((i) => i.id === line.itemId)
          if (!item) continue
          await applyAssignment(item, line.beforeEffectiveBlockId, { record: false })
        }
        setRecentBatches((prev) => removeBatchById(prev, batchId))
      } catch {
        toast.error('Fehler beim Zurücknehmen')
      }
    },
    [recentBatches, mergedItems, applyAssignment],
  )

  const handleCreateBlock = async () => {
    if (!blockName.trim()) return
    try {
      const created = await createBlock.mutateAsync({
        name: blockName.trim(),
        order_index: blocks.length,
      })
      setSelectedKey(created.id)
      setBlockName('')
      setShowAddBlock(false)
      toast.success('Warengruppe erstellt')
    } catch {
      toast.error('Fehler beim Erstellen')
    }
  }

  const handleRenameBlock = async () => {
    if (!selectedKey || selectedKey === UNASSIGNED_KEY || !blockName.trim()) return
    try {
      await updateBlock.mutateAsync({ id: selectedKey, name: blockName.trim() })
      setBlockName('')
      setShowRenameBlock(false)
      toast.success('Warengruppe umbenannt')
    } catch {
      toast.error('Fehler beim Umbenennen')
    }
  }

  const handleDeleteBlockConfirm = async () => {
    if (!selectedKey || selectedKey === UNASSIGNED_KEY) return
    try {
      await deleteBlock.mutateAsync(selectedKey)
      setSelectedKey(null)
      setCheckedIds(new Set())
      setShowDeleteBlockConfirm(false)
      toast.success('Warengruppe gelöscht')
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const unassignedCount = blockItemCounts.get(null) ?? 0
  const firstProductHandleId = centerItems[0]?.id ?? null

  useEffect(() => {
    if (!draggingItem && !draggingBlockLabel) return
    const onMove = (e: PointerEvent) => {
      pointerYRef.current = e.clientY
      const bid = draggingBlockIdRef.current
      if (bid) {
        applyPointerBlockReorderIndicator(bid, e.clientY)
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [draggingItem, draggingBlockLabel, applyPointerBlockReorderIndicator])

  useEffect(() => {
    return () => {
      if (blockReorderRafRef.current != null) {
        cancelAnimationFrame(blockReorderRafRef.current)
      }
    }
  }, [])

  const reorderInsertInd =
    canReorderBlocks && draggingBlockLabel ? blockReorderIndicatorUi : null
  const firstBlockId = sortedBlocks[0]?.id
  const lastBlockId = sortedBlocks[sortedBlocks.length - 1]?.id

  const mobileSearchJumpLabel =
    searchActive && centerItems.length > 0
      ? `${centerItems.length} Suchtreffer anzeigen`
      : searchActive
        ? 'Keine Treffer'
        : ''

  const assignPickerBulkCount =
    bulkSelectActive && checkedIds.size > 0 ? checkedIds.size : 1

  const assignPickerUniformEff = useMemo(() => {
    if (!bulkSelectActive || checkedIds.size === 0) {
      return assignPickerItem ? effBlock(assignPickerItem) : undefined
    }
    const sel = [...checkedIds]
      .map((id) => mergedItems.find((i) => i.id === id))
      .filter((x): x is MasterPLUItem => x != null)
    if (sel.length === 0) return undefined
    const first = effBlock(sel[0])
    return sel.every((i) => effBlock(i) === first) ? first : ('mixed' as const)
  }, [bulkSelectActive, checkedIds, assignPickerItem, mergedItems, effBlock])

  return (
    <>
      {isWorkbenchDesktop ? (
      <DndContext
        sensors={sensors}
        collisionDetection={obstWarengruppenCollision}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex flex-col gap-4"
          data-testid="obst-warengruppen-panel-root"
          data-tour="obst-konfig-warengruppen-panel"
        >
          <div className="relative w-full max-w-2xl min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="Über alle Gruppen suchen…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 pr-10 h-11"
              aria-label="Globale Suche"
              data-tour="obst-konfig-warengruppen-products-search"
            />
            {globalSearch ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => setGlobalSearch('')}
                aria-label="Suche leeren"
              >
                <span className="text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            ) : null}
          </div>

          <Card className="min-w-0 overflow-hidden shadow-sm">
            <CardContent className="flex max-h-[min(72vh,720px)] min-h-[280px] flex-col p-0">
              <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:divide-x lg:divide-y-0 xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_minmax(220px,280px)]">
                <div
                  className="flex min-h-0 min-w-0 flex-col p-4 order-1 lg:max-xl:max-h-[min(40vh,360px)] xl:max-h-none"
                  data-tour="obst-konfig-warengruppen-groups-card"
                >
                  <div className="mb-3 flex shrink-0 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Warengruppen</h3>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0"
                          onClick={() => {
                            setBlockName('')
                            setShowAddBlock(true)
                          }}
                          data-tour="obst-konfig-warengruppen-group-add-button"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Neu
                        </Button>
                      ) : null}
                    </div>
                    {canReorderBlocks && isWorkbenchDesktop ? (
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Reihenfolge: waagerechten Griff ziehen – die <span className="text-primary">blaue Linie</span>{' '}
                        zeigt, wo die Gruppe nach dem Loslassen steht.
                      </p>
                    ) : null}
                    {canReorderBlocks && !isWorkbenchDesktop ? (
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Reihenfolge der Warengruppen am PC oder breiten Fenster (waagerechter Griff links).
                      </p>
                    ) : null}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-tour="obst-konfig-warengruppen-group-list">
                    <div className="space-y-1">
                      <ObstDroppableUnassignedRow
                        count={unassignedCount}
                        isSelected={selectedKey === UNASSIGNED_KEY}
                        isDropTarget={draggingItem !== null}
                        suppressReorderHover={Boolean(draggingBlockLabel)}
                        onClick={() => handleGroupClick(UNASSIGNED_KEY)}
                      />
                      {gapLineAfterUnassignedBeforeFirstBlock(reorderInsertInd, firstBlockId) ? (
                        <ObstBlockReorderInsertionLine />
                      ) : null}
                      {sortedBlocks.map((block, idx) => (
                        <Fragment key={block.id}>
                          {idx > 0 &&
                          gapLineBetweenBlocks(
                            reorderInsertInd,
                            sortedBlocks[idx - 1]!.id,
                            block.id,
                          ) ? (
                            <ObstBlockReorderInsertionLine />
                          ) : null}
                          <ObstDroppableBlockRow
                            block={block}
                            count={blockItemCounts.get(block.id) ?? 0}
                            isSelected={selectedKey === block.id}
                            isDropTarget={draggingItem !== null}
                            suppressReorderHover={Boolean(draggingBlockLabel)}
                            showReorderHandle={canReorderBlocks && isWorkbenchDesktop}
                            onClick={() => handleGroupClick(block.id)}
                            handleDataTour={
                              idx === 0 && canReorderBlocks && isWorkbenchDesktop
                                ? 'obst-konfig-warengruppen-first-block-handle'
                                : undefined
                            }
                          />
                        </Fragment>
                      ))}
                      {gapLineAfterLastBlock(reorderInsertInd, lastBlockId) ? <ObstBlockReorderInsertionLine /> : null}
                    </div>
                  </div>
                  {selectedBlock && isAdmin ? (
                    <div className="mt-3 flex shrink-0 justify-center gap-2 border-t border-border pt-3">
                      <Button
                        type="button"
                        size="icon-lg"
                        variant="outline"
                        className="min-h-11 min-w-11 shrink-0 rounded-lg"
                        onClick={() => {
                          setBlockName(selectedBlock.name)
                          setShowRenameBlock(true)
                        }}
                        aria-label="Warengruppe umbenennen"
                        title="Umbenennen"
                        data-tour="obst-konfig-warengruppen-group-rename-button"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-lg"
                        variant="outline"
                        className="min-h-11 min-w-11 shrink-0 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => setShowDeleteBlockConfirm(true)}
                        aria-label="Warengruppe löschen"
                        title="Löschen"
                        data-tour="obst-konfig-warengruppen-group-delete-button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div
                  className="flex min-h-0 min-w-0 flex-col p-4 order-2 lg:max-xl:max-h-[min(40vh,360px)] xl:max-h-none"
                  data-tour="obst-konfig-warengruppen-products-card"
                >
                  <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        {searchActive
                          ? 'Suchtreffer'
                          : selectedKey === UNASSIGNED_KEY
                            ? 'Ohne Zuordnung'
                            : selectedBlock
                              ? selectedBlock.name
                              : 'Artikel'}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {searchActive
                          ? `${centerItems.length} Treffer über alle Gruppen`
                          : selectedKey
                            ? centerItemsHiddenOnMasterCount > 0
                              ? `${centerItemsVisibleOnMasterCount} in Hauptliste sichtbar · ${centerItemsHiddenOnMasterCount} ausgeblendet · antippen für Gruppenwahl, ziehen oder Mehrfachauswahl`
                              : `${centerItems.length} Artikel · antippen für Gruppenwahl, ziehen oder Mehrfachauswahl`
                            : 'Links eine Warengruppe wählen oder oben suchen.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant={bulkSelectActive ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 min-h-[44px] shrink-0"
                        onClick={() => {
                          setBulkSelectActive((v) => !v)
                          if (bulkSelectActive) setCheckedIds(new Set())
                        }}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Mehrfachauswahl
                      </Button>
                      {bulkSelectActive && centerItems.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 shrink-0"
                          onClick={() => setCheckedIds(new Set(centerItems.map((i) => i.id)))}
                        >
                          Alle auswählen
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {centerItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        {searchActive
                          ? 'Keine Treffer für die aktuelle Suche.'
                          : selectedKey === UNASSIGNED_KEY
                            ? 'Alle Artikel sind einer Warengruppe zugeordnet.'
                            : 'Keine Artikel in dieser Gruppe.'}
                      </div>
                    ) : (
                      <div
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
                        data-tour="obst-konfig-warengruppen-products-list"
                      >
                        {centerItems.map((item) => {
                          const effBid = effBlock(item)
                          const effGroupLabel = effBid == null ? null : blockLabel(effBid)
                          /** Nur wenn die Master-Liste eine konkrete Gruppe hat und der Markt davon abweicht (nicht: Master „ohne“ + Markt-Zuordnung). */
                          const showListGroupHint =
                            item.block_id != null && item.block_id !== effBid
                          const listGroupLabel = showListGroupHint ? blockLabel(item.block_id) : undefined
                          return (
                            <ObstWorkbenchProductCard
                              key={item.id}
                              item={item}
                              isCustom={customById.has(item.id)}
                              bulkSelectActive={bulkSelectActive}
                              isChecked={checkedIds.has(item.id)}
                              onToggle={() => toggleItem(item.id)}
                              effectiveGroupLabel={effGroupLabel}
                              showOhneBadge={effBid == null}
                              listGroupLabel={listGroupLabel}
                              hiddenOnMasterList={isItemHiddenOnMasterList(item)}
                              onOpenAssignPicker={() => setAssignPickerItem(item)}
                              handleDataTour={
                                item.id === firstProductHandleId
                                  ? 'obst-konfig-warengruppen-products-first-handle'
                                  : undefined
                              }
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-3 flex min-h-0 min-w-0 flex-col border-t border-border p-4 lg:col-span-2 lg:max-xl:max-h-[min(36vh,320px)] xl:col-span-1 xl:max-h-none xl:border-l xl:border-t-0">
                  <h3 className="mb-3 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Status
                  </h3>
                  <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-left transition-colors hover:bg-amber-50"
                      onClick={() => handleGroupClick(UNASSIGNED_KEY)}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
                        Ohne Zuordnung
                      </p>
                      <p className="text-2xl font-semibold tabular-nums text-amber-950">{unassignedCount}</p>
                    </button>
                    <div className="min-h-[44px] rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Markt-Overrides
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">{overrideCount}</p>
                    </div>
                    <div className="min-h-[44px] rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Artikel gesamt
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">{mergedItems.length}</p>
                    </div>
                  </div>
                  <Separator className="my-3 shrink-0" />
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Zuletzt geändert
                    </p>
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      <WarengruppenRecentBatchesList
                        batches={recentBatches}
                        emptyLabel="Noch keine Änderungen in dieser Sitzung."
                        disabled={assignOverride.isPending || updateCustomProduct.isPending}
                        onRevertLine={(line) => void handleRevertRecentLine(line)}
                        onRevertBatch={(id) => void handleRevertRecentBatch(id)}
                        lineExtra={(line) => {
                          const row = mergedItems.find((i) => i.id === line.itemId)
                          if (!row || !hasMarktOverride(row)) return null
                          return (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => void handleRemoveOverrideForItem(row)}
                              disabled={assignOverride.isPending}
                            >
                              <Undo2 className="mr-1 inline h-3 w-3" />
                              Override entfernen
                            </Button>
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="shrink-0" />
              <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/15 p-4 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  className="h-11 min-h-[44px] flex-1 sm:min-w-[200px]"
                  disabled={
                    checkedIds.size === 0 ||
                    !selectedKey ||
                    selectedKey === UNASSIGNED_KEY ||
                    assignOverride.isPending
                  }
                  onClick={handleBulkAssignToSelectedGroup}
                  data-tour="obst-konfig-warengruppen-products-assign-button"
                >
                  {assignOverride.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Auswahl → ${selectedBlock?.name ?? '…'} zuweisen`
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 min-h-[44px] flex-1 sm:min-w-[200px]"
                  disabled={checkedIds.size === 0 || assignOverride.isPending}
                  onClick={handleBulkMoveToOhne}
                >
                  Zu „Ohne Zuordnung“ verschieben
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 min-h-[44px] sm:w-auto"
                  onClick={() => setCheckedIds(new Set())}
                  data-tour="obst-konfig-warengruppen-products-deselect-button"
                >
                  Alles abwählen
                </Button>
              </div>
            </CardContent>
          </Card>

          <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
            {draggingItem ? (
              <div className="pointer-events-none flex max-w-[min(88vw,280px)] cursor-grabbing select-none items-start gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-2xl ring-1 ring-black/5">
                <StatusBadge plu={draggingItem.plu} status={draggingItem.status} oldPlu={draggingItem.old_plu} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{getDisplayPlu(draggingItem.plu)}</p>
                  <p className="line-clamp-2 text-left text-xs font-semibold leading-snug">
                    {draggingItem.display_name ?? draggingItem.system_name}
                  </p>
                  {checkedIds.size > 1 && checkedIds.has(draggingItem.id) ? (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {checkedIds.size} Artikel
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : draggingBlockLabel ? (
              <div className="pointer-events-none flex min-w-[10rem] items-center gap-2 rounded-lg border-2 border-primary bg-background px-3 py-2 shadow-xl">
                <GripHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {draggingBlockLabel}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="obst-warengruppen-panel-root"
          data-tour="obst-konfig-warengruppen-panel"
        >
          <div className="relative min-w-0 w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="Über alle Gruppen suchen…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="h-11 pl-9 pr-10"
              aria-label="Globale Suche"
              data-tour="obst-konfig-warengruppen-products-search"
            />
            {globalSearch ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                onClick={() => setGlobalSearch('')}
                aria-label="Suche leeren"
              >
                <span className="text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            ) : null}
          </div>

          {mobileWorkbenchStep === 'groups' ? (
            <div className="flex min-w-0 flex-col gap-4">
              {searchActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full shrink-0"
                  disabled={centerItems.length === 0}
                  onClick={() => setMobileWorkbenchStep('products')}
                >
                  {mobileSearchJumpLabel}
                </Button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-[44px] min-w-[6.5rem] flex-1 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-left transition-colors hover:bg-amber-50"
                  onClick={() => openMobileWorkbenchGroup(UNASSIGNED_KEY)}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">Ohne Zuordnung</p>
                  <p className="text-xl font-semibold tabular-nums text-amber-950">{unassignedCount}</p>
                </button>
                <div className="min-h-[44px] min-w-[6.5rem] flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markt-Overrides</p>
                  <p className="text-xl font-semibold tabular-nums">{overrideCount}</p>
                </div>
                <div className="min-h-[44px] min-w-[6.5rem] flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Artikel gesamt</p>
                  <p className="text-xl font-semibold tabular-nums">{mergedItems.length}</p>
                </div>
              </div>

              <Card className="min-w-0 overflow-hidden shadow-sm" data-tour="obst-konfig-warengruppen-groups-card">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Warengruppen</h3>
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0"
                          onClick={() => {
                            setBlockName('')
                            setShowAddBlock(true)
                          }}
                          data-tour="obst-konfig-warengruppen-group-add-button"
                        >
                          <Plus className="mr-1 h-3 w-3" /> Neu
                        </Button>
                      ) : null}
                    </div>
                    {canReorderBlocks && !isWorkbenchDesktop ? (
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Reihenfolge der Warengruppen am PC oder breiten Fenster (waagerechter Griff links).
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="max-h-[min(52vh,480px)] min-w-0 space-y-2 overflow-y-auto pr-1"
                    data-tour="obst-konfig-warengruppen-group-list"
                  >
                    <button
                      type="button"
                      onClick={() => openMobileWorkbenchGroup(UNASSIGNED_KEY)}
                      className={cn(
                        'flex min-h-[48px] w-full flex-col gap-1 rounded-lg border border-dashed px-3 py-3 text-left text-sm transition-colors',
                        selectedKey === UNASSIGNED_KEY
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/20 hover:bg-muted/40',
                      )}
                    >
                      <span className="min-w-0 break-words font-medium leading-snug">Ohne Zuordnung</span>
                      <span
                        className={cn(
                          'self-end text-xs tabular-nums',
                          selectedKey === UNASSIGNED_KEY ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        )}
                      >
                        ({unassignedCount})
                      </span>
                    </button>
                    {sortedBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          'flex min-h-[48px] items-stretch gap-1 overflow-hidden rounded-lg border text-sm transition-colors',
                          selectedKey === block.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-muted/15 hover:bg-muted/30',
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2 text-left"
                          onClick={() => openMobileWorkbenchGroup(block.id)}
                        >
                          <span className="min-w-0 break-words font-medium leading-snug">{block.name}</span>
                          <span
                            className={cn(
                              'self-end text-xs tabular-nums',
                              selectedKey === block.id ? 'text-primary-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            ({blockItemCounts.get(block.id) ?? 0})
                          </span>
                        </button>
                        {isAdmin ? (
                          <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-border/60 py-1 pl-1 pr-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={cn(
                                'h-11 w-11 shrink-0 rounded-md',
                                selectedKey === block.id ? 'text-primary-foreground hover:bg-primary-foreground/15' : '',
                              )}
                              aria-label="Warengruppe umbenennen"
                              title="Umbenennen"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedKey(block.id)
                                setBlockName(block.name)
                                setShowRenameBlock(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={cn(
                                'h-11 w-11 shrink-0 rounded-md text-destructive hover:text-destructive',
                                selectedKey === block.id ? 'text-primary-foreground hover:bg-primary-foreground/15' : '',
                              )}
                              aria-label="Warengruppe löschen"
                              title="Löschen"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedKey(block.id)
                                setShowDeleteBlockConfirm(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-col gap-3" data-tour="obst-konfig-warengruppen-products-card">
              <div className="flex shrink-0 flex-wrap items-start gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="Zurück zur Warengruppen-Übersicht"
                  onClick={() => setMobileWorkbenchStep('groups')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">
                    {searchActive
                      ? 'Suchtreffer'
                      : selectedKey === UNASSIGNED_KEY
                        ? 'Ohne Zuordnung'
                        : selectedBlock
                          ? selectedBlock.name
                          : 'Artikel'}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {searchActive
                      ? `${centerItems.length} Treffer über alle Gruppen`
                      : selectedKey
                        ? centerItemsHiddenOnMasterCount > 0
                          ? `${centerItemsVisibleOnMasterCount} in Hauptliste sichtbar · ${centerItemsHiddenOnMasterCount} ausgeblendet · antippen für Gruppenwahl oder Mehrfachauswahl`
                          : `${centerItems.length} Artikel · antippen für Gruppenwahl oder Mehrfachauswahl`
                        : 'Oben eine Warengruppe wählen oder suchen.'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant={bulkSelectActive ? 'default' : 'outline'}
                    size="sm"
                    className="h-10 min-h-[44px] shrink-0"
                    onClick={() => {
                      setBulkSelectActive((v) => !v)
                      if (bulkSelectActive) setCheckedIds(new Set())
                    }}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Mehrfachauswahl
                  </Button>
                  {bulkSelectActive && centerItems.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 shrink-0"
                      onClick={() => setCheckedIds(new Set(centerItems.map((i) => i.id)))}
                    >
                      Alle auswählen
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
                {centerItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    {searchActive
                      ? 'Keine Treffer für die aktuelle Suche.'
                      : selectedKey === UNASSIGNED_KEY
                        ? 'Alle Artikel sind einer Warengruppe zugeordnet.'
                        : 'Keine Artikel in dieser Gruppe.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3" data-tour="obst-konfig-warengruppen-products-list">
                    {centerItems.map((item) => {
                      const effBid = effBlock(item)
                      const effGroupLabel = effBid == null ? null : blockLabel(effBid)
                      const showListGroupHint = item.block_id != null && item.block_id !== effBid
                      const listGroupLabel = showListGroupHint ? blockLabel(item.block_id) : undefined
                      return (
                        <ObstWorkbenchProductCard
                          key={item.id}
                          item={item}
                          isCustom={customById.has(item.id)}
                          bulkSelectActive={bulkSelectActive}
                          isChecked={checkedIds.has(item.id)}
                          onToggle={() => toggleItem(item.id)}
                          effectiveGroupLabel={effGroupLabel}
                          showOhneBadge={effBid == null}
                          listGroupLabel={listGroupLabel}
                          hiddenOnMasterList={isItemHiddenOnMasterList(item)}
                          onOpenAssignPicker={() => setAssignPickerItem(item)}
                          dragDisabled
                          handleDataTour={
                            item.id === firstProductHandleId
                              ? 'obst-konfig-warengruppen-products-first-handle'
                              : undefined
                          }
                        />
                      )
                    })}
                  </div>
                )}

                <details className="mt-4 rounded-lg border border-border bg-muted/10 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Zuletzt geändert
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto pr-1">
                    <WarengruppenRecentBatchesList
                      batches={recentBatches}
                      emptyLabel="Noch keine Änderungen in dieser Sitzung."
                      disabled={assignOverride.isPending || updateCustomProduct.isPending}
                      onRevertLine={(line) => void handleRevertRecentLine(line)}
                      onRevertBatch={(id) => void handleRevertRecentBatch(id)}
                      lineExtra={(line) => {
                        const row = mergedItems.find((i) => i.id === line.itemId)
                        if (!row || !hasMarktOverride(row)) return null
                        return (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => void handleRemoveOverrideForItem(row)}
                            disabled={assignOverride.isPending}
                          >
                            <Undo2 className="mr-1 inline h-3 w-3" />
                            Override entfernen
                          </Button>
                        )
                      }}
                    />
                  </div>
                </details>
              </div>

              <div className="shrink-0 space-y-2 border-t border-border bg-background pt-3">
                <Button
                  size="sm"
                  className="h-11 min-h-[44px] w-full"
                  disabled={
                    checkedIds.size === 0 ||
                    !selectedKey ||
                    selectedKey === UNASSIGNED_KEY ||
                    assignOverride.isPending
                  }
                  onClick={handleBulkAssignToSelectedGroup}
                  data-tour="obst-konfig-warengruppen-products-assign-button"
                >
                  {assignOverride.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Auswahl → ${selectedBlock?.name ?? '…'} zuweisen`
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 min-h-[44px] w-full"
                  disabled={checkedIds.size === 0 || assignOverride.isPending}
                  onClick={handleBulkMoveToOhne}
                >
                  Zu „Ohne Zuordnung“ verschieben
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 min-h-[44px] w-full"
                  onClick={() => setCheckedIds(new Set())}
                  data-tour="obst-konfig-warengruppen-products-deselect-button"
                >
                  Alles abwählen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent data-tour="obst-konfig-warengruppen-create-dialog">
          <DialogHeader>
            <DialogTitle>Neue Warengruppe</DialogTitle>
            <DialogDescription>Geben Sie einen Namen für die neue Warengruppe ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              placeholder='z. B. „Äpfel"'
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateBlock}
              disabled={createBlock.isPending || !blockName.trim()}
              data-tour="obst-konfig-warengruppen-create-dialog-submit"
            >
              {createBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameBlock} onOpenChange={setShowRenameBlock}>
        <DialogContent data-tour="obst-konfig-warengruppen-rename-dialog">
          <DialogHeader>
            <DialogTitle>Warengruppe umbenennen</DialogTitle>
            <DialogDescription>Ändern Sie den Namen der ausgewählten Warengruppe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Neuer Name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={handleRenameBlock}
              disabled={updateBlock.isPending || !blockName.trim()}
              data-tour="obst-konfig-warengruppen-rename-dialog-submit"
            >
              {updateBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteBlockConfirm} onOpenChange={setShowDeleteBlockConfirm}>
        <AlertDialogContent data-tour="obst-konfig-warengruppen-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Warengruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Warengruppe „{selectedBlock?.name}“ wirklich löschen? Die Artikel verlieren nur die
              Zuordnung zu dieser Gruppe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlockConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-tour="obst-konfig-warengruppen-delete-confirm-action"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={assignPickerItem != null}
        onOpenChange={(open) => {
          if (!open) setAssignPickerItem(null)
        }}
      >
        <DialogContent
          className="flex h-[min(92dvh,720px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[min(85vh,640px)] sm:max-w-md"
          data-tour="obst-konfig-warengruppen-pick-card"
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-4 pr-14 text-left">
            <DialogTitle>
              {assignPickerBulkCount > 1 ? `${assignPickerBulkCount} Artikel zuordnen` : 'Warengruppe wählen'}
            </DialogTitle>
            <DialogDescription>
              {assignPickerBulkCount > 1
                ? 'Alle ausgewählten Artikel werden der gewählten Gruppe zugeordnet (wie per Ziehen).'
                : 'Wähle eine Gruppe – der Artikel wird dem Markt so zugeordnet (wie per Ziehen).'}
            </DialogDescription>
            {assignPickerBulkCount > 1 ? (
              <div className="space-y-1 border-t border-border pt-3">
                <p className="text-sm font-medium">{assignPickerBulkCount} Artikel ausgewählt</p>
                {assignPickerUniformEff === 'mixed' ? (
                  <p className="text-xs text-muted-foreground">
                    Unterschiedliche aktuelle Zuordnung – keine „aktuell“-Markierung.
                  </p>
                ) : null}
              </div>
            ) : assignPickerItem ? (
              <div className="space-y-1 border-t border-border pt-3">
                <p className="font-mono text-xs tabular-nums">{getDisplayPlu(assignPickerItem.plu)}</p>
                <p className="line-clamp-3 text-sm font-medium leading-snug">
                  {assignPickerItem.display_name ?? assignPickerItem.system_name}
                </p>
              </div>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-3 text-left font-normal"
                disabled={assignOverride.isPending || updateCustomProduct.isPending}
                onClick={() => handlePickAssignTarget(null)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 font-medium">Ohne Zuordnung</span>
                  {assignPickerUniformEff !== 'mixed' && assignPickerUniformEff === null ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      aktuell
                    </Badge>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{unassignedCount}</span>
              </Button>
              {sortedBlocks.map((b) => {
                const isCurrent =
                  assignPickerUniformEff !== 'mixed' && assignPickerUniformEff === b.id
                const n = blockItemCounts.get(b.id) ?? 0
                return (
                  <Button
                    key={b.id}
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-3 text-left font-normal"
                    disabled={assignOverride.isPending || updateCustomProduct.isPending}
                    onClick={() => handlePickAssignTarget(b.id)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 break-words font-medium">{b.name}</span>
                      {isCurrent ? (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          aktuell
                        </Badge>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{n}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ObstDroppableUnassignedRow({
  count,
  isSelected,
  isDropTarget,
  suppressReorderHover,
  onClick,
}: {
  count: number
  isSelected: boolean
  isDropTarget: boolean
  /** Bei Warengruppen-Reihenfolge ziehen: kein blauer Hover – nur Einfüge-Linie. */
  suppressReorderHover?: boolean
  onClick: () => void
}) {
  const dropId = 'drop-block-unassigned'
  const { isOver, setNodeRef } = useDroppable({ id: dropId })
  return (
    <div
      ref={setNodeRef}
      data-obst-warengruppe-block-drop={dropId}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex min-h-[48px] cursor-pointer flex-col gap-1 rounded-lg border border-dashed px-3 py-3 text-sm transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : isOver && !suppressReorderHover
            ? 'bg-primary/15 ring-2 ring-primary/40 border-primary/40'
            : isDropTarget
              ? 'bg-muted/50 border-primary/30'
              : 'border-border bg-muted/20 hover:bg-muted/40',
      )}
    >
      <span className="min-w-0 break-words font-medium leading-snug">Ohne Zuordnung</span>
      <span
        className={cn(
          'self-end text-xs tabular-nums',
          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        ({count})
      </span>
    </div>
  )
}

function ObstDroppableBlockRow({
  block,
  count,
  isSelected,
  isDropTarget,
  suppressReorderHover,
  showReorderHandle,
  onClick,
  handleDataTour,
}: {
  block: Block
  count: number
  isSelected: boolean
  isDropTarget: boolean
  /** Bei Warengruppen-Reihenfolge ziehen: kein blauer Hover – nur Einfüge-Linie. */
  suppressReorderHover?: boolean
  showReorderHandle: boolean
  onClick: () => void
  handleDataTour?: string
}) {
  const dropId = `drop-block-${block.id}`
  const dragId = `drag-block-${block.id}`
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: dropId })
  const draggable = useDraggable({
    id: dragId,
    disabled: !showReorderHandle,
  })

  return (
    <div
      ref={setDropRef}
      data-obst-warengruppe-block-drop={dropId}
      className={cn(
        'flex min-h-[48px] flex-row items-stretch gap-1 rounded-lg border border-transparent px-1 py-1 text-sm transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : isOver && !suppressReorderHover
            ? 'bg-primary/15 ring-2 ring-primary/40'
            : isDropTarget
              ? 'bg-muted/50 border-dashed border-primary/30'
              : 'hover:bg-muted',
      )}
    >
      {showReorderHandle ? (
        <button
          type="button"
          ref={draggable.setNodeRef}
          className={cn(
            'mt-1 flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-md touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing',
            isSelected && 'text-primary-foreground',
          )}
          aria-label="Warengruppen-Reihenfolge ändern"
          title="Warengruppen-Reihenfolge ändern"
          {...(handleDataTour ? { 'data-tour': handleDataTour } : {})}
          {...draggable.attributes}
          {...draggable.listeners}
        >
          <GripHorizontal className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-1 rounded-md px-2 py-2"
      >
        <span className="min-w-0 break-words font-medium leading-snug">{block.name}</span>
        <span
          className={cn(
            'self-end text-xs tabular-nums',
            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          ({count})
        </span>
      </div>
    </div>
  )
}

function ObstWorkbenchProductCard({
  item,
  isCustom,
  bulkSelectActive,
  isChecked,
  onToggle,
  effectiveGroupLabel,
  showOhneBadge,
  listGroupLabel,
  hiddenOnMasterList = false,
  onOpenAssignPicker,
  handleDataTour,
  dragDisabled = false,
}: {
  item: MasterPLUItem
  isCustom: boolean
  bulkSelectActive: boolean
  isChecked: boolean
  onToggle: () => void
  /** Effektive Warengruppe am Markt (nach Override); null = „Ohne Zuordnung“. */
  effectiveGroupLabel: string | null
  showOhneBadge: boolean
  /** Nur wenn Master-`block_id` gesetzt ist und vom Markt abweicht (z. B. Override auf andere Gruppe). */
  listGroupLabel?: string
  /** Wie Masterliste/PDF: in hidden_items und nicht durch zentrale Werbung freigegeben. */
  hiddenOnMasterList?: boolean
  onOpenAssignPicker?: () => void
  handleDataTour?: string
  /** Schmale Workbench: kein Ziehen zum Zuordnen */
  dragDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: dragDisabled })
  const tapToPickGroup = Boolean(onOpenAssignPicker)
  const display = getDisplayNameForItem(item.display_name, item.system_name, isCustom)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex min-h-0 flex-col rounded-xl border border-border bg-muted/10 p-2.5 shadow-sm',
        dragDisabled ? 'pb-3' : 'pb-12',
        isDragging ? 'opacity-40' : '',
        isChecked ? 'border-primary/40 ring-2 ring-primary/25' : '',
      )}
      {...(dragDisabled && handleDataTour ? { 'data-tour': handleDataTour } : {})}
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col rounded-lg px-1 outline-none',
          tapToPickGroup && 'cursor-pointer transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring/60',
        )}
        role={tapToPickGroup ? 'button' : undefined}
        tabIndex={tapToPickGroup ? 0 : undefined}
        onClick={tapToPickGroup ? () => onOpenAssignPicker?.() : undefined}
        onKeyDown={
          tapToPickGroup
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenAssignPicker?.()
                }
              }
            : undefined
        }
      >
        {/* Eine Zeile: PLU + Ohne/Markt-Gruppe + ggf. Master-Liste + Einheit (nicht umbrechen). */}
        <div
          className={cn(
            'mb-2 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]',
            !dragDisabled && 'pr-10',
          )}
        >
          <StatusBadge
            plu={item.plu}
            status={item.status}
            oldPlu={item.old_plu}
            className="shrink-0 text-xs"
          />
          {showOhneBadge ? (
            <Badge variant="outline" className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-wide">
              Ohne
            </Badge>
          ) : effectiveGroupLabel ? (
            <Badge
              variant="secondary"
              className="max-w-[10rem] shrink-0 truncate whitespace-nowrap text-[10px]"
              title={effectiveGroupLabel}
            >
              {effectiveGroupLabel}
            </Badge>
          ) : null}
          {listGroupLabel ? (
            <Badge
              variant="outline"
              className="max-w-[9rem] shrink-0 truncate whitespace-nowrap text-[10px] text-muted-foreground"
              title={`Master-Liste: ${listGroupLabel}`}
            >
              Liste: {listGroupLabel === 'Ohne Zuordnung' ? 'Ohne' : listGroupLabel}
            </Badge>
          ) : null}
          <Badge variant="outline" className="shrink-0 whitespace-nowrap text-[10px]">
            {item.item_type === 'WEIGHT' ? 'Gewicht' : 'Stück'}
          </Badge>
          {hiddenOnMasterList ? (
            <Badge
              variant="outline"
              className="max-w-[11rem] shrink-0 truncate whitespace-nowrap border-amber-300/80 bg-amber-50/90 text-[10px] text-amber-950"
              title="In der Hauptliste ausgeblendet (Ausgeblendete / Werbung prüfen)."
            >
              Ausgeblendet
            </Badge>
          ) : null}
        </div>
        <p className={cn('break-words text-sm font-medium leading-snug text-foreground', !dragDisabled && 'pr-10')}>
          {display}
        </p>
      </div>
      {bulkSelectActive ? (
        <div
          className="absolute bottom-1.5 left-1.5 z-10 flex min-h-9 min-w-9 items-center justify-center p-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => onToggle()}
            className="size-3.5 rounded-[3px] border-muted-foreground/35 shadow-none data-[state=checked]:border-primary data-[state=checked]:bg-primary [&_svg]:size-2.5"
          />
        </div>
      ) : null}
      {!dragDisabled ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab items-center justify-center rounded-lg touch-none text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Ziehen zum Zuordnen"
          data-tour={handleDataTour}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}
