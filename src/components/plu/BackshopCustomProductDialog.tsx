// Backshop: Dialog zum Anlegen eines eigenen Produkts (PLU, Name, Bild Pflicht).
// Warengruppe layoutabhängig: bei BY_BLOCK Pflicht inkl. „Neue Warengruppe erstellen“, bei ALPHABETICAL entfällt sie.

import { useState, useCallback, useRef, useMemo } from 'react'
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
import { useAddBackshopCustomProduct } from '@/hooks/useBackshopCustomProducts'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useCreateBackshopBlock } from '@/hooks/useBackshopBlocks'
import { useAuth } from '@/hooks/useAuth'
import { uploadBackshopImage } from '@/lib/backshop-storage'
import { toast } from 'sonner'
import { X, ArrowLeftRight, Camera } from 'lucide-react'
import type { BackshopBlock } from '@/types/database'
import { useBackshopBlockRules } from '@/hooks/useBackshopBlocks'

interface BackshopCustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingPLUs: Set<string>
  blocks: BackshopBlock[]
}

export function BackshopCustomProductDialog({
  open,
  onOpenChange,
  existingPLUs,
  blocks,
}: BackshopCustomProductDialogProps) {
  const { user } = useAuth()
  const addProduct = useAddBackshopCustomProduct()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const createBlock = useCreateBackshopBlock()
  const { data: blockRules = [] } = useBackshopBlockRules()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'

  // NAME_CONTAINS-Regeln für Vorauswahl der Warengruppe anhand Artikelname
  const nameContainsRules = useMemo(
    () => blockRules.filter((r) => r.rule_type === 'NAME_CONTAINS' && r.value?.trim()),
    [blockRules],
  )

  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [blockId, setBlockId] = useState('')
  const [showNewBlockInput, setShowNewBlockInput] = useState(false)
  const [newBlockName, setNewBlockName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [errorPopup, setErrorPopup] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setPlu('')
    setName('')
    setImageFile(null)
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setBlockId('')
    setShowNewBlockInput(false)
    setNewBlockName('')
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    resetForm()
  }, [onOpenChange, resetForm])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien (z. B. JPEG, PNG) sind erlaubt.')
      return
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, image: '' }))
  }, [imagePreview])

  const clearImage = useCallback(() => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    setErrors((prev) => ({ ...prev, image: '' }))
  }, [imagePreview])

  const handleCreateBlock = useCallback(async () => {
    const nameTrimmed = newBlockName.trim()
    if (!nameTrimmed) return
    try {
      const maxOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.order_index), 0) : 0
      const created = await createBlock.mutateAsync({
        name: nameTrimmed,
        order_index: maxOrder + 1,
      })
      setBlockId(created.id)
      setNewBlockName('')
      setShowNewBlockInput(false)
      setErrors((prev) => ({ ...prev, block_id: '' }))
      toast.success('Warengruppe erstellt')
    } catch {
      // Toast im Hook
    }
  }, [newBlockName, blocks, createBlock])

  const handleSubmit = useCallback(async () => {
    const err: Record<string, string> = {}
    if (!plu.trim() || plu.trim().length < 4 || plu.trim().length > 5) {
      err.plu = 'PLU muss 4 oder 5 Ziffern haben.'
    } else if (!/^\d+$/.test(plu.trim())) {
      err.plu = 'PLU darf nur Ziffern enthalten.'
    } else if (existingPLUs.has(plu.trim())) {
      err.plu = `PLU ${plu.trim()} existiert bereits.`
    }
    if (!name.trim() || name.trim().length < 2) err.name = 'Mindestens 2 Zeichen.'
    if (!imageFile && !imagePreview) err.image = 'Bild ist Pflicht.'
    if (sortMode === 'BY_BLOCK' && !blockId.trim()) {
      err.block_id = 'Bitte Warengruppe auswählen oder anlegen.'
    }

    if (Object.keys(err).length > 0) {
      setErrors(err)
      return
    }

    if (!user) {
      setErrorPopup('Nicht eingeloggt.')
      return
    }

    try {
      let imageUrl: string
      if (imageFile) {
        imageUrl = await uploadBackshopImage(imageFile, `custom/${user.id}`)
      } else if (imagePreview) {
        setErrorPopup('Bitte wähle ein Bild aus.')
        return
      } else {
        setErrorPopup('Bild ist Pflicht.')
        return
      }

      await addProduct.mutateAsync({
        plu: plu.trim(),
        name: name.trim(),
        image_url: imageUrl,
        block_id: sortMode === 'BY_BLOCK' ? blockId || null : null,
      })
      handleClose()
    } catch (e) {
      setErrorPopup(e instanceof Error ? e.message : 'Unbekannter Fehler')
    }
  }, [plu, name, imageFile, imagePreview, blockId, sortMode, existingPLUs, user, addProduct, handleClose])

  const pluError = (() => {
    if (plu.length === 0) return undefined
    if (!/^\d{0,5}$/.test(plu)) return 'Nur Ziffern erlaubt'
    if (plu.length >= 4 && plu.length <= 5 && existingPLUs.has(plu)) return `PLU ${plu} existiert bereits`
    if (plu.length > 0 && plu.length < 4) return 'PLU muss 4 oder 5 Ziffern haben'
    return undefined
  })()

  const canSubmit =
    plu.trim().length >= 4 &&
    plu.trim().length <= 5 &&
    !existingPLUs.has(plu.trim()) &&
    name.trim().length >= 2 &&
    !!imageFile &&
    (sortMode !== 'BY_BLOCK' || !!blockId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eigenes Produkt (Backshop) hinzufügen</DialogTitle>
          <DialogDescription>
            PLU (4–5 Ziffern), Name und ein Bild sind Pflicht.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="backshop-plu">PLU (4–5 Ziffern)</Label>
            <Input
              id="backshop-plu"
              placeholder="z.B. 40500"
              value={plu}
              onChange={(e) => {
                setPlu(e.target.value.replace(/\D/g, '').slice(0, 5))
                setErrors((prev) => ({ ...prev, plu: '' }))
              }}
              maxLength={5}
              className={pluError || errors.plu ? 'border-destructive' : ''}
            />
            {(pluError || errors.plu) && (
              <p className="text-sm text-destructive">{pluError || errors.plu}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="backshop-name">Artikelname</Label>
            <Input
              id="backshop-name"
              placeholder="z.B. Croissant"
              value={name}
              onChange={(e) => {
                const newName = e.target.value
                setName(newName)
                setErrors((prev) => ({ ...prev, name: '' }))
                // Warengruppe vorauswählen, wenn Artikelname ein Schlagwort enthält
                if (sortMode === 'BY_BLOCK' && newName.trim()) {
                  const needle = newName.trim()
                  const needleLower = needle.toLowerCase()
                  const matched = nameContainsRules.find((r) => {
                    const keyword = (r.value ?? '').trim()
                    if (!keyword) return false
                    return r.case_sensitive
                      ? needle.includes(keyword)
                      : needleLower.includes(keyword.toLowerCase())
                  })
                  if (matched) setBlockId(matched.block_id)
                }
              }}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Bild (Pflicht)</Label>
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
            <div className="flex items-center gap-2 flex-wrap">
              {imagePreview ? (
                <>
                  <div className="relative shrink-0">
                    <img
                      src={imagePreview}
                      alt="Vorschau"
                      className="h-20 w-20 object-cover rounded-lg border border-border bg-muted/30"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-1 shadow-sm border border-border hover:bg-muted"
                      aria-label="Bild entfernen"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Anderes Bild wählen"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => cameraInputRef.current?.click()}
                      aria-label="Foto aufnehmen"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Bild wählen
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
                </>
              )}
            </div>
            {errors.image && <p className="text-sm text-destructive">{errors.image}</p>}
          </div>

          {sortMode === 'BY_BLOCK' && (
            <div className="space-y-2">
              <Label>Warengruppe</Label>
              {!showNewBlockInput ? (
                <>
                  <Select
                    value={blockId}
                    onValueChange={(v) => {
                      setBlockId(v)
                      setErrors((prev) => ({ ...prev, block_id: '' }))
                    }}
                  >
                    <SelectTrigger className={errors.block_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Warengruppe wählen" />
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => setShowNewBlockInput(true)}
                  >
                    Neue Warengruppe erstellen
                  </Button>
                  {errors.block_id && (
                    <p className="text-sm text-destructive">{errors.block_id}</p>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="z.B. Brötchen"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBlock()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateBlock}
                    disabled={createBlock.isPending || !newBlockName.trim()}
                  >
                    Anlegen
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewBlockInput(false)
                      setNewBlockName('')
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              )}
            </div>
          )}

          {errorPopup && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2">
              {errorPopup}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => setErrorPopup(null)}
              >
                Schließen
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose()}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addProduct.isPending || !canSubmit}
          >
            {addProduct.isPending ? 'Wird hinzugefügt…' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
