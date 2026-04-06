// EditCustomProductDialog: Eigenes Produkt bearbeiten (Name, Typ, Preis, Warengruppe) – Obst/Gemüse; Felder je Layout

import { useState, useCallback, useMemo } from 'react'
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
import { useUpdateCustomProduct } from '@/hooks/useCustomProducts'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import {
  obstCustomProductShowBlockField,
  obstCustomProductShowItemTypeField,
} from '@/lib/obst-custom-product-layout'
import type { Block } from '@/types/database'
import type { CustomProduct } from '@/types/database'

interface EditCustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CustomProduct
  blocks: Block[]
}

/** Nur bei open gemountet + key=product.id → Formularwerte aus product ohne setState im Effect. */
function EditCustomProductDialogBody({
  product,
  blocks,
  onOpenChange,
  showItemTypeField,
  showBlockField,
}: {
  product: CustomProduct
  blocks: Block[]
  onOpenChange: (open: boolean) => void
  showItemTypeField: boolean
  showBlockField: boolean
}) {
  const updateProduct = useUpdateCustomProduct()

  const [name, setName] = useState(product.name)
  const [itemType, setItemType] = useState<'PIECE' | 'WEIGHT'>(product.item_type)
  const [preis, setPreis] = useState(product.preis != null ? String(product.preis).replace('.', ',') : '')
  const [blockId, setBlockId] = useState(product.block_id ?? '')

  const preisNum = preis.trim() ? parseFloat(preis.replace(',', '.')) : null
  const isValidPreis = preisNum === null || (!isNaN(preisNum) && preisNum >= 0)

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || name.length < 2) return

    const preisToSave = preisNum !== null && !isNaN(preisNum) ? Math.round(preisNum * 100) / 100 : null

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: name.trim(),
        item_type: showItemTypeField ? itemType : product.item_type,
        preis: preisToSave,
        block_id: showBlockField ? blockId || null : product.block_id,
      })
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }, [
    product.id,
    product.item_type,
    product.block_id,
    name,
    showItemTypeField,
    showBlockField,
    itemType,
    preisNum,
    blockId,
    updateProduct,
    onOpenChange,
  ])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Eigenes Produkt bearbeiten</DialogTitle>
        <DialogDescription>
          Name und Preis anpassen; weitere Felder je nach Layout-Einstellung. PLU kann nicht geändert werden.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
            PLU: {product.plu.startsWith('price-') ? 'Preis-only' : product.plu}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Artikelname</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Avocado"
            />
          </div>

          {showItemTypeField && (
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as 'PIECE' | 'WEIGHT')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIECE">Stück</SelectItem>
                  <SelectItem value="WEIGHT">Gewicht</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-preis">Preis (EUR)</Label>
            <Input
              id="edit-preis"
              placeholder="z.B. 1,50"
              value={preis}
              onChange={(e) => setPreis(e.target.value)}
              className={!isValidPreis ? 'border-destructive' : ''}
            />
            {!isValidPreis && <p className="text-sm text-destructive">Ungültiger Preis</p>}
          </div>

          {showBlockField && (
            <div className="space-y-2">
              <Label>Warengruppe</Label>
              <Select value={blockId || '__none__'} onValueChange={(v) => setBlockId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Keine Zuordnung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Zuordnung</SelectItem>
                  {blocks
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={
              updateProduct.isPending ||
              name.trim().length < 2 ||
              !isValidPreis
            }
          >
            {updateProduct.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function EditCustomProductDialog({
  open,
  onOpenChange,
  product,
  blocks,
}: EditCustomProductDialogProps) {
  const { data: layoutSettings } = useLayoutSettings()
  const showItemTypeField = useMemo(
    () => obstCustomProductShowItemTypeField(layoutSettings),
    [layoutSettings],
  )
  const showBlockField = useMemo(
    () => obstCustomProductShowBlockField(layoutSettings),
    [layoutSettings],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {open ? (
          <EditCustomProductDialogBody
            key={product.id}
            product={product}
            blocks={blocks}
            onOpenChange={onOpenChange}
            showItemTypeField={showItemTypeField}
            showBlockField={showBlockField}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
