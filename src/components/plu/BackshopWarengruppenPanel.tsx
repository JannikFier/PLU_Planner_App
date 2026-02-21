// BackshopWarengruppenPanel: Warengruppen für Backshop-Liste (Split-Panel, DnD)

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
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Plus, Trash2, Pencil, Search, Loader2, GripVertical } from 'lucide-react'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import {
  useBackshopBlocks,
  useCreateBackshopBlock,
  useUpdateBackshopBlock,
  useDeleteBackshopBlock,
  useAssignBackshopProducts,
} from '@/hooks/useBackshopBlocks'
import type { BackshopMasterPLUItem } from '@/types/database'

export function BackshopWarengruppenPanel() {
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: items = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()
  const createBlock = useCreateBackshopBlock()
  const updateBlock = useUpdateBackshopBlock()
  const deleteBlock = useDeleteBackshopBlock()
  const assignProducts = useAssignBackshopProducts()

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showRenameBlock, setShowRenameBlock] = useState(false)
  const [showDeleteBlockConfirm, setShowDeleteBlockConfirm] = useState(false)
  const [blockName, setBlockName] = useState('')

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  const blockItemCounts = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const item of items) {
      const key = item.block_id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [items])

  /** Rechte Spalte: ohne Auswahl = nur Unzugeordnete, mit Auswahl = nur Produkte dieser Gruppe; danach Suche. */
  const rightColumnItems = useMemo(() => {
    const scope =
      selectedBlockId === null
        ? items.filter((i) => i.block_id == null)
        : items.filter((i) => i.block_id === selectedBlockId)
    if (!search.trim()) return scope
    const lower = search.toLowerCase()
    return scope.filter(
      (item) =>
        item.system_name.toLowerCase().includes(lower) ||
        item.plu.includes(lower),
    )
  }, [items, search, selectedBlockId])

  const rightColumnCount = rightColumnItems.length
  const rightColumnLabel =
    selectedBlockId === null
      ? `Nur unzugeordnete Produkte (${rightColumnCount} Stück)`
      : selectedBlock
        ? `Produkte in ${selectedBlock.name} (${rightColumnCount} Stück)`
        : `Produkte (${rightColumnCount} Stück)`

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

  const toggleItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

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

  const handleUnassign = async () => {
    if (checkedIds.size === 0) return
    try {
      await assignProducts.mutateAsync({
        itemIds: Array.from(checkedIds),
        blockId: null,
      })
      toast.success(`Zuordnung bei ${checkedIds.size} Produkt(en) aufgehoben`)
      setCheckedIds(new Set())
    } catch {
      toast.error('Fehler beim Aufheben')
    }
  }

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

  const handleDeleteBlockClick = () => {
    if (selectedBlockId) setShowDeleteBlockConfirm(true)
  }

  const handleDeleteBlockConfirm = async () => {
    if (!selectedBlockId) return
    try {
      await deleteBlock.mutateAsync(selectedBlockId)
      setSelectedBlockId(null)
      setCheckedIds(new Set())
      setShowDeleteBlockConfirm(false)
      toast.success('Warengruppe gelöscht')
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const unassignedCount = blockItemCounts.get(null) ?? 0

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [draggingItem, setDraggingItem] = useState<BackshopMasterPLUItem | null>(null)

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Warengruppen (Backshop)</CardTitle>
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
                  <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground border-t border-border mt-2 pt-2">
                    <span className="italic">Ohne Zuordnung</span>
                    <span className="text-xs">({unassignedCount})</span>
                  </div>
                </div>
              </ScrollArea>
              {selectedBlock && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => { setBlockName(selectedBlock.name); setShowRenameBlock(true) }}>
                    <Pencil className="h-3 w-3 mr-1" /> Umbenennen
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeleteBlockClick}>
                    <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Löschen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Produkte</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{rightColumnLabel}</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Nach Name oder PLU suchen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  aria-label="Suche"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-0.5">
                  {rightColumnItems.map((item) => {
                    const isChecked = checkedIds.has(item.id)
                    const assignedBlock = item.block_id ? blocks.find((b) => b.id === item.block_id) : null
                    const isOtherBlock = assignedBlock && assignedBlock.id !== selectedBlockId
                    return (
                      <DraggableBackshopProduct
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
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAssign}
                    disabled={!selectedBlockId || checkedIds.size === 0 || assignProducts.isPending}
                    className="flex-1"
                  >
                    {assignProducts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Auswahl → {selectedBlock?.name ?? '...'} zuweisen</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCheckedIds(new Set())}>
                    Alle abwählen
                  </Button>
                </div>
                {selectedBlockId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={handleUnassign}
                    disabled={checkedIds.size === 0 || assignProducts.isPending}
                  >
                    Zuordnung aufheben
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <DragOverlay modifiers={[snapCenterToCursor]}>
            {draggingItem && (
              <div className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-background border border-border shadow-lg">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">{draggingItem.plu}</span>
                <span className="break-words min-w-0 max-w-[200px]">{draggingItem.display_name ?? draggingItem.system_name}</span>
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>

      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Warengruppe (Backshop)</DialogTitle>
            <DialogDescription>Gib einen Namen für die neue Warengruppe ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder='z.B. "Brote" oder "Süßes"' />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateBlock} disabled={createBlock.isPending || !blockName.trim()}>
              {createBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameBlock} onOpenChange={setShowRenameBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warengruppe umbenennen</DialogTitle>
            <DialogDescription>Ändere den Namen der ausgewählten Warengruppe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Neuer Name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleRenameBlock} disabled={updateBlock.isPending || !blockName.trim()}>
              {updateBlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteBlockConfirm} onOpenChange={setShowDeleteBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warengruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{selectedBlock?.name}&quot; wirklich löschen? Produkte verlieren nur die Zuordnung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBlockConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      onClick={onClick}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm transition-colors',
        isSelected ? 'bg-primary text-primary-foreground' : isOver ? 'bg-primary/20 ring-2 ring-primary/40' : isDropTarget ? 'bg-muted/50 border border-dashed border-primary/30' : 'hover:bg-muted',
      )}
    >
      <span className="font-medium">{name}</span>
      <span className={cn('text-xs', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>({count})</span>
    </div>
  )
}

function DraggableBackshopProduct({
  item,
  isChecked,
  onToggle,
  assignedBlockName,
  isOtherBlock,
}: {
  item: BackshopMasterPLUItem
  isChecked: boolean
  onToggle: () => void
  assignedBlockName?: string
  isOtherBlock: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      className={cn('flex items-center gap-2 px-2 py-1 rounded text-sm', isDragging ? 'opacity-30' : '', isChecked ? 'bg-primary/5' : 'hover:bg-muted/50')}
    >
      <button className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0" {...attributes} {...listeners}>
        <GripVertical className="h-3 w-3" />
      </button>
      <Checkbox checked={isChecked} onCheckedChange={onToggle} />
      <span className="font-mono text-xs text-muted-foreground w-[50px] shrink-0">{getDisplayPlu(item.plu)}</span>
      <span className="flex-1 break-words min-w-0">{item.display_name ?? item.system_name}</span>
      {assignedBlockName && (
        <Badge variant={isOtherBlock ? 'secondary' : 'default'} className="text-[10px] shrink-0">
          {assignedBlockName}
        </Badge>
      )}
    </div>
  )
}
