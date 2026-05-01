import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Untere fixierte Leiste für Picker-Vollseiten (z. B. Produkte ausblenden) – immer am Bildschirmrand sichtbar. */
export function PickerStickyActionBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'border-t border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85',
        'shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.06)]',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6',
          'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Abstand unten, damit der Seiteninhalt nicht unter der fixierten Leiste liegt. */
export const PICKER_STICKY_ACTION_BAR_BOTTOM_PADDING =
  'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]' as const
