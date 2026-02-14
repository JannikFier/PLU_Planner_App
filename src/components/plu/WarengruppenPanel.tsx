// WarengruppenPanel: Split-Panel (Links Gruppen, Rechts Produkte mit Checkboxen)

import { useState, useMemo, useCallback } from 'react'
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
} from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Search, Loader2, GripVertical } from 'lucide-react'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import {
  useBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useAssignProducts,
} from '@/hooks/useBlocks'
import type { MasterPLUItem } from '@/types/database'
export function WarengruppenPanel() {
  const { data: activeVersion } = useActiveVersion()
  const { data: items = [] } = usePLUData(activeVersion?.id)
  const { data: blocks = [] } = useBlocks()
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()
  const assignProducts = useAssignProducts()

  // State
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showRenameBlock, setShowRenameBlock] = useState(false)
  const [blockName, setBlockName] = useState('')

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  // Items-Count pro Block
  const blockItemCounts = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const item of items) {
      const key = item.block_id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [items])

  // Gefilterte Produkte (rechte Seite)
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const lower = search.toLowerCase()
    return items.filter(
      (item) =>
        item.system_name.toLowerCase().includes(lower) ||
        item.plu.includes(lower),
    )
  }, [items, search])

  // Block auswählen / abwählen (nochmal klicken = deselektieren)
  const handleBlockSelect = useCallback(
    (blockId: string) => {
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null)
        setCheckedIds(new Set())
        return
      }
      setSelectedBlockId(blockId)
      const blockItems = items.filter((i) => i.block_id === blockId)
      setCheckedIds(new Set(blockItems.map((i) => i.id)))
    },
    [items, selectedBlockId],
  )

  // Checkbox toggle
  const toggleItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Zuweisen
  const handleAssign = async () => {
    if (!selectedBlockId || checkedIds.size === 0) return
    try {
      await assignProducts.mutateAsync({
        itemIds: Array.from(checkedIds),
        blockId: selectedBlockId,
      })
      toast.success(`${checkedIds.size} Produkte zugewiesen`)
    } catch {
      toast.error('Fehler beim Zuweisen')
    }
  }

  // Block erstellen
  const handleCreateBlock = async () => {
    if (!blockName.trim()) return
    try {
      await createBlock.mutateAsync({
        name: blockName.trim(),
        order_index: blocks.length,
      })
      setBlockName('')
      setShowAddBlock(false)
      toast.success('Warengruppe erstellt')
    } catch {
      toast.error('Fehler beim Erstellen')
    }
  }

  // Block umbenennen
  const handleRenameBlock = async () => {
    if (!selectedBlockId || !blockName.trim()) return
    try {
      await updateBlock.mutateAsync({ id: selectedBlockId, name: blockName.trim() })
      setBlockName('')
      setShowRenameBlock(false)
      toast.success('Warengruppe umbenannt')
    } catch {
      toast.error('Fehler beim Umbenennen')
    }
  }

  // Block löschen
  const handleDeleteBlock = async () => {
    if (!selectedBlockId) return
    if (!confirm(`"${selectedBlock?.name}" wirklich löschen? Produkte verlieren nur die Zuordnung.`)) return
    try {
      await deleteBlock.mutateAsync(selectedBlockId)
      setSelectedBlockId(null)
      setCheckedIds(new Set())
      toast.success('Warengruppe gelöscht')
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const unassignedCount = blockItemCounts.get(null) ?? 0

  // DnD Setup
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [draggingItem, setDraggingItem] = useState<MasterPLUItem | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string
    const item = items.find((i) => i.id === id)
    if (item) setDraggingItem(item)
  }, [items])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingItem(null)
    const { active, over } = event
    if (!over) return

    const itemId = active.id as string
    const targetBlockId = over.id as string

    // Prüfen ob das Ziel ein Block ist
    const isBlock = blocks.some((b) => b.id === targetBlockId)
    if (!isBlock) return

    try {
      await assignProducts.mutateAsync({ itemIds: [itemId], blockId: targetBlockId })
      toast.success('Produkt zugewiesen')
    } catch {
      toast.error('Fehler beim Zuweisen')
    }
  }, [blocks, assignProducts])

  return (
    <>
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* === LINKE SEITE: Warengruppen === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Warengruppen</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setBlockName(''); setShowAddBlock(true) }}>
            <Plus className="h-3 w-3 mr-1" /> Neue Gruppe
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {blocks.map((block) => (
                <DroppableBlock
                  key={block.id}
                  blockId={block.id}
                  name={block.name}
                  count={blockItemCounts.get(block.id) ?? 0}
                  isSelected={selectedBlockId === block.id}
                  isDropTarget={draggingItem !== null}
                  onClick={() => handleBlockSelect(block.id)}
                />
              ))}
              {/* Ohne Zuordnung */}
              <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground border-t border-border mt-2 pt-2">
                <span className="italic">Ohne Zuordnung</span>
                <span className="text-xs">({unassignedCount})</span>
              </div>
            </div>
          </ScrollArea>

          {/* Aktionen für ausgewählte Gruppe */}
          {selectedBlock && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBlockName(selectedBlock.name)
                  setShowRenameBlock(true)
                }}
              >
                <Pencil className="h-3 w-3 mr-1" /> Umbenennen
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeleteBlock}>
                <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Löschen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === RECHTE SEITE: Produkte === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Produkte</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Name oder PLU suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <ScrollArea className="h-[300px]">
            <div className="space-y-0.5">
              {filteredItems.map((item) => {
                const isChecked = checkedIds.has(item.id)
                const assignedBlock = item.block_id ? blocks.find((b) => b.id === item.block_id) : null
                const isOtherBlock = assignedBlock && assignedBlock.id !== selectedBlockId

                return (
                  <DraggableProduct
                    key={item.id}
                    item={item}
                    isChecked={isChecked}
                    onToggle={() => toggleItem(item.id)}
                    assignedBlockName={assignedBlock?.name}
                    isOtherBlock={!!isOtherBlock}
                  />
                )
              })}
            </div>
          </ScrollArea>

          {/* Aktions-Buttons */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={!selectedBlockId || checkedIds.size === 0 || assignProducts.isPending}
              className="flex-1"
            >
              {assignProducts.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Auswahl → {selectedBlock?.name ?? '...'} zuweisen</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCheckedIds(new Set())}
            >
              Alle abwählen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DragOverlay */}
      <DragOverlay>
        {draggingItem && (
          <div className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-background border border-border shadow-lg">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">{draggingItem.plu}</span>
            <span className="truncate">{draggingItem.display_name ?? draggingItem.system_name}</span>
          </div>
        )}
      </DragOverlay>
    </div>
    </DndContext>

      {/* Dialog: Neuer Block */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Warengruppe</DialogTitle>
            <DialogDescription>Gib einen Namen für die neue Warengruppe ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              placeholder='z.B. "Obst" oder "Exotik"'
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateBlock} disabled={createBlock.isPending || !blockName.trim()}>
              {createBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Umbenennen */}
      <Dialog open={showRenameBlock} onOpenChange={setShowRenameBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warengruppe umbenennen</DialogTitle>
            <DialogDescription>Ändere den Namen der ausgewählten Warengruppe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Neuer Name</Label>
            <Input
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRenameBlock} disabled={updateBlock.isPending || !blockName.trim()}>
              {updateBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// DroppableBlock: Eine Warengruppe als Drop-Ziel
// ============================================================

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
      onClick={onClick}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : isOver
            ? 'bg-primary/20 ring-2 ring-primary/40'
            : isDropTarget
              ? 'bg-muted/50 border border-dashed border-primary/30'
              : 'hover:bg-muted',
      )}
    >
      <span className="font-medium">{name}</span>
      <span className={cn(
        'text-xs',
        isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
      )}>
        ({count})
      </span>
    </div>
  )
}

// ============================================================
// DraggableProduct: Ein Produkt als ziehbares Element
// ============================================================

function DraggableProduct({
  item,
  isChecked,
  onToggle,
  assignedBlockName,
  isOtherBlock,
}: {
  item: MasterPLUItem
  isChecked: boolean
  onToggle: () => void
  assignedBlockName?: string
  isOtherBlock: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded text-sm',
        isDragging ? 'opacity-30' : '',
        isChecked ? 'bg-primary/5' : 'hover:bg-muted/50',
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Checkbox checked={isChecked} onCheckedChange={onToggle} />
      <span className="font-mono text-xs text-muted-foreground w-[50px] shrink-0">
        {getDisplayPlu(item.plu)}
      </span>
      <span className="flex-1 truncate">
        {item.display_name ?? item.system_name}
      </span>
      {assignedBlockName && (
        <Badge variant={isOtherBlock ? 'secondary' : 'default'} className="text-[10px] shrink-0">
          {assignedBlockName}
        </Badge>
      )}
    </div>
  )
}
