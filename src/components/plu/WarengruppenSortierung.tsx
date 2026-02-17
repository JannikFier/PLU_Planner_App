// WarengruppenSortierung: Drag & Drop + Pfeil-Buttons für Block-Reihenfolge

import { useMemo } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

import { useBlocks, useReorderBlocks } from '@/hooks/useBlocks'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import type { Block } from '@/types/database'

export function WarengruppenSortierung() {
  const { data: blocks = [] } = useBlocks()
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const reorderMutation = useReorderBlocks()

  // Items-Count pro Block
  const blockItemCounts = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const item of items) {
      counts.set(item.block_id, (counts.get(item.block_id) ?? 0) + 1)
    }
    return counts
  }, [items])

  const unassignedCount = blockItemCounts.get(null) ?? 0

  // Sortierte Blöcke
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  // DnD Sensoren
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Reihenfolge speichern
  const saveOrder = async (newBlocks: Block[]) => {
    const updates = newBlocks.map((block, i) => ({
      id: block.id,
      order_index: i,
    }))
    try {
      await reorderMutation.mutateAsync(updates)
    } catch {
      toast.error('Fehler beim Speichern der Reihenfolge')
    }
  }

  // Drag End Handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id)
    const newIndex = sortedBlocks.findIndex((b) => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(sortedBlocks, oldIndex, newIndex)
    saveOrder(newOrder)
  }

  // Pfeil-Buttons
  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = sortedBlocks.findIndex((b) => b.id === blockId)
    if (index === -1) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sortedBlocks.length) return

    const newOrder = arrayMove(sortedBlocks, index, newIndex)
    saveOrder(newOrder)
  }

  if (sortedBlocks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Reihenfolge der Warengruppen</CardTitle>
        <CardDescription className="text-xs">
          Bestimmt die Sortierung in Tabelle und PDF. Ziehen oder Pfeile nutzen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {sortedBlocks.map((block, index) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  itemCount={blockItemCounts.get(block.id) ?? 0}
                  isFirst={index === 0}
                  isLast={index === sortedBlocks.length - 1}
                  onMoveUp={() => moveBlock(block.id, 'up')}
                  onMoveDown={() => moveBlock(block.id, 'down')}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Ohne Zuordnung (nicht verschiebbar) */}
        <div className="flex items-center gap-3 px-3 py-2 mt-2 border-t border-dashed border-border text-sm text-muted-foreground">
          <div className="w-4" /> {/* Platz für Gripper */}
          <span className="flex-1 italic">Ohne Zuordnung</span>
          <span className="text-xs">{unassignedCount} Artikel</span>
          <div className="w-16" /> {/* Platz für Pfeile */}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Sortable Block Item
// ============================================================

interface SortableBlockItemProps {
  block: Block
  itemCount: number
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}

function SortableBlockItem({
  block,
  itemCount,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded border border-border bg-background text-sm ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Name + Count */}
      <span className="flex-1 font-medium">{block.name}</span>
      <span className="text-xs text-muted-foreground">{itemCount} Artikel</span>

      {/* Pfeil-Buttons */}
      <div className="flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label="Nach oben"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label="Nach unten"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
