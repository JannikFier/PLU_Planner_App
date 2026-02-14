// EditCustomProductDialog: Eigenes Produkt bearbeiten (Name, Typ, Preis, Warengruppe)

import { useState, useCallback, useEffect } from 'react'
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
import type { Block } from '@/types/database'
import type { CustomProduct } from '@/types/database'

interface EditCustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CustomProduct
  blocks: Block[]
}

export function EditCustomProductDialog({
  open,
  onOpenChange,
  product,
  blocks,
}: EditCustomProductDialogProps) {
  const updateProduct = useUpdateCustomProduct()

  const [name, setName] = useState(product.name)
  const [itemType, setItemType] = useState<'PIECE' | 'WEIGHT'>(product.item_type)
  const [preis, setPreis] = useState(product.preis != null ? String(product.preis).replace('.', ',') : '')
  const [blockId, setBlockId] = useState(product.block_id ?? '')

  useEffect(() => {
    if (open && product) {
      setName(product.name)
      setItemType(product.item_type)
      setPreis(product.preis != null ? String(product.preis).replace('.', ',') : '')
      setBlockId(product.block_id ?? '')
    }
  }, [open, product])

  const preisNum = preis.trim() ? parseFloat(preis.replace(',', '.')) : null
  const isValidPreis = preisNum === null || (!isNaN(preisNum) && preisNum >= 0)

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || name.length < 2) return

    const preisToSave = preisNum !== null && !isNaN(preisNum) ? Math.round(preisNum * 100) / 100 : null

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: name.trim(),
        item_type: itemType,
        preis: preisToSave,
        block_id: blockId || null,
      })
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }, [product.id, name, itemType, preisNum, blockId, updateProduct, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eigenes Produkt bearbeiten</DialogTitle>
          <DialogDescription>
            Name, Typ, Preis und Warengruppe anpassen. PLU kann nicht geändert werden.
          </DialogDescription>
        </DialogHeader>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              updateProduct.isPending ||
              name.trim().length < 2 ||
              !isValidPreis
            }
          >
            {updateProduct.isPending ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
