// FindInPageBar: Such-Input + „X von Y“ + Vorheriger/Nächster (Chrome-artige Find-in-Page)

import { useEffect, useRef, useCallback } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FindInPageBarProps {
  searchText: string
  onSearchTextChange: (value: string) => void
  currentIndex: number
  totalMatches: number
  onPrev: () => void
  onNext: () => void
  placeholder?: string
  className?: string
  onClose?: () => void
}

/**
 * Suchleiste mit Find-in-Page-Navigation (Vorheriger/Nächster Treffer).
 * Scroll/Highlight übernimmt der Parent.
 */
export function FindInPageBar({
  searchText,
  onSearchTextChange,
  currentIndex,
  totalMatches,
  onPrev,
  onNext,
  placeholder = 'PLU oder Name suchen…',
  className,
  onClose,
}: FindInPageBarProps) {
  const inputWrapRef = useRef<HTMLDivElement>(null)

  // Nach Öffnen (Toolbar-Lupe / „In Liste suchen“) sofort tippbar; doppeltes rAF für Portal/Fokus-Reihenfolge
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = inputWrapRef.current?.querySelector<HTMLInputElement>('input[type="search"], input')
        el?.focus({ preventScroll: true })
      })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  /** Pfeiltasten: Treffer wechseln statt Seite scrollen (Tablet/Tastatur) */
  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (totalMatches <= 0) return
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'ArrowUp') onPrev()
        else onNext()
      }
    },
    [totalMatches, onPrev, onNext],
  )

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 sm:gap-2', className)}>
      <div ref={inputWrapRef} className="relative min-w-0 max-w-[min(100%,220px)] flex-1 sm:max-w-[260px] sm:min-w-[180px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none sm:left-3 sm:h-4 sm:w-4" />
        <Input
          type="search"
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="h-8 pl-8 text-sm sm:h-9 sm:pl-9"
          aria-label="Suche"
        />
      </div>
      {totalMatches > 0 && (
        <>
          <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
            {currentIndex + 1} von {totalMatches}
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onPrev}
              aria-label="Vorheriger Treffer"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onNext}
              aria-label="Nächster Treffer"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={onClose}
          aria-label="Suche schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
