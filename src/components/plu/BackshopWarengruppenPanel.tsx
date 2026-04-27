// BackshopWarengruppenPanel: Warengruppen-Workbench (3 Spalten, Markt-Overrides, DnD)

import { useState, useMemo, useCallback, useEffect } from 'react'
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
  type DragStartEvent,
  pointerWithin,
  closestCorners,
  type CollisionDetection,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Search, Loader2, GripVertical, CheckSquare, Undo2, ChevronLeft } from 'lucide-react'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import {
  useBackshopBlocks,
  useCreateBackshopBlock,
  useUpdateBackshopBlock,
  useDeleteBackshopBlock,
} from '@/hooks/useBackshopBlocks'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
  useAssignBackshopProductBlockOverride,
} from '@/hooks/useStoreBackshopBlockLayout'
import {
  buildNameBlockOverrideMap,
  effectiveBlockIdForStoreOverride,
  normalizeSystemNameForBlockOverride,
  sortBlocksWithStoreOrder,
} from '@/lib/block-override-utils'
import { useAuth } from '@/hooks/useAuth'
import { useMediaMinWidth, WARENGRUPPEN_WORKBENCH_DESKTOP_MIN_PX } from '@/hooks/useMediaMinWidth'
import type { BackshopMasterPLUItem } from '@/types/database'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'

const UNASSIGNED_KEY = '__unassigned__'
const DROP_UNASSIGNED = '__drop_unassigned__'

type RecentChange = {
  id: string
  at: number
  itemId: string
  plu: string
  name: string
  fromLabel: string
  toLabel: string
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function BackshopWarengruppenPanel() {
  const { isAdmin } = useAuth()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: items = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: storeBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrideMap = useMemo(
    () => buildNameBlockOverrideMap(storeNameOverrides),
    [storeNameOverrides],
  )
  const sortedBlocks = useMemo(
    () => sortBlocksWithStoreOrder(blocks, storeBlockOrder),
    [blocks, storeBlockOrder],
  )
  const createBlock = useCreateBackshopBlock()
  const updateBlock = useUpdateBackshopBlock()
  const deleteBlock = useDeleteBackshopBlock()
  const assignOverride = useAssignBackshopProductBlockOverride()

  const effBlock = useCallback(
    (item: BackshopMasterPLUItem) =>
      effectiveBlockIdForStoreOverride(item.system_name, item.block_id, nameBlockOverrideMap),
    [nameBlockOverrideMap],
  )

  const hasMarktOverride = useCallback(
    (item: BackshopMasterPLUItem) =>
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
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showRenameBlock, setShowRenameBlock] = useState(false)
  const [showDeleteBlockConfirm, setShowDeleteBlockConfirm] = useState(false)
  const [blockName, setBlockName] = useState('')
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([])
  /** Tippen auf Karte: Popup mit allen Warengruppen zur Auswahl */
  const [assignPickerItem, setAssignPickerItem] = useState<BackshopMasterPLUItem | null>(null)
  const [draggingItem, setDraggingItem] = useState<BackshopMasterPLUItem | null>(null)
  const isWorkbenchDesktop = useMediaMinWidth(WARENGRUPPEN_WORKBENCH_DESKTOP_MIN_PX)
  /** Unter xl: zweistufig Gruppenliste → Artikel (ohne DnD). */
  const [mobileWorkbenchStep, setMobileWorkbenchStep] = useState<'groups' | 'products'>('groups')

  useEffect(() => {
    if (isWorkbenchDesktop) setMobileWorkbenchStep('groups')
  }, [isWorkbenchDesktop])

  const pushRecent = useCallback((item: BackshopMasterPLUItem, fromLabel: string, toLabel: string) => {
    setRecentChanges((prev) => {
      const next: RecentChange[] = [
        {
          id: randomId(),
          at: Date.now(),
          itemId: item.id,
          plu: item.plu,
          name: item.display_name ?? item.system_name,
          fromLabel,
          toLabel,
        },
        ...prev.filter((r) => r.itemId !== item.id),
      ]
      return next.slice(0, 12)
    })
  }, [])

  const selectedBlock = selectedKey && selectedKey !== UNASSIGNED_KEY ? blocks.find((b) => b.id === selectedKey) : undefined

  const blockItemCounts = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const item of items) {
      const key = effBlock(item)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [items, effBlock])

  const overrideCount = useMemo(
    () => items.filter((i) => hasMarktOverride(i)).length,
    [items, hasMarktOverride],
  )

  const unassignedItems = useMemo(() => items.filter((i) => effBlock(i) == null), [items, effBlock])

  const openMobileWorkbenchGroup = useCallback(
    (key: string) => {
      setSelectedKey(key)
      if (!bulkSelectActive) {
        if (key === UNASSIGNED_KEY) {
          setCheckedIds(new Set(unassignedItems.map((i) => i.id)))
        } else {
          setCheckedIds(new Set(items.filter((i) => effBlock(i) === key).map((i) => i.id)))
        }
      }
      setMobileWorkbenchStep('products')
    },
    [bulkSelectActive, unassignedItems, items, effBlock],
  )

  const matchesSearch = useCallback(
    (item: BackshopMasterPLUItem, q: string) => {
      const lower = q.toLowerCase()
      return (
        item.system_name.toLowerCase().includes(lower) ||
        (item.display_name?.toLowerCase().includes(lower) ?? false) ||
        item.plu.includes(lower)
      )
    },
    [],
  )

  const searchActive = Boolean(deferredSearch.trim())

  const centerItems = useMemo(() => {
    if (searchActive) {
      return items.filter((i) => matchesSearch(i, deferredSearch.trim()))
    }
    if (selectedKey === UNASSIGNED_KEY) return unassignedItems
    if (selectedKey) return items.filter((i) => effBlock(i) === selectedKey)
    return []
  }, [items, searchActive, deferredSearch, selectedKey, unassignedItems, effBlock, matchesSearch])

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
          setCheckedIds(new Set(items.filter((i) => effBlock(i) === key).map((i) => i.id)))
        }
      }
    },
    [selectedKey, bulkSelectActive, unassignedItems, items, effBlock],
  )

  const toggleItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const assignOneMarkt = useCallback(
    async (item: BackshopMasterPLUItem, targetBlockId: string | null) => {
      const from = blockLabel(effBlock(item))
      await assignOverride.mutateAsync({
        systemName: item.system_name,
        masterBlockId: item.block_id,
        targetBlockId,
      })
      const to = targetBlockId === null ? blockLabel(item.block_id) : blockLabel(targetBlockId)
      pushRecent(item, from, to)
    },
    [assignOverride, blockLabel, effBlock, pushRecent],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDraggingItem(null)
      const { active, over } = event
      if (!over) return
      const itemId = active.id as string
      const overId = over.id as string
      const item = items.find((i) => i.id === itemId)
      if (!item) return

      let targetBlockId: string | null = null
      if (overId === DROP_UNASSIGNED) targetBlockId = null
      else if (blocks.some((b) => b.id === overId)) targetBlockId = overId
      else return

      const before = effBlock(item)
      if (before === targetBlockId) return

      try {
        await assignOneMarkt(item, targetBlockId)
        toast.success('Zuordnung aktualisiert')
      } catch {
        toast.error('Fehler beim Zuweisen')
      }
    },
    [items, blocks, effBlock, assignOneMarkt],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    const item = items.find((i) => i.id === id)
    if (item) setDraggingItem(item)
  }, [items])

  const handlePickAssignTarget = useCallback(
    async (targetBlockId: string | null) => {
      if (!assignPickerItem) return
      const item = assignPickerItem
      if (effBlock(item) === targetBlockId) {
        setAssignPickerItem(null)
        return
      }
      try {
        await assignOneMarkt(item, targetBlockId)
        toast.success('Zuordnung aktualisiert')
        setAssignPickerItem(null)
      } catch {
        toast.error('Fehler beim Zuweisen')
      }
    },
    [assignPickerItem, effBlock, assignOneMarkt],
  )

  const handleBulkAssignToSelectedGroup = async () => {
    if (checkedIds.size === 0) return
    if (!selectedKey || selectedKey === UNASSIGNED_KEY) {
      toast.error('Bitte eine Warengruppe als Ziel wählen (nicht „Ohne Zuordnung“).')
      return
    }
    const targetId = selectedKey
    try {
      for (const id of checkedIds) {
        const item = items.find((i) => i.id === id)
        if (!item) continue
        const from = blockLabel(effBlock(item))
        await assignOverride.mutateAsync({
          systemName: item.system_name,
          masterBlockId: item.block_id,
          targetBlockId: targetId,
        })
        pushRecent(item, from, blockLabel(targetId))
      }
      toast.success(`${checkedIds.size} Artikel zugewiesen`)
      setCheckedIds(new Set())
    } catch {
      toast.error('Fehler beim Zuweisen')
    }
  }

  const handleBulkMoveToOhne = async () => {
    if (checkedIds.size === 0) return
    try {
      for (const id of checkedIds) {
        const item = items.find((i) => i.id === id)
        if (!item) continue
        const from = blockLabel(effBlock(item))
        await assignOverride.mutateAsync({
          systemName: item.system_name,
          masterBlockId: item.block_id,
          targetBlockId: null,
        })
        pushRecent(item, from, 'Ohne Zuordnung')
      }
      toast.success(`${checkedIds.size} Artikel zu „Ohne Zuordnung“ verschoben`)
      setCheckedIds(new Set())
    } catch {
      toast.error('Fehler beim Verschieben')
    }
  }

  const handleRemoveOverrideForItem = async (item: BackshopMasterPLUItem) => {
    try {
      const from = blockLabel(effBlock(item))
      await assignOverride.mutateAsync({
        systemName: item.system_name,
        masterBlockId: item.block_id,
        targetBlockId: null,
      })
      pushRecent(item, from, blockLabel(item.block_id))
      toast.success('Markt-Override entfernt')
    } catch {
      toast.error('Fehler beim Entfernen')
    }
  }

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const firstProductHandleId = useMemo(() => centerItems[0]?.id ?? null, [centerItems])

  /** Mit DragOverlay: Standard „closestCenter“ nutzt oft noch die Rect der Karte in der Mitte → Drop wirkt „zu hoch“. Zuerst Ziel unter dem Zeiger. */
  const collisionDetection = useMemo<CollisionDetection>(
    () => (args) => {
      const byPointer = pointerWithin(args)
      if (byPointer.length > 0) return byPointer
      return closestCorners(args)
    },
    [],
  )

  const mobileSearchJumpLabel =
    searchActive && centerItems.length > 0
      ? `${centerItems.length} Suchtreffer anzeigen`
      : searchActive
        ? 'Keine Treffer'
        : ''

  return (
    <>
      {isWorkbenchDesktop ? (
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex flex-col gap-4"
          data-testid="backshop-warengruppen-panel-root"
          data-tour="backshop-konfig-warengruppen-panel"
        >
          {/* Globale Suche */}
          <div className="relative w-full max-w-2xl min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Über alle Gruppen suchen…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 pr-9 h-11"
                aria-label="Globale Suche"
                data-tour="backshop-konfig-warengruppen-products-search"
              />
              {globalSearch ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => setGlobalSearch('')}
                  aria-label="Suche leeren"
                >
                  ✕
                </button>
              ) : null}
          </div>

          {/* Eine gemeinsame Karte: drei Spalten gleiche Höhe, Aktionen unten durchgehend */}
          <Card className="min-w-0 overflow-hidden shadow-sm">
            <CardContent className="flex max-h-[min(72vh,720px)] min-h-[280px] flex-col p-0">
              <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:divide-x lg:divide-y-0 xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_minmax(220px,280px)]">
                {/* Spalte: Warengruppen */}
                <div
                  className="flex min-h-0 min-w-0 flex-col p-4 order-1 lg:max-xl:max-h-[min(40vh,360px)] xl:max-h-none"
                  data-tour="backshop-konfig-warengruppen-groups-card"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Warengruppen</h3>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0"
                        onClick={() => { setBlockName(''); setShowAddBlock(true) }}
                        data-tour="backshop-konfig-warengruppen-group-add-button"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Neu
                      </Button>
                    ) : null}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-tour="backshop-konfig-warengruppen-group-list">
                    <div className="space-y-1">
                      <DroppableUnassignedRow
                        count={unassignedCount}
                        isSelected={selectedKey === UNASSIGNED_KEY}
                        isDropTarget={draggingItem !== null}
                        onClick={() => handleGroupClick(UNASSIGNED_KEY)}
                      />
                      {sortedBlocks.map((block) => (
                        <DroppableBlock
                          key={block.id}
                          blockId={block.id}
                          name={block.name}
                          count={blockItemCounts.get(block.id) ?? 0}
                          isSelected={selectedKey === block.id}
                          isDropTarget={draggingItem !== null}
                          onClick={() => handleGroupClick(block.id)}
                        />
                      ))}
                    </div>
                  </div>
                  {selectedBlock && isAdmin ? (
                    <div className="mt-3 flex shrink-0 justify-center gap-2 border-t border-border pt-3">
                      <Button
                        type="button"
                        size="icon-lg"
                        variant="outline"
                        className="min-h-11 min-w-11 shrink-0 rounded-lg"
                        onClick={() => { setBlockName(selectedBlock.name); setShowRenameBlock(true) }}
                        aria-label="Warengruppe umbenennen"
                        title="Umbenennen"
                        data-tour="backshop-konfig-warengruppen-group-rename-button"
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
                        data-tour="backshop-konfig-warengruppen-group-delete-button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Spalte: Artikel */}
                <div
                  className="flex min-h-0 min-w-0 flex-col p-4 order-2 lg:max-xl:max-h-[min(40vh,360px)] xl:max-h-none"
                  data-tour="backshop-konfig-warengruppen-products-card"
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
                            ? `${centerItems.length} Artikel · antippen für Gruppenwahl, ziehen oder Mehrfachauswahl`
                            : 'Links eine Warengruppe wählen oder oben suchen.'}
                      </p>
                    </div>
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
                        data-tour="backshop-konfig-warengruppen-products-list"
                      >
                        {centerItems.map((item) => (
                          <WorkbenchProductCard
                            key={item.id}
                            item={item}
                            bulkSelectActive={bulkSelectActive}
                            isChecked={checkedIds.has(item.id)}
                            onToggle={() => toggleItem(item.id)}
                            groupBadge={searchActive ? blockLabel(effBlock(item)) : undefined}
                            showOhneBadge={effBlock(item) == null}
                            onOpenAssignPicker={() => setAssignPickerItem(item)}
                            handleDataTour={
                              item.id === firstProductHandleId
                                ? 'backshop-konfig-warengruppen-products-first-handle'
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Spalte: Status (order-3: niedrigere order-Werte würden sonst vor Spalte 1/2 rutschen) */}
                <div className="order-3 flex min-h-0 min-w-0 flex-col border-t border-border p-4 lg:col-span-2 lg:max-xl:max-h-[min(36vh,320px)] xl:col-span-1 xl:max-h-none xl:border-l xl:border-t-0">
                  <h3 className="mb-3 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Status</h3>
                  <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-left transition-colors hover:bg-amber-50"
                      onClick={() => handleGroupClick(UNASSIGNED_KEY)}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">Ohne Zuordnung</p>
                      <p className="text-2xl font-semibold tabular-nums text-amber-950">{unassignedCount}</p>
                    </button>
                    <div className="min-h-[44px] rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markt-Overrides</p>
                      <p className="text-2xl font-semibold tabular-nums">{overrideCount}</p>
                    </div>
                    <div className="min-h-[44px] rounded-lg border border-border bg-muted/30 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Artikel gesamt</p>
                      <p className="text-2xl font-semibold tabular-nums">{items.length}</p>
                    </div>
                  </div>
                  <Separator className="my-3 shrink-0" />
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Zuletzt geändert</p>
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      {recentChanges.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Noch keine Änderungen in dieser Sitzung.</p>
                      ) : (
                        <div className="space-y-2">
                          {recentChanges.map((r) => {
                            const item = items.find((i) => i.id === r.itemId)
                            const canRemoveOverride = Boolean(item && hasMarktOverride(item))
                            return (
                              <div
                                key={r.id}
                                className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm"
                              >
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">{getDisplayPlu(r.plu)}</span>
                                <p className="font-medium leading-snug line-clamp-2">{r.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {r.fromLabel} → {r.toLabel}
                                </p>
                                {canRemoveOverride ? (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                    onClick={() => item && handleRemoveOverrideForItem(item)}
                                    disabled={assignOverride.isPending}
                                  >
                                    <Undo2 className="mr-1 inline h-3 w-3" />
                                    Override entfernen
                                  </Button>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
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
                  data-tour="backshop-konfig-warengruppen-products-assign-button"
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
                  data-tour="backshop-konfig-warengruppen-products-deselect-button"
                >
                  Auswahl leeren
                </Button>
              </div>
            </CardContent>
          </Card>

          <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
            {draggingItem ? (
              <div className="pointer-events-none flex max-w-[min(88vw,240px)] cursor-grabbing select-none items-center gap-2.5 rounded-xl border border-border bg-background/95 p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
                <BackshopThumbnail src={draggingItem.image_url} size="lg" className="rounded-md border-border shadow-sm" />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{getDisplayPlu(draggingItem.plu)}</p>
                  <p className="line-clamp-2 text-left text-xs font-semibold leading-snug text-foreground">
                    {draggingItem.display_name ?? draggingItem.system_name}
                  </p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="backshop-warengruppen-panel-root"
          data-tour="backshop-konfig-warengruppen-panel"
        >
          <div className="relative w-full min-w-0 max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Über alle Gruppen suchen…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="h-11 pl-9 pr-9"
              aria-label="Globale Suche"
              data-tour="backshop-konfig-warengruppen-products-search"
            />
            {globalSearch ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setGlobalSearch('')}
                aria-label="Suche leeren"
              >
                ✕
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
                  <p className="text-xl font-semibold tabular-nums">{items.length}</p>
                </div>
              </div>

              <Card className="min-w-0 overflow-hidden shadow-sm" data-tour="backshop-konfig-warengruppen-groups-card">
                <CardContent className="space-y-3 p-4">
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
                        data-tour="backshop-konfig-warengruppen-group-add-button"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Neu
                      </Button>
                    ) : null}
                  </div>
                  <div className="max-h-[min(52vh,480px)] min-w-0 space-y-2 overflow-y-auto pr-1" data-tour="backshop-konfig-warengruppen-group-list">
                    <button
                      type="button"
                      onClick={() => openMobileWorkbenchGroup(UNASSIGNED_KEY)}
                      className={cn(
                        'flex w-full min-h-[48px] flex-col gap-1 rounded-lg border border-dashed px-3 py-3 text-left text-sm transition-colors',
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
            <div className="flex min-h-0 min-w-0 flex-col gap-3" data-tour="backshop-konfig-warengruppen-products-card">
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
                        ? `${centerItems.length} Artikel · antippen für Gruppenwahl oder Mehrfachauswahl`
                        : 'Oben eine Warengruppe wählen oder suchen.'}
                  </p>
                </div>
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
                  <div className="grid grid-cols-1 gap-3" data-tour="backshop-konfig-warengruppen-products-list">
                    {centerItems.map((item) => (
                      <WorkbenchProductCard
                        key={item.id}
                        item={item}
                        bulkSelectActive={bulkSelectActive}
                        isChecked={checkedIds.has(item.id)}
                        onToggle={() => toggleItem(item.id)}
                        groupBadge={searchActive ? blockLabel(effBlock(item)) : undefined}
                        showOhneBadge={effBlock(item) == null}
                        onOpenAssignPicker={() => setAssignPickerItem(item)}
                        dragDisabled
                        handleDataTour={
                          item.id === firstProductHandleId
                            ? 'backshop-konfig-warengruppen-products-first-handle'
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                <details className="mt-4 rounded-lg border border-border bg-muted/10 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Zuletzt geändert
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto pr-1">
                    {recentChanges.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Noch keine Änderungen in dieser Sitzung.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentChanges.map((r) => {
                          const row = items.find((i) => i.id === r.itemId)
                          const canRemoveOverride = Boolean(row && hasMarktOverride(row))
                          return (
                            <div
                              key={r.id}
                              className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-sm"
                            >
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {getDisplayPlu(r.plu)}
                              </span>
                              <p className="line-clamp-2 font-medium leading-snug">{r.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.fromLabel} → {r.toLabel}
                              </p>
                              {canRemoveOverride ? (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => row && handleRemoveOverrideForItem(row)}
                                  disabled={assignOverride.isPending}
                                >
                                  <Undo2 className="mr-1 inline h-3 w-3" />
                                  Override entfernen
                                </Button>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )}
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
                  data-tour="backshop-konfig-warengruppen-products-assign-button"
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
                  data-tour="backshop-konfig-warengruppen-products-deselect-button"
                >
                  Auswahl leeren
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent data-tour="backshop-konfig-warengruppen-create-dialog">
          <DialogHeader>
            <DialogTitle>Neue Warengruppe (Backshop)</DialogTitle>
            <DialogDescription>Gib einen Namen für die neue Warengruppe ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder='z. B. „Süßes"' />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateBlock}
              disabled={createBlock.isPending || !blockName.trim()}
              data-tour="backshop-konfig-warengruppen-create-dialog-submit"
            >
              {createBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameBlock} onOpenChange={setShowRenameBlock}>
        <DialogContent data-tour="backshop-konfig-warengruppen-rename-dialog">
          <DialogHeader>
            <DialogTitle>Warengruppe umbenennen</DialogTitle>
            <DialogDescription>Ändere den Namen der ausgewählten Warengruppe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Neuer Name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={handleRenameBlock}
              disabled={updateBlock.isPending || !blockName.trim()}
              data-tour="backshop-konfig-warengruppen-rename-dialog-submit"
            >
              {updateBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignPickerItem != null}
        onOpenChange={(open) => {
          if (!open) setAssignPickerItem(null)
        }}
      >
        <DialogContent
          className="flex h-[min(92dvh,720px)] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[min(85vh,640px)] sm:max-w-md"
          data-tour="backshop-konfig-warengruppen-pick-card"
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 py-4 pr-14 text-left">
            <DialogTitle>Warengruppe wählen</DialogTitle>
            <DialogDescription>Wähle eine Gruppe – der Artikel wird dem Markt so zugeordnet (wie per Ziehen).</DialogDescription>
            {assignPickerItem ? (
              <div className="space-y-1 border-t border-border pt-3">
                <p className="font-mono text-xs tabular-nums text-foreground">{getDisplayPlu(assignPickerItem.plu)}</p>
                <p className="line-clamp-3 text-sm font-medium leading-snug text-foreground">
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
                disabled={assignOverride.isPending}
                onClick={() => handlePickAssignTarget(null)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 font-medium">Ohne Zuordnung</span>
                  {assignPickerItem != null && effBlock(assignPickerItem) == null ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      aktuell
                    </Badge>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{unassignedCount}</span>
              </Button>
              {sortedBlocks.map((b) => {
                const isCurrent = assignPickerItem != null && effBlock(assignPickerItem) === b.id
                const n = blockItemCounts.get(b.id) ?? 0
                return (
                  <Button
                    key={b.id}
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-3 text-left font-normal"
                    disabled={assignOverride.isPending}
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

      <AlertDialog open={showDeleteBlockConfirm} onOpenChange={setShowDeleteBlockConfirm}>
        <AlertDialogContent data-tour="backshop-konfig-warengruppen-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Warengruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{selectedBlock?.name}“ wirklich löschen? Produkte verlieren nur die Zuordnung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlockConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-tour="backshop-konfig-warengruppen-delete-confirm-action"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DroppableUnassignedRow({
  count,
  isSelected,
  isDropTarget,
  onClick,
}: {
  count: number
  isSelected: boolean
  isDropTarget: boolean
  onClick: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: DROP_UNASSIGNED })
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn(
        'flex min-h-[48px] cursor-pointer flex-col gap-1 rounded-lg border border-dashed px-3 py-3 text-sm transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : isOver
            ? 'bg-primary/15 ring-2 ring-primary/40 border-primary/40'
            : isDropTarget
              ? 'bg-muted/50 border-primary/30'
              : 'border-border bg-muted/20 hover:bg-muted/40',
      )}
    >
      <span className="min-w-0 break-words font-medium leading-snug">Ohne Zuordnung</span>
      <span className={cn('self-end text-xs tabular-nums', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        ({count})
      </span>
    </div>
  )
}

function DroppableBlock({
  blockId,
  name,
  count,
  isSelected,
  isDropTarget,
  onClick,
}: {
  blockId: string
  name: string
  count: number
  isSelected: boolean
  isDropTarget: boolean
  onClick: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: blockId })
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn(
        'flex min-h-[48px] cursor-pointer flex-col gap-1 rounded-lg px-3 py-3 text-sm transition-colors',
        isSelected ? 'bg-primary text-primary-foreground' : isOver ? 'bg-primary/15 ring-2 ring-primary/40' : isDropTarget ? 'bg-muted/50 border border-dashed border-primary/30' : 'hover:bg-muted',
      )}
    >
      <span className="min-w-0 break-words font-medium leading-snug">{name}</span>
      <span className={cn('self-end text-xs tabular-nums shrink-0', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        ({count})
      </span>
    </div>
  )
}

function WorkbenchProductCard({
  item,
  bulkSelectActive,
  isChecked,
  onToggle,
  groupBadge,
  showOhneBadge,
  onOpenAssignPicker,
  handleDataTour,
  dragDisabled = false,
}: {
  item: BackshopMasterPLUItem
  bulkSelectActive: boolean
  isChecked: boolean
  onToggle: () => void
  groupBadge?: string
  showOhneBadge: boolean
  /** Klick auf Karte (ohne Griff): Popup zur Warengruppen-Auswahl */
  onOpenAssignPicker?: () => void
  /** Optionaler `data-tour` fuer den DnD-Griff (z. B. erstes Item fuer Tutorial-Anker) */
  handleDataTour?: string
  /** Schmale Workbench: kein Ziehen zum Zuordnen */
  dragDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: dragDisabled })
  const showBildLabel = !item.image_url
  const tapToPickGroup = Boolean(onOpenAssignPicker && !bulkSelectActive)
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
          'flex min-h-0 flex-1 flex-col rounded-lg outline-none',
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
        <div className="relative -mx-[2px] mb-2 min-h-0 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
          <BackshopThumbnail src={item.image_url} size="hero" className="rounded-md border-0" />
          {showBildLabel ? (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80"
              aria-hidden
            >
              BILD
            </span>
          ) : null}
        </div>
        <div className={cn('flex min-w-0 flex-1 flex-col gap-2', !dragDisabled && 'pr-12')}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{getDisplayPlu(item.plu)}</span>
            {showOhneBadge ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Ohne
              </Badge>
            ) : null}
            {groupBadge ? (
              <Badge variant="secondary" className="max-w-full text-[10px] break-words">
                {groupBadge}
              </Badge>
            ) : null}
          </div>
          <p className="break-words text-sm font-medium leading-snug text-foreground">{item.display_name ?? item.system_name}</p>
        </div>
      </div>
      {bulkSelectActive ? (
        <div className="absolute bottom-2 left-2 flex min-h-[44px] min-w-[44px] items-center justify-center">
          <Checkbox checked={isChecked} onCheckedChange={() => onToggle()} className="min-h-[44px] min-w-[44px]" />
        </div>
      ) : null}
      {!dragDisabled ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab items-center justify-center rounded-lg touch-none text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Ziehen zum Zuordnen"
          {...(!dragDisabled && handleDataTour ? { 'data-tour': handleDataTour } : {})}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}
