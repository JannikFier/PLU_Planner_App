// InteractiveBackshopPLUTable: Backshop-Masterliste mit DnD für Blöcke und Produkte
/* eslint-disable react-hooks/refs -- @dnd-kit: setNodeRef/attributes/listeners für Render */

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
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

import { StatusBadge } from './StatusBadge'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import {
  useBackshopBlocks,
  useReorderBackshopBlocks,
  useAssignBackshopProducts,
} from '@/hooks/useBackshopBlocks'
import { getDisplayPlu, getDisplayNameForItem, groupItemsByBlock } from '@/lib/plu-helpers'
import type { BackshopBlock, BackshopMasterPLUItem } from '@/types/database'
import type { BlockGroup } from '@/lib/plu-helpers'

/** Backshop-Item mit item_type für groupItemsByBlock (PLUItemBase) */
type BackshopItemForGroup = BackshopMasterPLUItem & { item_type: 'PIECE' }

function findBlockIdForItem(itemId: string, groups: BlockGroup<BackshopItemForGroup>[]): string | null {
  for (const g of groups) {
    if (g.items.some((item) => item.id === itemId)) return g.blockId
  }
  return null
}

export function InteractiveBackshopPLUTable() {
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: items = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()
  const reorderMutation = useReorderBackshopBlocks()
  const assignMutation = useAssignBackshopProducts()

  const sortedBlocks = useMemo(
    () => [...(blocks as unknown as { id: string; name: string; order_index: number }[])].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const itemsWithType: BackshopItemForGroup[] = useMemo(
    () => items.map((item) => ({ ...item, item_type: 'PIECE' as const })),
    [items],
  )

  const groups = useMemo(
    () => groupItemsByBlock<BackshopItemForGroup>(itemsWithType, sortedBlocks as import('@/types/database').Block[]),
    [itemsWithType, sortedBlocks],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [dragType, setDragType] = useState<'block' | 'item' | null>(null)
  const [dragData, setDragData] = useState<{ block?: BackshopBlock; item?: BackshopMasterPLUItem } | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    if (id.startsWith('drag-block-')) {
      const blockId = id.replace('drag-block-', '')
      const block = sortedBlocks.find((b) => b.id === blockId)
      if (block) {
        setDragType('block')
        setDragData({ block: block as BackshopBlock })
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
    const currentDragType = dragType
    setDragType(null)
    setDragData(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (currentDragType === 'block' && overId.startsWith('drop-block-')) {
      const fromBlockId = activeId.replace('drag-block-', '')
      const toBlockId = overId.replace('drop-block-', '')
      if (fromBlockId === toBlockId) return
      const oldIndex = sortedBlocks.findIndex((b) => b.id === fromBlockId)
      const newIndex = sortedBlocks.findIndex((b) => b.id === toBlockId)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = [...sortedBlocks]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      try {
        await reorderMutation.mutateAsync(reordered.map((b, i) => ({ id: b.id, order_index: i })))
        toast.success('Warengruppe verschoben')
      } catch {
        toast.error('Fehler beim Verschieben')
      }
      return
    }

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

    if (currentDragType === 'item' && overId.startsWith('drag-item-')) {
      const itemId = activeId.replace('drag-item-', '')
      const targetItemId = overId.replace('drag-item-', '')
      if (itemId === targetItemId) return
      const targetBlockId = findBlockIdForItem(targetItemId, groups)
      const sourceBlockId = findBlockIdForItem(itemId, groups)
      if (targetBlockId === sourceBlockId) return
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
        Keine Backshop-Daten vorhanden. Lade zuerst eine Backshop-Excel hoch.
      </div>
    )
  }

  const unassignedItems = useMemo(() => items.filter((i) => i.block_id == null), [items])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 uppercase tracking-wider text-center">
        PLU-Liste Backshop
      </div>
      <BackshopCategoriesLeftUnassignedRight
        groups={groups}
        sortedBlocks={sortedBlocks}
        unassignedItems={unassignedItems}
      />
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {dragType === 'block' && dragData?.block && (
          <div className="px-4 py-2 bg-background border-2 border-primary rounded shadow-xl text-sm font-bold uppercase tracking-wider">
            <GripVertical className="h-4 w-4 inline mr-2" />
            {dragData.block.name}
          </div>
        )}
        {dragType === 'item' && dragData?.item && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded shadow-lg text-sm">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            {dragData.item.image_url && (
              <img src={dragData.item.image_url} alt="" className="h-8 w-8 object-cover rounded" />
            )}
            <span className="font-mono text-xs">{getDisplayPlu(dragData.item.plu)}</span>
            <span>{getDisplayNameForItem(dragData.item.display_name, dragData.item.system_name, false)}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

/** Links: Kategorien (Drop-Zonen) mit je 1–2 Beispielprodukten. Rechts: nur unzugeordnete Produkte zum Reinziehen. */
function BackshopCategoriesLeftUnassignedRight({
  groups,
  sortedBlocks,
  unassignedItems,
}: {
  groups: BlockGroup<BackshopItemForGroup>[]
  sortedBlocks: { id: string; name: string; order_index: number }[]
  unassignedItems: BackshopMasterPLUItem[]
}) {
  return (
    <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border min-h-[400px]">
        {/* Links: „Ohne Zuordnung“ + Kategorien, jede als Drop-Zone */}
        <div className="flex-1 min-w-0 flex flex-col bg-muted/20">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
            Warengruppen – hierher ziehen zum Zuordnen
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {/* Zuordnung aufheben: Produkte hierher ziehen, dann erscheinen sie rechts wieder */}
            <BackshopUnassignedDropZone />
            {sortedBlocks.map((block) => {
              const group = groups.find((g) => g.blockId === block.id)
              const sampleItems = group?.items.slice(0, 3) ?? []
              return (
                <BackshopBlockDropZone
                  key={block.id}
                  blockId={block.id}
                  blockName={block.name}
                  sampleItems={sampleItems}
                />
              )
            })}
          </div>
        </div>
        {/* Rechts: nur unzugeordnete Produkte */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
            Noch nicht zugeordnet ({unassignedItems.length}) – in Kategorie links ziehen
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-8" />
                <col className="w-12" />
                <col className="w-20" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th className="px-1 py-1.5" />
                  <th className="px-1 py-1.5 text-left text-xs font-semibold text-muted-foreground">Bild</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground">PLU</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground">Artikel</th>
                </tr>
              </thead>
              <tbody>
                {unassignedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Alle Produkte sind zugeordnet.
                    </td>
                  </tr>
                ) : (
                  unassignedItems.map((item) => (
                    <BackshopProductRow key={item.id} item={item} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Drop-Zone „Ohne Zuordnung“: Produkte hierher ziehen, um Zuordnung aufzuheben (erscheinen dann rechts). */
function BackshopUnassignedDropZone() {
  const dropId = 'drop-block-unassigned'
  const { isOver, setNodeRef } = useDroppable({ id: dropId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border-2 border-dashed p-3 transition-colors',
        isOver ? 'border-primary bg-primary/10' : 'border-border bg-muted/30',
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground italic">
        Ohne Zuordnung – hierher ziehen zum Rausnehmen
      </span>
    </div>
  )
}

/** Eine Warengruppe als Drop-Zone: Name + 2–3 Produkte mit Bild (draggable, können nach „Ohne Zuordnung“ gezogen werden). */
function BackshopBlockDropZone({
  blockId,
  blockName,
  sampleItems,
}: {
  blockId: string
  blockName: string
  sampleItems: BackshopMasterPLUItem[]
}) {
  const dropId = `drop-block-${blockId}`
  const dragId = `drag-block-${blockId}`
  const { isOver, setNodeRef } = useDroppable({ id: dropId })
  const draggable = useDraggable({ id: dragId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border-2 border-dashed p-3 transition-colors',
        isOver ? 'border-primary bg-primary/10' : 'border-border bg-card',
        draggable.isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          ref={draggable.setNodeRef}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
          {...draggable.attributes}
          {...draggable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{blockName}</span>
      </div>
      {sampleItems.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {sampleItems.map((item) => (
            <BackshopDraggableProductChip key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Kompaktes Produkt mit Bild + PLU + Name, draggable (z. B. in Kategorie-Karte oder nach „Ohne Zuordnung“ ziehen). */
function BackshopDraggableProductChip({ item }: { item: BackshopMasterPLUItem }) {
  const dragId = `drag-item-${item.id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs',
        isDragging && 'opacity-30',
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {item.image_url ? (
        <img src={item.image_url} alt="" className="h-8 w-8 object-cover rounded shrink-0" />
      ) : (
        <span className="h-8 w-8 flex items-center justify-center rounded bg-muted text-[10px] text-muted-foreground shrink-0">–</span>
      )}
      <span className="font-mono text-muted-foreground shrink-0">{getDisplayPlu(item.plu)}</span>
      <span className="truncate min-w-0">{getDisplayNameForItem(item.display_name, item.system_name, false)}</span>
    </div>
  )
}

function BackshopProductRow({ item }: { item: BackshopMasterPLUItem }) {
  const dragId = `drag-item-${item.id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId })

  return (
    <tr className={cn('border-b border-border last:border-b-0', isDragging ? 'opacity-20' : '')}>
      <td className="px-1 py-1 text-center align-top">
        <button
          ref={setNodeRef}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      </td>
      <td className="px-1 py-1 align-top">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-10 w-10 object-cover rounded" />
        ) : (
          <span className="text-muted-foreground text-xs">–</span>
        )}
      </td>
      <td className="px-2 py-1 align-top">
        <StatusBadge plu={item.plu} status={item.status} oldPlu={item.old_plu} />
      </td>
      <td className="px-2 py-1 text-sm break-words min-w-0 align-top" title={getDisplayNameForItem(item.display_name, item.system_name, false)}>
        {getDisplayNameForItem(item.display_name, item.system_name, false)}
      </td>
    </tr>
  )
}
