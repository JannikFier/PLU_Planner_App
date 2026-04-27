// Monogramm (E/H/A) — Marken-Auswahl-Design, indigo/red/emerald, quadratisch.
import { cn } from '@/lib/utils'
import { backshopSourceLabel, backshopSourceShort, type BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'

const TONE: Record<BackshopExcelSource, { bg: string; fg: string; border: string }> = {
  edeka: { bg: 'bg-indigo-50', fg: 'text-indigo-800', border: 'border-indigo-200' },
  harry: { bg: 'bg-red-50', fg: 'text-red-800', border: 'border-red-200' },
  aryzta: { bg: 'bg-emerald-50', fg: 'text-emerald-800', border: 'border-emerald-200' },
}

const sizeMap = {
  sm: 'h-5 w-5 min-w-5 min-h-5 text-[10px] rounded',
  md: 'h-7 w-7 min-w-7 min-h-7 text-xs rounded-md',
  lg: 'h-9 w-9 min-w-9 min-h-9 text-sm rounded-md',
} as const

function styleFor(
  source: BackshopSource,
): { className: string; short: string; label: string } {
  if (source === 'manual') {
    return {
      className: 'bg-slate-100 text-slate-800 border-slate-200',
      short: 'N',
      label: 'Nachbesserung',
    }
  }
  const t = TONE[source as BackshopExcelSource]
  if (t) {
    return {
      className: `${t.bg} ${t.fg} ${t.border}`,
      short: backshopSourceShort(source) ?? '?',
      label: backshopSourceLabel(source),
    }
  }
  return { className: 'bg-stone-100 text-stone-800 border-stone-200', short: '?', label: String(source) }
}

export function MarkenQuellBadge({
  source,
  size = 'md',
  className,
  dimmed = false,
  dataTour,
}: {
  source: BackshopSource
  size?: keyof typeof sizeMap
  className?: string
  dimmed?: boolean
  dataTour?: string
}) {
  const s = styleFor(source)
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border font-mono font-semibold [font-variant-numeric:tabular-nums]',
        s.className,
        sizeMap[size],
        dimmed && 'opacity-[0.35] saturate-60',
        className,
      )}
      title={s.label}
      aria-label={s.label}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      {s.short}
    </span>
  )
}
