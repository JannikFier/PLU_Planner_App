// RenameDialog: Dialog zum Umbenennen von Produkten (Custom + Master)

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateCustomProduct } from '@/hooks/useCustomProducts'
import { useRenameMasterProduct, useResetProductName } from '@/hooks/useCustomProducts'
import { getDisplayPlu } from '@/lib/plu-helpers'
import type { DisplayItem } from '@/types/plu'

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DisplayItem | null
}

/** Inhalt mit key={item.id}, damit bei Wechsel des Items State neu initialisiert wird (ohne Effect). */
function RenameDialogForm({
  item,
  onOpenChange,
}: {
  item: DisplayItem
  onOpenChange: (open: boolean) => void
}) {
  const [newName, setNewName] = useState(item.display_name)

  const updateCustom = useUpdateCustomProduct()
  const renameMaster = useRenameMasterProduct()
  const resetName = useResetProductName()

  const isCustom = item.is_custom
  const canReset = !isCustom && item.is_manually_renamed

  const handleSave = async () => {
    if (!newName.trim() || newName.trim().length < 2) return

    try {
      if (isCustom) {
        await updateCustom.mutateAsync({ id: item.id, name: newName.trim() })
      } else {
        await renameMaster.mutateAsync({ id: item.id, displayName: newName.trim() })
      }
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }

  const handleReset = async () => {
    try {
      await resetName.mutateAsync({ id: item.id, systemName: item.system_name })
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }

  const isPending = updateCustom.isPending || renameMaster.isPending || resetName.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isCustom ? 'Eigenes Produkt umbenennen' : 'Produkt umbenennen'}
        </DialogTitle>
        <DialogDescription>
          Name für PLU {getDisplayPlu(item.plu)} anpassen.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground">
          PLU: <span className="font-mono font-medium">{getDisplayPlu(item.plu)}</span>
        </div>

        {!isCustom && (
          <div className="text-sm text-muted-foreground">
            Original: <span className="font-medium">{item.system_name}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="rename-input">Neuer Name</Label>
          <Input
            id="rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Artikelname eingeben"
            autoFocus
          />
        </div>
      </div>

      <DialogFooter className="flex justify-between sm:justify-between">
        <div>
          {canReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="text-muted-foreground"
            >
              Zurücksetzen
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !newName.trim() || newName.trim().length < 2}
          >
            {isPending ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

/**
 * Dialog zum Umbenennen eines Produkts.
 * - Custom Products: Name ändern (Ersteller oder Super-Admin)
 * - Master Products: display_name ändern + is_manually_renamed setzen (nur Super-Admin)
 */
export function RenameDialog({ open, onOpenChange, item }: RenameDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <RenameDialogForm key={item.id} item={item} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}
