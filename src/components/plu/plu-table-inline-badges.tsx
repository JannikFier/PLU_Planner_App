import { Link } from 'react-router-dom'
import { GitCompareArrows, Megaphone, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import type { DisplayItem } from '@/types/plu'

/** Inline-Badge mit Marke (nur Backshop, nicht im PDF). */
export function BackshopSourceInlineBadge({
  item,
  listType,
}: {
  item: DisplayItem
  listType: 'obst' | 'backshop'
}) {
  if (listType !== 'backshop') return null
  if (item.is_custom) return null
  if (!item.backshop_source) return null
  return (
    <BackshopSourceBadge
      source={item.backshop_source}
      className="ml-1 align-middle"
      dataTour="backshop-master-source-badge"
    />
  )
}

/** Eigenes Produkt: noch „Test“ (erscheint unter „Neue Produkte“ auf Angebots-PDF). */
export function BackshopOfferSheetTestBadge({
  item,
  listType,
}: {
  item: DisplayItem
  listType: 'obst' | 'backshop'
}) {
  if (listType !== 'backshop' || !item.is_custom || !item.backshop_offer_sheet_test) return null
  return (
    <Badge
      variant="secondary"
      className="text-[10px] font-normal shrink-0 bg-sky-100 text-sky-900 border-0"
      title="Auf dem PDF „Nur Angebote“ unter „Neue Produkte“"
    >
      Test
    </Badge>
  )
}

/** Kompakter Link zur Marken-Tinder-Gruppe (nur digital), wenn Teilmengen-Markenwahl. */
export function BackshopMarkenTinderHintLine({
  item,
  hrefForGroup,
}: {
  item: DisplayItem
  hrefForGroup?: (groupId: string) => string
}) {
  const gid = item.backshop_tinder_group_id
  const n = item.backshop_other_group_sources_count
  if (gid == null || n == null || n <= 0 || !hrefForGroup) return null
  const label =
    n === 1
      ? 'Weitere Marke in dieser Gruppe – in der Marken-Auswahl anpassen'
      : 'Weitere Marken in dieser Gruppe – in der Marken-Auswahl anpassen'
  return (
    <Link
      to={hrefForGroup(gid)}
      className="inline-flex shrink-0 items-center rounded-sm p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      aria-label={label}
      title={label}
      data-tour="backshop-master-marken-hint"
      onClick={(e) => e.stopPropagation()}
    >
      <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}

export function OfferKindBadge({ item }: { item: DisplayItem }) {
  if (!item.is_offer) return null
  const central = item.offer_source_kind === 'central'
  return (
    <span
      className="inline-flex items-center gap-0.5 shrink-0"
      title={central ? 'Zentrale Werbung' : 'Eigene Werbung'}
    >
      {central ? (
        <Megaphone className="h-3.5 w-3.5 text-red-800 shrink-0" aria-hidden />
      ) : (
        <Tag className="h-3.5 w-3.5 text-red-800 shrink-0" aria-hidden />
      )}
      <Badge variant="secondary" className="text-xs font-normal bg-red-100 text-red-800 border-0">
        Angebot
      </Badge>
    </span>
  )
}
