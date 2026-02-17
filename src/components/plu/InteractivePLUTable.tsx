// InteractivePLUTable: Echte Masterliste mit DnD für Blöcke und einzelne Produkte
// Zwei-Spalten-Layout wie die echte PLUTable, mit Drag-Handles für Blöcke und Produkte
/* eslint-disable react-hooks/refs -- @dnd-kit/sortable: setNodeRef/attributes/listeners sind für Render vorgesehen */

import { useMemo, useState, useCallback } from 'react'
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
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import {
  useBlocks,
  useReorderBlocks,
  useAssignProducts,
} from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { getDisplayPlu, getDisplayNameForItem, groupItemsByBlock } from '@/lib/plu-helpers'
import type { MasterPLUItem, Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { BlockGroup } from '@/lib/plu-helpers'


/** Findet den Block-ID eines Items anhand seiner ID */
function findBlockIdForItem(itemId: string, groups: BlockGroup[]): string | null {
  for (const g of groups) {
    if (g.items.some((item) => item.id === itemId)) {
      return g.blockId
    }
  }
  return null
}

export function InteractivePLUTable() {
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const reorderMutation = useReorderBlocks()
  const assignMutation = useAssignProducts()

  const displayMode = layoutSettings?.display_mode ?? 'MIXED'

  // Sortierte Blöcke
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  // Gruppen bauen (explizit MasterPLUItem als generischen Typ)
  const groups = useMemo(
    () => groupItemsByBlock<MasterPLUItem>(items, sortedBlocks),
    [items, sortedBlocks],
  )

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const [dragType, setDragType] = useState<'block' | 'item' | null>(null)
  const [dragData, setDragData] = useState<{ block?: Block; item?: MasterPLUItem } | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
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
      const item = items.find((i) => i.id === itemId)
      if (item) {
        setDragType('item')
        setDragData({ item })
      }
    }
  }, [sortedBlocks, items])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    const currentDragType = dragType
    setDragType(null)
    setDragData(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // ========== BLOCK auf BLOCK: Reihenfolge ändern ==========
    if (currentDragType === 'block' && overId.startsWith('drop-block-')) {
      const fromBlockId = activeId.replace('drag-block-', '')
      const toBlockId = overId.replace('drop-block-', '')
      if (fromBlockId === toBlockId) return

      const oldIndex = sortedBlocks.findIndex((b) => b.id === fromBlockId)
      const newIndex = sortedBlocks.findIndex((b) => b.id === toBlockId)
      if (oldIndex === -1 || newIndex === -1) return

      // Neues Array: Block an neue Position einfügen
      const reordered = [...sortedBlocks]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      try {
        await reorderMutation.mutateAsync(
          reordered.map((b, i) => ({ id: b.id, order_index: i })),
        )
        toast.success('Warengruppe verschoben')
      } catch {
        toast.error('Fehler beim Verschieben')
      }
      return
    }

    // ========== PRODUKT auf BLOCK: Zuweisen ==========
    if (currentDragType === 'item' && overId.startsWith('drop-block-')) {
      const itemId = activeId.replace('drag-item-', '')
      const targetBlockId = overId.replace('drop-block-', '')
      const blockId = targetBlockId === 'unassigned' ? null : targetBlockId

      try {
        await assignMutation.mutateAsync({ itemIds: [itemId], blockId })
        toast.success('Produkt verschoben')
      } catch {
        toast.error('Fehler beim Verschieben')
      }
      return
    }

    // ========== PRODUKT auf PRODUKT: Ziel-Block des Produkts finden ==========
    if (currentDragType === 'item' && overId.startsWith('drag-item-')) {
      const itemId = activeId.replace('drag-item-', '')
      const targetItemId = overId.replace('drag-item-', '')
      if (itemId === targetItemId) return

      const targetBlockId = findBlockIdForItem(targetItemId, groups)
      const sourceBlockId = findBlockIdForItem(itemId, groups)
      if (targetBlockId === sourceBlockId) return // Gleicher Block

      try {
        await assignMutation.mutateAsync({ itemIds: [itemId], blockId: targetBlockId })
        toast.success('Produkt verschoben')
      } catch {
        toast.error('Fehler beim Verschieben')
      }
    }
  }, [dragType, sortedBlocks, groups, reorderMutation, assignMutation])

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Keine PLU-Daten vorhanden. Lade zuerst eine Excel-Datei hoch.
      </div>
    )
  }

  // SEPARATED: Zwei Tabellen
  if (displayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')
    const pieceGroups = groupItemsByBlock<MasterPLUItem>(pieceItems, sortedBlocks)
    const weightGroups = groupItemsByBlock<MasterPLUItem>(weightItems, sortedBlocks)

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-8">
          {pieceGroups.length > 0 && (
            <div>
              <div className="rounded-t-lg bg-blue-500/10 border border-b-0 border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 uppercase tracking-wider text-center">
                PLU-Liste Stück
              </div>
              <TwoColumnInteractive groups={pieceGroups} />
            </div>
          )}
          {weightGroups.length > 0 && (
            <div>
              <div className="rounded-t-lg bg-amber-500/10 border border-b-0 border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 uppercase tracking-wider text-center">
                PLU-Liste Gewicht
              </div>
              <TwoColumnInteractive groups={weightGroups} />
            </div>
          )}
        </div>
        <DragOverlayContent dragType={dragType} dragData={dragData} />
      </DndContext>
    )
  }

  // MIXED
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 uppercase tracking-wider text-center">
        PLU-Liste
      </div>
      <TwoColumnInteractive groups={groups} />
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

// ============================================================
// TwoColumnInteractive: Zwei-Spalten-Grid mit DnD
// ============================================================

function TwoColumnInteractive({ groups }: { groups: BlockGroup<MasterPLUItem>[] }) {
  const flatRows = useMemo(() => buildFlatRows(groups), [groups])

  // In zwei Hälften aufteilen
  const mid = Math.ceil(flatRows.length / 2)
  const leftRows = flatRows.slice(0, mid)
  const rightRows = flatRows.slice(mid)

  return (
    <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
      <div className="hidden md:flex divide-x divide-border">
        <InteractiveColumn rows={leftRows} />
        <InteractiveColumn rows={rightRows} />
      </div>
      {/* Mobil: 1 Spalte */}
      <div className="md:hidden">
        <InteractiveColumn rows={flatRows} />
      </div>
    </div>
  )
}

// ============================================================
// InteractiveColumn: Eine Spalte mit Header- und Item-Zeilen
// ============================================================

function InteractiveColumn({ rows }: { rows: FlatRow[] }) {
  return (
    <div className="flex-1 min-w-0">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[36px]" />
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
              return (
                <InteractiveBlockHeader
                  key={`hdr-${row.blockId ?? 'unassigned'}-${i}`}
                  label={row.label!}
                  blockId={row.blockId}
                />
              )
            }
            return <InteractiveProductRow key={row.item!.id} item={row.item!} />
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// InteractiveBlockHeader: Draggable + Droppable Block-Header
// ============================================================

function InteractiveBlockHeader({ label, blockId }: { label: string; blockId: string | null | undefined }) {
  const dropId = blockId ? `drop-block-${blockId}` : 'drop-block-unassigned'
  const dragId = blockId ? `drag-block-${blockId}` : undefined
  const isSortable = blockId !== null && blockId !== undefined

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: dropId })

  const draggable = useDraggable({
    id: dragId ?? 'noop',
    disabled: !isSortable,
  })

  return (
    <tr
      ref={setDropRef}
      className={cn(
        'border-b border-border',
        isOver ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : '',
        draggable.isDragging ? 'opacity-30' : '',
      )}
    >
      <td className="px-1 py-2 text-center">
        {isSortable && (
          <button
            ref={draggable.setNodeRef}
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
            {...draggable.attributes}
            {...draggable.listeners}
          >
            <GripVertical className="h-4 w-4" />
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

function InteractiveProductRow({ item }: { item: MasterPLUItem }) {
  const dragId = `drag-item-${item.id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId })

  return (
    <tr
      className={cn(
        'border-b border-border last:border-b-0',
        isDragging ? 'opacity-20' : '',
      )}
    >
      <td className="px-1 py-1 text-center">
        <button
          ref={setNodeRef}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
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
          <PreisBadge value={(item as unknown as DisplayItem).preis!} />
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

  return (
    <DragOverlay>
      {dragType === 'block' && dragData.block && (
        <div className="px-4 py-2 bg-background border-2 border-primary rounded shadow-xl text-sm font-bold uppercase tracking-wider">
          <GripVertical className="h-4 w-4 inline mr-2" />
          {dragData.block.name}
        </div>
      )}
      {dragType === 'item' && dragData.item && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded shadow-lg text-sm">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs">{getDisplayPlu(dragData.item.plu)}</span>
          <span>{getDisplayNameForItem(dragData.item.display_name, dragData.item.system_name, (dragData.item as unknown as DisplayItem).is_custom)}</span>
        </div>
      )}
    </DragOverlay>
  )
}
