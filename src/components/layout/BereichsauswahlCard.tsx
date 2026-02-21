import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Große Karte für die Bereichsauswahl (Obst | Backshop | Benutzer).
 * Einstiegs-Portal: großes Icon mit Ring, Titel, optionale Beschreibung, Hover-Feedback.
 */
export const BereichsauswahlCard = React.memo(function BereichsauswahlCard({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'obst',
  compact = false,
}: {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  /** Obst = emerald, Backshop = slate, Benutzer = sky */
  variant?: 'obst' | 'backshop' | 'benutzer'
  compact?: boolean
}) {
  const variantStyles = {
    obst: {
      card: 'bg-emerald-50 border-emerald-200/60 hover:ring-2 hover:ring-emerald-300/50',
      iconWrap: 'bg-emerald-100 ring-2 ring-emerald-200/80',
      icon: 'text-emerald-800',
      title: 'text-emerald-800',
    },
    backshop: {
      card: 'bg-slate-50 border-slate-200 hover:ring-2 hover:ring-slate-300/50',
      iconWrap: 'bg-slate-200/70 ring-2 ring-slate-200',
      icon: 'text-slate-800',
      title: 'text-slate-800',
    },
    benutzer: {
      card: 'bg-sky-50 border-sky-200/60 hover:ring-2 hover:ring-sky-300/50',
      iconWrap: 'bg-sky-100 ring-2 ring-sky-200/80',
      icon: 'text-sky-800',
      title: 'text-sky-800',
    },
  }
  const styles = variantStyles[variant]

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 rounded-xl shadow-sm',
        'hover:shadow-lg hover:scale-[1.02]',
        compact ? 'min-h-0' : 'min-h-[140px]',
        styles.card,
      )}
      onClick={onClick}
    >
      <CardContent className={cn(compact ? 'p-3' : 'p-4 sm:p-5')}>
        <div className={cn('flex items-start gap-3', compact && 'gap-2')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl',
              compact ? 'h-10 w-10' : 'h-14 w-14',
              styles.iconWrap,
            )}
          >
            <Icon className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', styles.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-lg sm:text-xl', styles.title)}>
              {title}
            </h3>
            {description && (
              <p className={cn('mt-0.5 text-xs text-muted-foreground', compact && 'text-xs')}>
                {description}
              </p>
            )}
          </div>
          <ChevronRight className={cn('shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
})
