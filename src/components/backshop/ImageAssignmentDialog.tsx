// Dialog zur manuellen Bildzuordnung für Produkte ohne automatisches Bild

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, SkipForward } from 'lucide-react'
import type { UnmatchedProduct } from '@/lib/backshop-excel-images'

interface ImageAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: UnmatchedProduct[]
  onAssign: (plu: string, dataUrl: string) => Promise<void>
  onSkipAll: () => void
}

export function ImageAssignmentDialog({
  open,
  onOpenChange,
  products,
  onAssign,
  onSkipAll,
}: ImageAssignmentDialogProps) {
  const [selectedPlu, setSelectedPlu] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignedPLUs, setAssignedPLUs] = useState<Set<string>>(new Set())

  const remaining = products.filter((p) => !assignedPLUs.has(p.plu))
  const currentProduct = remaining.find((p) => p.plu === selectedPlu) ?? remaining[0] ?? null

  const handleAssign = useCallback(
    async (dataUrl: string) => {
      if (!currentProduct || assigning) return
      setAssigning(true)
      try {
        await onAssign(currentProduct.plu, dataUrl)
        setAssignedPLUs((prev) => new Set([...prev, currentProduct.plu]))
        setSelectedPlu(null)
      } finally {
        setAssigning(false)
      }
    },
    [currentProduct, assigning, onAssign]
  )

  const handleSkip = useCallback(() => {
    if (!currentProduct) return
    setAssignedPLUs((prev) => new Set([...prev, currentProduct.plu]))
    setSelectedPlu(null)
  }, [currentProduct])

  const handleClose = useCallback(() => {
    setAssignedPLUs(new Set())
    setSelectedPlu(null)
    onOpenChange(false)
  }, [onOpenChange])

  // Bilder „nahe zuerst“: gleiche Zeile wie Produkt, dann nach Spaltenabstand; Rest danach
  const availableImages = useMemo(() => {
    const list = currentProduct?.availableImages ?? []
    const row0 = currentProduct?.expectedRow
    const col0 = currentProduct?.expectedCol
    if (row0 == null || col0 == null) return list
    return [...list].sort((a, b) => {
      const aSameRow = a.row === row0 ? 0 : 1
      const bSameRow = b.row === row0 ? 0 : 1
      if (aSameRow !== bSameRow) return aSameRow - bSameRow
      const aColDist = Math.abs(a.col - col0)
      const bColDist = Math.abs(b.col - col0)
      if (aColDist !== bColDist) return aColDist - bColDist
      return (a.row - b.row) || (a.col - b.col)
    })
  }, [currentProduct?.availableImages, currentProduct?.expectedRow, currentProduct?.expectedCol])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bilder manuell zuordnen</DialogTitle>
          <DialogDescription>
            Diese Produkte haben in der Excel kein Bild an der erwarteten Position. Wähle ein Produkt und ordne ihm eines der extrahierten Bilder zu oder überspringe es.
          </DialogDescription>
        </DialogHeader>

        {remaining.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Alle Produkte wurden bearbeitet.
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Links: Produkte ohne Bild */}
            <div className="w-56 shrink-0 flex flex-col">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {remaining.length} Produkt(e) ohne Bild
              </p>
              <ScrollArea className="flex-1 max-h-[50vh]">
                <div className="space-y-1 pr-2">
                  {remaining.map((p) => (
                    <button
                      key={p.plu}
                      onClick={() => setSelectedPlu(p.plu)}
                      className={`w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors ${
                        currentProduct?.plu === p.plu
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs opacity-70 ml-1">({p.plu})</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Rechts: Verfügbare Bilder */}
            <div className="flex-1 flex flex-col min-w-0">
              {currentProduct && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium truncate">
                      Bild für <span className="font-bold">{currentProduct.name}</span>{' '}
                      <span className="text-muted-foreground">({currentProduct.plu})</span> wählen:
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkip}
                      disabled={assigning}
                    >
                      <SkipForward className="h-3.5 w-3.5 mr-1" />
                      Überspringen
                    </Button>
                  </div>

                  {availableImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      Keine nicht zugeordneten Bilder verfügbar. Dieses Produkt hat in der Excel-Datei kein eigenes Bild.
                    </p>
                  ) : (
                    <ScrollArea className="flex-1 max-h-[50vh]">
                      <div className="grid grid-cols-4 gap-2 pr-2">
                        {availableImages.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAssign(img.dataUrl)}
                            disabled={assigning}
                            className="group relative rounded-lg border-2 border-transparent hover:border-primary p-1 transition-all bg-muted/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={img.dataUrl}
                              alt={`Bild Zeile ${img.row}, Spalte ${img.col}`}
                              className="w-full aspect-square object-contain rounded"
                              loading="lazy"
                              decoding="async"
                            />
                            <span className="absolute bottom-0.5 right-0.5 text-[10px] text-muted-foreground bg-background/80 rounded px-0.5">
                              Z{img.row}S{img.col}
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => { onSkipAll(); handleClose() }}>
            Alle überspringen
          </Button>
          {remaining.length === 0 ? (
            <Button onClick={handleClose}>
              <Check className="h-4 w-4 mr-1" />
              Fertig
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground self-center">
              Bild anklicken um es zuzuordnen
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
