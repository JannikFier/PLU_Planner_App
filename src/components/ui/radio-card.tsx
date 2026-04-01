// Wiederverwendbare Radio-Card (shadcn-konform)

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface RadioCardProps {
  selected: boolean
  onClick: () => void
  title: ReactNode
  description: string
}

/**
 * Klickbare Karte mit Radio-Optik – für Einzelauswahl (z. B. Layout-Optionen).
 */
export function RadioCard({ selected, onClick, title, description }: RadioCardProps) {
  return (
    <div
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={cn(
        'cursor-pointer rounded-lg border-2 p-2 transition-all sm:p-3',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center sm:h-4 sm:w-4',
            selected ? 'border-primary' : 'border-muted-foreground/40',
          )}
        >
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-primary sm:h-2 sm:w-2" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium sm:text-sm">{title}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-normal">
            {description}
          </div>
        </div>
      </div>
    </div>
  )
}
