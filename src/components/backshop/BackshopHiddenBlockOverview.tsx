import { Layers } from 'lucide-react'
import { useMemo, useState } from 'react'
import { resolveBackshopHiddenBlockTileImage } from '@/lib/backshop-hidden-block-default-thumbs'
import { cn } from '@/lib/utils'

export interface BackshopHiddenBlockTile {
  blockId: string
  label: string
  count: number
  previewThumbUrl: string | null
}

function TileImageArea({
  tile,
  resolvedSrc,
}: {
  tile: BackshopHiddenBlockTile
  resolvedSrc: string | null
}) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(resolvedSrc)
  const [triedPreviewFallback, setTriedPreviewFallback] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = Boolean(displaySrc) && !imgFailed
  return (
    <>
      {showImg ? (
        <img
          src={displaySrc!}
          alt=""
          className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain p-2 [image-rendering:crisp-edges]"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (!triedPreviewFallback && tile.previewThumbUrl && displaySrc !== tile.previewThumbUrl) {
              setDisplaySrc(tile.previewThumbUrl)
              setTriedPreviewFallback(true)
            } else {
              setImgFailed(true)
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/60 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kein Vorschaubild
          </span>
        </div>
      )}
    </>
  )
}

function TileCard({
  tile,
  onOpen,
  subtitle,
}: {
  tile: BackshopHiddenBlockTile
  onOpen: (blockId: string) => void
  subtitle: string
}) {
  const resolvedSrc = useMemo(
    () => resolveBackshopHiddenBlockTileImage(tile.label, tile.previewThumbUrl),
    [tile.label, tile.previewThumbUrl],
  )
  const countLabel = tile.count === 1 ? '1 Artikel' : `${tile.count} Artikel`

  return (
    <button
      type="button"
      onClick={() => onOpen(tile.blockId)}
      aria-label={`Warengruppe ${tile.label}, ${countLabel}`}
      className={cn(
        'group flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all',
        'hover:border-border/80 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <div className="relative h-[92px] w-full shrink-0 bg-muted/35 sm:h-[100px]">
        <TileImageArea
          key={`${tile.blockId}-${String(resolvedSrc)}-${tile.previewThumbUrl ?? 'none'}`}
          tile={tile}
          resolvedSrc={resolvedSrc}
        />
        <span
          className="absolute right-2 top-2 rounded-full border border-border/80 bg-background/95 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur-sm"
          aria-hidden
        >
          {tile.count}
        </span>
      </div>

      {/* Textblock unter dem Bild */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground"
            aria-hidden
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="truncate text-[11px] font-medium tabular-nums text-muted-foreground">{countLabel}</span>
        </div>
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {tile.label}
        </p>
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">{subtitle}</p>
      </div>
    </button>
  )
}

interface BackshopHiddenBlockOverviewProps {
  tiles: BackshopHiddenBlockTile[]
  onOpenBlock: (blockId: string) => void
  emptyMessage?: string
  /** Optional: Grid-Klassen überschreiben (z. B. Ausgeblendet-Variante A) */
  gridClassName?: string
  /** Kurzer Hinweis unter dem Raster */
  hint?: string
  /** Zeilen-Untertitel unter dem Warengruppennamen */
  tileSubtitle?: string
}

export function BackshopHiddenBlockOverview({
  tiles,
  onOpenBlock,
  emptyMessage = 'Keine Warengruppen mit Einträgen.',
  gridClassName,
  hint = 'Klick: Warengruppe öffnen und zugehörige Artikel anzeigen.',
  tileSubtitle = 'Ausgeblendete Artikel in dieser Warengruppe',
}: BackshopHiddenBlockOverviewProps) {
  if (tiles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground" data-testid="hidden-block-overview-empty">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className={cn('grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3', gridClassName)}
        data-testid="hidden-block-overview-grid"
      >
        {tiles.map((t) => (
          <TileCard key={t.blockId} tile={t} onOpen={onOpenBlock} subtitle={tileSubtitle} />
        ))}
      </div>
      {hint ? (
        <p className="text-center text-[11px] text-muted-foreground sm:text-left">{hint}</p>
      ) : null}
    </div>
  )
}
