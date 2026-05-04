// Warengruppen-Überschriften + responsives Kachel-Raster (Backshop-Katalog)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BackshopKachelWarengruppeBlock } from '@/lib/backshop-kachel-groups'
import { BackshopKachelTile } from '@/components/backshop/BackshopKachelTile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DisplayItem } from '@/types/plu'

export interface BackshopKachelGridProps {
  blocks: BackshopKachelWarengruppeBlock[]
  sourceArtNrByPlu: Map<string, string>
}

function dialogTitleForItem(item: DisplayItem): string {
  const name = (item.display_name ?? '').trim() || 'Artikel'
  const short = name.length > 72 ? `${name.slice(0, 72)}…` : name
  return `PLU ${item.plu} – ${short}`
}

const SWIPE_MIN_PX = 56

export function BackshopKachelGrid({ blocks, sourceArtNrByPlu }: BackshopKachelGridProps) {
  const flatItems = useMemo(() => blocks.flatMap((b) => b.items), [blocks])
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const previewOpen =
    previewIndex != null && previewIndex >= 0 && previewIndex < flatItems.length && flatItems.length > 0

  const selectedItem = previewOpen ? flatItems[previewIndex] : null

  const selectedSourceArtNr = useMemo(
    () => (selectedItem ? sourceArtNrByPlu.get(selectedItem.plu) : undefined),
    [selectedItem, sourceArtNrByPlu],
  )

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setPreviewIndex(null)
  }, [])

  const goPrev = useCallback(() => {
    setPreviewIndex((i) => (i != null && i > 0 ? i - 1 : i))
  }, [])

  const goNext = useCallback(() => {
    setPreviewIndex((i) => {
      if (i == null) return i
      return i < flatItems.length - 1 ? i + 1 : i
    })
  }, [flatItems.length])

  useEffect(() => {
    if (previewIndex == null) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        return
      }
      if (el instanceof HTMLElement && el.isContentEditable) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIndex, goPrev, goNext])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current
      touchStartRef.current = null
      if (!start || e.changedTouches.length !== 1) return
      const end = e.changedTouches[0]
      const dx = end.clientX - start.x
      const dy = end.clientY - start.y
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.1) return
      if (dx < 0) goNext()
      else goPrev()
    },
    [goPrev, goNext],
  )

  const canGoPrev = previewIndex != null && previewIndex > 0
  const canGoNext = previewIndex != null && previewIndex < flatItems.length - 1

  return (
    <div className="space-y-10" data-testid="backshop-kachel-grid-root">
      {blocks.map((block) => (
        <section
          key={block.label}
          className="overflow-hidden rounded-none border-2 border-slate-800 bg-white shadow-sm"
        >
          <h3 className="border-b-2 border-slate-800 bg-slate-100 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900">
            {block.label}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 p-3 sm:gap-4 sm:p-4">
            {block.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="min-w-0 cursor-pointer rounded-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Kachel PLU ${item.plu} in Großansicht öffnen`}
                onClick={() => {
                  const idx = flatItems.findIndex((i) => i.id === item.id)
                  if (idx >= 0) setPreviewIndex(idx)
                }}
              >
                <BackshopKachelTile item={item} sourceArtNr={sourceArtNrByPlu.get(item.plu)} layout="compact" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={previewOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton
          data-testid="backshop-kachel-preview-dialog"
          className="max-h-[min(92dvh,880px)] w-[min(100%,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 overflow-y-auto border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg sm:max-w-3xl sm:p-5 md:max-w-4xl"
        >
          {selectedItem ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{dialogTitleForItem(selectedItem)}</DialogTitle>
                <DialogDescription>
                  Großansicht der Kachel aus dem Backshop-Kachel-Katalog. Pfeiltasten oder Wischen wechseln die
                  Kachel. Schließen über die Schaltfläche oben rechts oder außerhalb des Dialogs.
                </DialogDescription>
              </DialogHeader>
              <div aria-live="polite" className="sr-only" key={selectedItem.id}>
                {`Aktuell PLU ${selectedItem.plu}`}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2 sm:pt-1">
                <div className="hidden shrink-0 flex-col justify-center sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-testid="backshop-kachel-preview-prev"
                    className="h-12 w-12 rounded-lg"
                    disabled={!canGoPrev}
                    aria-label="Vorherige Kachel"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </Button>
                </div>

                <div
                  className="min-w-0 flex-1 touch-pan-y rounded-xl border border-border/50 bg-muted/15 p-2 shadow-sm sm:p-3"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  <div className="mx-auto w-full max-w-lg">
                    <BackshopKachelTile
                      item={selectedItem}
                      sourceArtNr={selectedSourceArtNr}
                      layout="expanded"
                      className="shadow-md"
                    />
                  </div>
                  {flatItems.length > 1 ? (
                    <p className="mt-3 text-center text-xs text-muted-foreground tabular-nums sm:text-sm">
                      {(previewIndex ?? 0) + 1} von {flatItems.length}
                    </p>
                  ) : null}
                </div>

                <div className="hidden shrink-0 flex-col justify-center sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    data-testid="backshop-kachel-preview-next"
                    className="h-12 w-12 rounded-lg"
                    disabled={!canGoNext}
                    aria-label="Nächste Kachel"
                    onClick={goNext}
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </Button>
                </div>
              </div>

              {flatItems.length > 1 ? (
                <div className="mt-1 flex gap-2 sm:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 flex-1 gap-1.5"
                    data-testid="backshop-kachel-preview-prev-mobile"
                    disabled={!canGoPrev}
                    aria-label="Vorherige Kachel"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="size-5 shrink-0" aria-hidden />
                    Zurück
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 flex-1 gap-1.5"
                    data-testid="backshop-kachel-preview-next-mobile"
                    disabled={!canGoNext}
                    aria-label="Nächste Kachel"
                    onClick={goNext}
                  >
                    Weiter
                    <ChevronRight className="size-5 shrink-0" aria-hidden />
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
