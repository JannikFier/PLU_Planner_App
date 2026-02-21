// RenameDialog: Dialog zum Umbenennen von Produkten (Custom + Master; Backshop inkl. Bild)

import { useState, useCallback, useRef } from 'react'
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
import { useRenameBackshopMasterProduct, useResetBackshopProductName } from '@/hooks/useBackshopRename'
import { useAuth } from '@/hooks/useAuth'
import { uploadBackshopImage } from '@/lib/backshop-storage'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { DisplayItem } from '@/types/plu'

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DisplayItem | null
  /** Bei 'backshop': Backshop-RPCs + Bild hochladen/ersetzen/entfernen */
  listType?: 'default' | 'backshop'
}

/** Inhalt mit key={item.id}; bei listType backshop: Bild-Bereich + Backshop-Hooks */
function RenameDialogForm({
  item,
  onOpenChange,
  listType = 'default',
}: {
  item: DisplayItem
  onOpenChange: (open: boolean) => void
  listType?: 'default' | 'backshop'
}) {
  const [newName, setNewName] = useState(item.display_name)
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateCustom = useUpdateCustomProduct()
  const renameMaster = useRenameMasterProduct()
  const resetName = useResetProductName()
  const renameBackshop = useRenameBackshopMasterProduct()
  const resetBackshop = useResetBackshopProductName()

  const isBackshop = listType === 'backshop'
  const isCustom = item.is_custom
  const canReset = !isCustom && item.is_manually_renamed

  // Backshop: Bild-Status – 'keep' | 'remove' | { url: string } (neu hochgeladen)
  const [imageState, setImageState] = useState<'keep' | 'remove' | { url: string }>('keep')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)

  const showImagePreview = newImagePreview ?? (imageState === 'keep' ? item.image_url : null) ?? (imageState !== 'remove' && typeof imageState === 'object' ? imageState.url : null)

  const onBackshopImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien erlaubt.')
      return
    }
    setNewImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setNewImageFile(file)
    setImageState('keep')
  }, [])

  const clearBackshopNewImage = useCallback(() => {
    setNewImageFile(null)
    setNewImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setImageState('keep')
  }, [])

  const handleSave = async () => {
    if (!newName.trim() || newName.trim().length < 2) return

    try {
      if (isCustom && !isBackshop) {
        await updateCustom.mutateAsync({ id: item.id, name: newName.trim() })
        onOpenChange(false)
        return
      }
      if (isBackshop && !isCustom) {
        let new_image_url: string | '' | undefined = undefined
        if (newImageFile && user) {
          new_image_url = await uploadBackshopImage(newImageFile, `renamed/${user.id}`)
        } else if (imageState === 'remove') {
          new_image_url = ''
        }
        await renameBackshop.mutateAsync({
          item_id: item.id,
          new_display_name: newName.trim(),
          new_image_url,
        })
        onOpenChange(false)
        return
      }
      if (!isBackshop) {
        await renameMaster.mutateAsync({ id: item.id, displayName: newName.trim() })
        onOpenChange(false)
      }
    } catch {
      // Toast im Hook
    }
  }

  const handleReset = async () => {
    try {
      if (isBackshop) {
        await resetBackshop.mutateAsync({ item_id: item.id, system_name: item.system_name })
      } else {
        await resetName.mutateAsync({ id: item.id, systemName: item.system_name })
      }
      onOpenChange(false)
    } catch {
      // Toast im Hook
    }
  }

  const isPending =
    updateCustom.isPending ||
    renameMaster.isPending ||
    resetName.isPending ||
    renameBackshop.isPending ||
    resetBackshop.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isCustom ? 'Eigenes Produkt umbenennen' : 'Produkt umbenennen'}
        </DialogTitle>
        <DialogDescription>
          Name für PLU {getDisplayPlu(item.plu)} anpassen.
          {isBackshop && ' Optional: Bild ersetzen oder entfernen.'}
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

        {isBackshop && !isCustom && (
          <div className="space-y-2">
            <Label>Bild</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onBackshopImageFileChange}
            />
            <div className="flex items-center gap-3 flex-wrap">
              {showImagePreview && (
                <img
                  src={showImagePreview}
                  alt=""
                  className="h-20 w-20 object-contain rounded border border-border"
                />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  {newImageFile ? 'Anderes Bild' : 'Bild ersetzen'}
                </Button>
                {(item.image_url || newImageFile) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImageState('remove')
                      clearBackshopNewImage()
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Bild entfernen
                  </Button>
                )}
                {imageState === 'remove' && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setImageState('keep')}>
                    Änderung rückgängig
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
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
 * - Custom: Name ändern
 * - Master (Obst/Gemüse): display_name + is_manually_renamed
 * - Backshop (listType backshop): display_name + optional Bild hochladen/ersetzen/entfernen
 */
export function RenameDialog({ open, onOpenChange, item, listType = 'default' }: RenameDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={listType === 'backshop' ? 'sm:max-w-[500px]' : 'sm:max-w-[400px]'}>
        <RenameDialogForm key={item.id} item={item} onOpenChange={onOpenChange} listType={listType} />
      </DialogContent>
    </Dialog>
  )
}
