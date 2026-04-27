// Lupen-Button + FindInPageBar im Fixed-Portal (wie Masterliste / PLUTable)

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FindInPageBar } from '@/components/plu/FindInPageBar'
import { FindInPageFixedPortal } from '@/components/plu/FindInPageFixedPortal'
import { cn } from '@/lib/utils'
import type { FindInPageBarProps } from '@/components/plu/FindInPageBar'

type BarProps = Pick<
  FindInPageBarProps,
  | 'searchText'
  | 'onSearchTextChange'
  | 'currentIndex'
  | 'totalMatches'
  | 'onPrev'
  | 'onNext'
  | 'onClose'
  | 'placeholder'
>

export interface ListFindInPageToolbarProps {
  showBar: boolean
  onOpen: () => void
  ariaLabel?: string
  className?: string
  barProps: BarProps
  /** Optional: Tutorial-Anker auf dem Lupen-Button. */
  dataTour?: string
}

export function ListFindInPageToolbar({
  showBar,
  onOpen,
  ariaLabel = 'In Liste suchen',
  className,
  barProps,
  dataTour,
}: ListFindInPageToolbarProps) {
  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2 shrink-0', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onOpen}
          aria-label={ariaLabel}
          title={`${ariaLabel} (PLU oder Name)`}
          {...(dataTour ? { 'data-tour': dataTour } : {})}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {showBar && (
        <FindInPageFixedPortal>
          <FindInPageBar
            {...barProps}
            placeholder={barProps.placeholder ?? 'PLU oder Name suchen…'}
          />
        </FindInPageFixedPortal>
      )}
    </>
  )
}
