// Mobile: Listen-Aktionen hinter ⋮ (schmale Bildschirme), flach ohne Untermenüs

import { Fragment, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type PLUListPageActionMenuItem = {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  /** Optional: Trennlinie nach diesem Eintrag (z. B. nach „Neuer Upload“) */
  separatorAfter?: boolean
}

type PLUListPageActionsMenuProps = {
  items: PLUListPageActionMenuItem[]
  /** z. B. „Listen-Aktionen“ */
  ariaLabel: string
}

/**
 * Sichtbar unter `lg` (Viewports < 1024px) – ab `lg` nutzt die Seite die einzelnen Toolbar-Buttons.
 */
export function PLUListPageActionsMenu({ items, ariaLabel }: PLUListPageActionsMenuProps) {
  if (items.length === 0) return null
  return (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={ariaLabel}
            data-tour="plu-list-mobile-actions"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {items.map((item, i) => (
            <Fragment key={`${item.label}-${i}`}>
              <DropdownMenuItem onClick={item.onClick} disabled={item.disabled} className="cursor-pointer">
                <span className="flex shrink-0 items-center [&_svg]:text-muted-foreground">{item.icon}</span>
                {item.label}
              </DropdownMenuItem>
              {item.separatorAfter ? <DropdownMenuSeparator /> : null}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
