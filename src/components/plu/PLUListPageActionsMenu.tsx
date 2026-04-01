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
 * Nur sichtbar unter `sm` – Desktop nutzt weiterhin einzelne Buttons.
 */
export function PLUListPageActionsMenu({ items, ariaLabel }: PLUListPageActionsMenuProps) {
  if (items.length === 0) return null
  return (
    <div className="sm:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={ariaLabel}>
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
