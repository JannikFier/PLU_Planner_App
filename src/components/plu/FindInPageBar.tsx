// FindInPageBar: Such-Input + „X von Y“ + Vorheriger/Nächster (Chrome-artige Find-in-Page)

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
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative max-w-[260px] min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder={placeholder}
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="pl-9"
          aria-label="Suche"
        />
      </div>
      {totalMatches > 0 && (
        <>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
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
