// Backshop: Eigenes Produkt bearbeiten (Name, optional Bild ersetzen)

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateBackshopCustomProduct } from '@/hooks/useBackshopCustomProducts'
import { useAuth } from '@/hooks/useAuth'
import { uploadBackshopImage } from '@/lib/backshop-storage'
import { toast } from 'sonner'
import { ImagePlus, Trash2, Camera } from 'lucide-react'
import type { BackshopBlock } from '@/types/database'
import type { BackshopCustomProduct } from '@/types/database'

interface EditBackshopCustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: BackshopCustomProduct
  blocks: BackshopBlock[]
}

export function EditBackshopCustomProductDialog({
  open,
  onOpenChange,
  product,
  blocks,
}: EditBackshopCustomProductDialogProps) {
  const { user } = useAuth()
  const updateProduct = useUpdateBackshopCustomProduct()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(product.name)
  const [blockId, setBlockId] = useState(product.block_id ?? '')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [errorPopup, setErrorPopup] = useState<string | null>(null)

  const currentImageUrl = newImagePreview ?? product.image_url
  const hasNewImage = !!newImageFile || !!newImagePreview

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien (z. B. JPEG, PNG) sind erlaubt.')
      return
    }
    setNewImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setNewImageFile(file)
  }, [])

  const clearNewImage = useCallback(() => {
    setNewImageFile(null)
    setNewImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) return

    try {
      let imageUrl: string | undefined
      if (newImageFile && user) {
        imageUrl = await uploadBackshopImage(newImageFile, `custom/${user.id}`)
      }

      await updateProduct.mutateAsync({
        id: product.id,
        name: name.trim(),
        ...(imageUrl !== undefined && { image_url: imageUrl }),
        block_id: blockId || null,
      })
      onOpenChange(false)
    } catch (e) {
      setErrorPopup(e instanceof Error ? e.message : 'Unbekannter Fehler')
    }
  }, [product.id, name, blockId, newImageFile, user, updateProduct, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eigenes Produkt (Backshop) bearbeiten</DialogTitle>
          <DialogDescription>
            Name und optional Bild anpassen. PLU kann nicht geändert werden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
            PLU: {product.plu}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-backshop-name">Artikelname</Label>
            <Input
              id="edit-backshop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Croissant"
            />
          </div>

          <div className="space-y-2">
            <Label>Bild</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
              aria-label="Foto aufnehmen"
            />
            <div className="flex items-center gap-3 flex-wrap">
              {currentImageUrl && (
                <img
                  src={currentImageUrl}
                  alt=""
                  className="h-20 w-20 object-contain rounded border border-border"
                />
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  {hasNewImage ? 'Anderes Bild' : 'Bild ersetzen'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Foto aufnehmen
                </Button>
                {hasNewImage && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearNewImage}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          </div>

          {blocks.length > 0 && (
            <div className="space-y-2">
              <Label>Warengruppe</Label>
              <Select value={blockId} onValueChange={setBlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Keine" />
                </SelectTrigger>
                <SelectContent>
                  {blocks
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {errorPopup && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2 flex items-center justify-between">
              <span>{errorPopup}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setErrorPopup(null)}>
                Schließen
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateProduct.isPending || !name.trim() || name.trim().length < 2}
          >
            {updateProduct.isPending ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
