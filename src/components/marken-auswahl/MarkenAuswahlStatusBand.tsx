import { AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGroupListStatus } from '@/lib/marken-auswahl-state'
import type { BackshopSource } from '@/types/database'

const COPY = {
  offen: 'Keine Auswahl – alle Marken bleiben sichtbar.',
  teil: (n: number, m: number) =>
    `${n} von ${m} gewählt – andere Marken ausgeblendet, Hinweis in der Masterliste.`,
  confirmed: 'Alle Marken bestätigt – auditierbar gespeichert.',
  exclusive: 'Exklusiv-Modus: nur diese Marke bleibt in der Masterliste.',
}

type Kind = 'rules' | 'exclusive'

/**
 * kind=exclusive: einheitlicher Exklusiv-Banner.
 * kind=rules: leitet aus `memberSrc` + `chosen` + optional local „alle bestätigen“-Semantik ab.
 */
export function MarkenAuswahlStatusBand({
  kind,
  memberSrc,
  chosen,
  isExclusiveMode,
  /** Wenn bekannt: Teilauswahl n/m anzeigen */
  overridePartial,
}: {
  kind: Kind
  memberSrc: BackshopSource[]
  chosen: BackshopSource[] | undefined
  isExclusiveMode: boolean
  overridePartial?: { n: number; m: number }
}) {
  if (kind === 'exclusive' || isExclusiveMode) {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-blue-600/35 bg-blue-50/95 px-3 py-2 text-sm text-blue-900"
        role="status"
        data-tour="backshop-marken-auswahl-status"
      >
        <ShieldAlert className="h-4 w-4 shrink-0 text-blue-800" aria-hidden />
        <span>{COPY.exclusive}</span>
      </div>
    )
  }

  const c = (chosen ?? []).filter((s) => memberSrc.includes(s))
  const m = memberSrc.length
  const n = c.length
  const st = getGroupListStatus(memberSrc, chosen)

  let text: string
  let style: string
  let Icon: typeof Info = Info
  if (st === 'offen') {
    text = COPY.offen
    style = 'border-stone-200 bg-stone-100/80 text-stone-800'
  } else if (st === 'confirmed') {
    text = COPY.confirmed
    style = 'border-emerald-200 bg-emerald-50 text-emerald-900'
    Icon = CheckCircle2
  } else {
    const pn = overridePartial?.n ?? n
    const pm = overridePartial?.m ?? m
    text = COPY.teil(pn, pm)
    style = 'border-blue-200 bg-blue-50 text-blue-900'
    Icon = AlertCircle
  }

  return (
    <div
      className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm', style)}
      role="status"
      data-tour="backshop-marken-auswahl-status"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  )
}
