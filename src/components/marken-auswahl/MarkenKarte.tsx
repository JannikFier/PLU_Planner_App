import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkenQuellBadge } from '@/components/marken-auswahl/MarkenQuellBadge'
import { backshopSourceLabel } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'

const PLACEHOLDER_SVG = (
  <svg
    className="h-full w-full text-stone-200"
    viewBox="0 0 120 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect width="120" height="90" fill="url(#p)" />
    <defs>
      <pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" />
      </pattern>
    </defs>
  </svg>
)

export type KarteZustand = 'inactive' | 'active' | 'exclusive' | 'dimmed'

function zustandClasses(z: KarteZustand): string {
  switch (z) {
    case 'inactive':
      return 'border-stone-200 bg-white shadow-none hover:border-stone-300 hover:shadow-sm'
    case 'active':
      return 'border-stone-900 ring-1 ring-stone-900 bg-white shadow-sm'
    case 'exclusive':
      return 'border-blue-700 ring-1 ring-blue-700 bg-white shadow-md shadow-blue-900/10'
    case 'dimmed':
      return 'border-stone-200 bg-stone-50/80 opacity-45 saturate-60'
    default:
      return ''
  }
}

export function MarkenKarteDesktop({
  plu,
  name,
  source,
  imageUrl,
  zustand,
  isChosen,
  onClick,
  onDoubleClick,
  onKeyDown,
  ariaLabel,
  dataTour,
  badgeDataTour,
}: {
  plu: string
  name: string
  source: BackshopSource
  imageUrl: string | null
  zustand: KarteZustand
  isChosen: boolean
  onClick: () => void
  onDoubleClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  ariaLabel: string
  dataTour?: string
  badgeDataTour?: string
}) {
  const mark = backshopSourceLabel(source)
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      aria-label={ariaLabel}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        'text-left rounded-lg border-2 p-3 transition-all w-full max-w-[220px] min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-900 focus-visible:outline-offset-2',
        zustandClasses(zustand),
      )}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="shrink-0" />
        {isChosen && (
          <CheckCircle2
            className={cn(
              'h-4 w-4 shrink-0',
              zustand === 'exclusive' ? 'text-blue-800' : 'text-stone-900',
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-stone-200 bg-stone-50/80">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-contain" /> : PLACEHOLDER_SVG}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <MarkenQuellBadge source={source} size="md" dimmed={zustand === 'dimmed'} dataTour={badgeDataTour} />
        <span className="text-xs text-stone-500 font-mono tabular-nums">PLU {plu}</span>
      </div>
      <p className="text-sm font-medium text-stone-900 line-clamp-2 mt-1.5 break-words">{name}</p>
      <p className="text-[11.5px] text-stone-500 line-clamp-1">Marke {mark}</p>
    </button>
  )
}

export function MarkenKarteMobileRow({
  plu,
  name,
  source,
  imageUrl,
  zustand,
  isChosen,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onClick,
  ariaLabel,
  dataTour,
  badgeDataTour,
}: {
  plu: string
  name: string
  source: BackshopSource
  imageUrl: string | null
  zustand: KarteZustand
  isChosen: boolean
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onClick: () => void
  ariaLabel: string
  dataTour?: string
  badgeDataTour?: string
}) {
  const mark = backshopSourceLabel(source)
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={cn(
        'w-full min-h-[44px] text-left flex flex-row gap-3 p-3 rounded-lg border-2 items-stretch',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-900 focus-visible:outline-offset-2',
        zustandClasses(zustand),
      )}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-stone-200 bg-stone-50/80 self-center">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-contain" /> : PLACEHOLDER_SVG}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <MarkenQuellBadge source={source} size="sm" dimmed={zustand === 'dimmed'} dataTour={badgeDataTour} />
          <span className="text-xs text-stone-500 font-mono tabular-nums">PLU {plu}</span>
        </div>
        <p className="text-[13.5px] font-medium text-stone-900 break-words mt-0.5 line-clamp-2">{name}</p>
        <p className="text-[11.5px] text-stone-500 line-clamp-1">Marke {mark}</p>
      </div>
      <div className="w-6 shrink-0 self-center">
        {isChosen && (
          <CheckCircle2
            className={cn('h-5 w-5', zustand === 'exclusive' ? 'text-blue-800' : 'text-stone-900')}
            aria-hidden
          />
        )}
      </div>
    </button>
  )
}
