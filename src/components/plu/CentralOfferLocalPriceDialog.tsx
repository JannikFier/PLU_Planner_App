// Dialog: Eigenen Aktionspreis zur zentralen Werbung (Referenzpreis bleibt sichtbar)

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPreisEur } from '@/lib/plu-helpers'
import { useAuth } from '@/hooks/useAuth'
import {
  useUpsertObstOfferLocalPrice,
  useUpsertBackshopOfferLocalPrice,
} from '@/hooks/useOfferStoreLocalPrices'

export interface CentralOfferLocalPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domain: 'obst' | 'backshop'
  plu: string
  productName: string
  /** Preis aus der zentralen Kampagne (nur Anzeige) */
  centralPrice: number
  /** Bereits gespeicherter eigener Preis – beim Öffnen im Feld vorausfüllen */
  initialLocalPrice?: number | null
  kw_nummer: number
  jahr: number
  /** Optional: Tutorial-Anker am DialogContent */
  dataTour?: string
  /** Optional: Tutorial-Anker am Speichern-Button */
  submitDataTour?: string
}

export function CentralOfferLocalPriceDialog({
  open,
  onOpenChange,
  domain,
  plu,
  productName,
  centralPrice,
  initialLocalPrice,
  kw_nummer,
  jahr,
  dataTour,
  submitDataTour,
}: CentralOfferLocalPriceDialogProps) {
  const { isViewer } = useAuth()
  const upsertObst = useUpsertObstOfferLocalPrice()
  const upsertBackshop = useUpsertBackshopOfferLocalPrice()
  const pending = upsertObst.isPending || upsertBackshop.isPending

  const [localInput, setLocalInput] = useState('')

  useEffect(() => {
    if (!open) return
    const fill =
      initialLocalPrice != null &&
      Number.isFinite(initialLocalPrice) &&
      initialLocalPrice > 0
        ? initialLocalPrice
        : centralPrice
    const next = String(fill).replace('.', ',')
    // Nicht synchron setState im Effect (ESLint) – nächster Task
    queueMicrotask(() => setLocalInput(next))
  }, [open, centralPrice, initialLocalPrice])

  const handleSave = () => {
    const v = parseFloat(localInput.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return
    const mut = domain === 'obst' ? upsertObst : upsertBackshop
    mut.mutate(
      { plu, kw_nummer, jahr, local_promo_price: v },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        {...(dataTour ? { 'data-tour': dataTour } : {})}
      >
        <DialogHeader>
          <DialogTitle>Eigener Aktionspreis</DialogTitle>
          <DialogDescription>
            Nur für diesen Markt. Der zentrale Vorgabepreis bleibt zur Orientierung sichtbar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <p className="text-sm text-muted-foreground">Artikel</p>
            <p className="font-medium break-words">{productName}</p>
            <p className="text-sm font-mono text-muted-foreground mt-1">PLU {plu}</p>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Zentral vorgegeben (Referenz)</p>
            <p className="text-lg font-semibold tabular-nums">{formatPreisEur(centralPrice)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="local-offer-price">Eigener Verkaufspreis (€)</Label>
            <Input
              id="local-offer-price"
              inputMode="decimal"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="z. B. 1,79"
              disabled={isViewer}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isViewer || pending}
            {...(submitDataTour ? { 'data-tour': submitDataTour } : {})}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
