// Wiederverwendbare Radio-Card (shadcn-konform)

import { cn } from '@/lib/utils'

export interface RadioCardProps {
  selected: boolean
  onClick: () => void
  title: string
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
        'cursor-pointer rounded-lg border-2 p-3 transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-muted-foreground/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center',
            selected ? 'border-primary' : 'border-muted-foreground/40',
          )}
        >
          {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>
    </div>
  )
}
