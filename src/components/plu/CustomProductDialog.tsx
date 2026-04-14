// CustomProductDialog: Dialog zum Hinzufügen eigener Produkte (Obst/Gemüse).
// Pflichtfelder: SEPARATED → Typ; BY_BLOCK + features_blocks → Warengruppe.

import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'
import {
  AlertDialog,
  AlertDialogAction,
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
import { useAddCustomProduct } from '@/hooks/useCustomProducts'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useCreateBlock } from '@/hooks/useBlocks'
import { generatePriceOnlyPlu } from '@/lib/plu-helpers'
import {
  OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE,
  obstCustomProductShowBlockField,
  obstCustomProductShowItemTypeField,
} from '@/lib/obst-custom-product-layout'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import type { Block } from '@/types/database'

// PLU optional, 4–5 Ziffern wenn ausgefüllt; Preis optional, Dezimalzahl
const pluSchema = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ?? '') || null)
  .refine((v) => v === null || /^\d{4,5}$/.test(v), 'PLU muss 4 oder 5 Ziffern haben')

const preisSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.trim() === '') return null
    const num = parseFloat(v.replace(',', '.'))
    if (isNaN(num) || num < 0) return null
    return Math.round(num * 100) / 100 // Max 2 Dezimalstellen
  })

const customProductBaseSchema = z.object({
  plu: pluSchema,
  name: z
    .string()
    .min(2, 'Mindestens 2 Zeichen')
    .max(100, 'Maximal 100 Zeichen'),
  preis: preisSchema,
})

interface CustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Bereits vergebene PLUs (Master + Custom) für Duplikat-Prüfung */
  existingPLUs: Set<string>
  /** Verfügbare Warengruppen/Blöcke */
  blocks: Block[]
}

export function CustomProductDialog({
  open,
  onOpenChange,
  existingPLUs,
  blocks,
}: CustomProductDialogProps) {
  const { isAdmin } = useAuth()
  const addProduct = useAddCustomProduct()
  const { data: layoutSettings } = useLayoutSettings()
  const createBlock = useCreateBlock()
  const showItemTypeField = useMemo(
    () => obstCustomProductShowItemTypeField(layoutSettings),
    [layoutSettings],
  )
  const showBlockField = useMemo(
    () => obstCustomProductShowBlockField(layoutSettings),
    [layoutSettings],
  )

  const [plu, setPlu] = useState('')
  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<'PIECE' | 'WEIGHT' | ''>('')
  const [preis, setPreis] = useState('')
  const [blockId, setBlockId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showNewBlockInput, setShowNewBlockInput] = useState(false)
  const [newBlockName, setNewBlockName] = useState('')
  const [errorPopupMessage, setErrorPopupMessage] = useState<string | null>(null)

  /** Nur für Admins: „Neue Warengruppe“-Eingabe; ohne Effect (kein setState in useEffect). */
  const showNewBlockSection = isAdmin && showNewBlockInput

  const resetForm = useCallback(() => {
    setPlu('')
    setName('')
    setItemType('')
    setPreis('')
    setBlockId('')
    setErrors({})
    setShowNewBlockInput(false)
    setNewBlockName('')
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    resetForm()
  }, [onOpenChange, resetForm])

  // PLU-Duplikat-Prüfung in Echtzeit (4 oder 5 Ziffern)
  const pluError = (() => {
    if (plu.length === 0) return undefined
    if (!/^\d{0,5}$/.test(plu)) return 'Nur Ziffern erlaubt'
    if (plu.length >= 4 && plu.length <= 5 && existingPLUs.has(plu)) return `PLU ${plu} existiert bereits`
    if (plu.length > 0 && plu.length < 4) return 'PLU muss 4 oder 5 Ziffern haben'
    return undefined
  })()

  const handleSubmit = useCallback(async () => {
    const baseResult = customProductBaseSchema.safeParse({ plu, name, preis })
    if (!baseResult.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of baseResult.error.issues) {
        const field = issue.path[0]?.toString() ?? 'general'
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    const hasPlu = baseResult.data.plu != null && baseResult.data.plu !== ''
    const hasPreis = baseResult.data.preis != null

    if (hasPlu && hasPreis) {
      setErrors({ plu: 'Bitte entweder PLU oder Preis angeben, nicht beides.' })
      return
    }
    if (!hasPlu && !hasPreis) {
      setErrors({ plu: 'Bitte PLU oder Preis angeben.' })
      return
    }

    if (showBlockField) {
      if (!blockId.trim()) {
        setErrors({ block_id: 'Bitte Warengruppe auswählen oder anlegen.' })
        return
      }
    }
    if (showItemTypeField) {
      if (!itemType) {
        setErrors({ item_type: 'Bitte Typ (Stück/Gewicht) auswählen.' })
        return
      }
    }

    const pluVal = baseResult.data.plu
    if (hasPlu && pluVal != null && existingPLUs.has(pluVal)) {
      setErrors({ plu: `PLU ${pluVal} existiert bereits` })
      return
    }

    const item_type: 'PIECE' | 'WEIGHT' = showItemTypeField
      ? itemType === 'WEIGHT'
        ? 'WEIGHT'
        : 'PIECE'
      : OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE
    const block_id = showBlockField ? blockId : undefined

    const pluToSave = hasPlu && baseResult.data.plu != null ? baseResult.data.plu : generatePriceOnlyPlu()
    const preisToSave = hasPreis && baseResult.data.preis != null ? baseResult.data.preis : null

    try {
      await addProduct.mutateAsync({
        plu: pluToSave,
        name: baseResult.data.name,
        item_type,
        preis: preisToSave,
        block_id: block_id || undefined,
      })
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setErrorPopupMessage(msg)
    }
  }, [
    plu,
    name,
    itemType,
    preis,
    blockId,
    showBlockField,
    showItemTypeField,
    existingPLUs,
    addProduct,
    handleClose,
  ])

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
    } catch {
      toast.error('Warengruppe konnte nicht angelegt werden.')
    }
  }, [newBlockName, blocks, createBlock])

  // Genau eines von PLU (4–5 Ziffern) oder Preis muss ausgefüllt sein
  const hasValidPlu =
    plu.trim().length >= 4 &&
    plu.trim().length <= 5 &&
    !pluError &&
    !existingPLUs.has(plu.trim())
  const preisNum = preis.trim() ? parseFloat(preis.replace(',', '.')) : NaN
  const hasValidPreis = !isNaN(preisNum) && preisNum >= 0
  const hasExactlyOne = (hasValidPlu && !hasValidPreis) || (!hasValidPlu && hasValidPreis)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eigenes Produkt hinzufügen</DialogTitle>
          <DialogDescription>
            PLU (4–5 Ziffern) oder Preis – bitte eines davon angeben.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <div className="space-y-4 py-4">
          {/* PLU-Nummer */}
          <div className="space-y-2">
            <Label htmlFor="plu">PLU (4–5 Ziffern)</Label>
            <Input
              id="plu"
              placeholder="z.B. 40500"
              value={plu}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                setPlu(val)
                setErrors((prev) => ({ ...prev, plu: '' }))
              }}
              maxLength={5}
              className={pluError || errors.plu ? 'border-destructive' : ''}
            />
            {(pluError || errors.plu) && (
              <p className="text-sm text-destructive">{pluError || errors.plu}</p>
            )}
          </div>

          {/* Artikelname */}
          <div className="space-y-2">
            <Label htmlFor="name">Artikelname</Label>
            <Input
              id="name"
              placeholder="z.B. Avocado"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: '' }))
              }}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Typ nur bei getrennter Stück/Gewicht-Darstellung (Layout) */}
          {showItemTypeField && (
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                value={itemType}
                onValueChange={(v) => {
                  setItemType(v as 'PIECE' | 'WEIGHT')
                  setErrors((prev) => ({ ...prev, item_type: '' }))
                }}
              >
                <SelectTrigger className={errors.item_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIECE">Stück</SelectItem>
                  <SelectItem value="WEIGHT">Gewicht</SelectItem>
                </SelectContent>
              </Select>
              {errors.item_type && (
                <p className="text-sm text-destructive">{errors.item_type}</p>
              )}
            </div>
          )}

          {/* Preis (alternativ zu PLU) */}
          <div className="space-y-2">
            <Label htmlFor="preis">Preis (statt PLU)</Label>
            <div className="relative">
              <Input
                id="preis"
                placeholder="z.B. 1,50"
                value={preis}
                onChange={(e) => {
                  setPreis(e.target.value)
                  setErrors((prev) => ({ ...prev, plu: '' }))
                }}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                EUR
              </span>
            </div>
          </div>

          {/* Warengruppe: nur bei Sortierung nach Blöcken + Feature Warengruppen */}
          {showBlockField && (
            <div className="space-y-2">
              <Label>Warengruppe</Label>
              {!showNewBlockSection ? (
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
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isAdmin ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() => setShowNewBlockInput(true)}
                    >
                      Neue Warengruppe anlegen
                    </Button>
                  ) : null}
                  {errors.block_id && (
                    <p className="text-sm text-destructive">{errors.block_id}</p>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="z.B. Bohnen"
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={
              addProduct.isPending ||
              !hasExactlyOne ||
              (showBlockField && !blockId) ||
              (showItemTypeField && !itemType)
            }
          >
            {addProduct.isPending ? 'Wird hinzugefügt...' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
        </form>

        <AlertDialog open={!!errorPopupMessage} onOpenChange={(open) => !open && setErrorPopupMessage(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Produkt konnte nicht hinzugefügt werden</AlertDialogTitle>
              <AlertDialogDescription>
                {errorPopupMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setErrorPopupMessage(null)}>
                Verstanden
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
