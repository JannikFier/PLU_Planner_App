// Zentrale + eigene Werbung: Desktop-Tabelle + Mobile-Stack (Obst & Backshop, gleiche Struktur)

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Pencil, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPreisEur, getDisplayPlu } from '@/lib/plu-helpers'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Zeile „Zentrale Werbung“ (vom Parent vorberechnet) */
export type CentralOfferCampaignRow = {
  plu: string
  name: string
  hiddenForStore: boolean
  central: number
  effective: number
  localOverride: number | null
  /** Nur Backshop: Produktbild (Master/Custom) */
  thumbUrl?: string | null
}

type PreisBearbeitenVariant = 'desktop' | 'mobile-obst' | 'mobile-backshop'

function PreisBearbeitenBlock({
  row,
  isViewer,
  variant,
  onOpen,
}: {
  row: CentralOfferCampaignRow
  isViewer: boolean
  variant: PreisBearbeitenVariant
  onOpen: () => void
}) {
  if (isViewer) {
    return (
      <div className="space-y-1 max-w-[220px] text-sm">
        <p className="text-xs text-muted-foreground">
          Zentral:{' '}
          <span className="tabular-nums font-medium text-foreground">{formatPreisEur(row.central)}</span>
        </p>
        <p className="tabular-nums font-semibold">Anzeige: {formatPreisEur(row.effective)}</p>
      </div>
    )
  }

  const compactMobile = variant === 'mobile-obst' || variant === 'mobile-backshop'
  const oneLineBackshop = variant === 'mobile-backshop'

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full max-w-full items-start gap-2 rounded-md border border-transparent text-left transition-colors',
        'hover:bg-muted/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'desktop' && 'max-w-[280px] px-2 py-2',
        variant === 'mobile-obst' && 'border border-border bg-muted/20 px-3 py-2',
        variant === 'mobile-backshop' && 'border border-border bg-muted/15 px-2 py-1.5',
      )}
      title="Verkaufspreis für die Anzeige bearbeiten"
    >
      <div className="min-w-0 flex-1">
        {oneLineBackshop ? (
          <p className="text-xs leading-snug">
            <span className="text-muted-foreground">Zentral </span>
            <span className="tabular-nums font-medium">{formatPreisEur(row.central)}</span>
            <span className="text-muted-foreground"> · Anz. </span>
            <span className="tabular-nums font-semibold">{formatPreisEur(row.effective)}</span>
          </p>
        ) : compactMobile ? (
          <p className="text-xs leading-snug">
            <span className="text-muted-foreground">Zentral </span>
            <span className="tabular-nums font-medium">{formatPreisEur(row.central)}</span>
            <span className="text-muted-foreground"> · Anzeige </span>
            <span className="tabular-nums font-semibold">{formatPreisEur(row.effective)}</span>
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Zentral:{' '}
              <span className="tabular-nums font-medium text-foreground">{formatPreisEur(row.central)}</span>
            </p>
            <p className="tabular-nums font-semibold mt-0.5">Anzeige: {formatPreisEur(row.effective)}</p>
          </>
        )}
      </div>
      <Pencil
        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground mt-0.5"
        aria-hidden
      />
      <span className="sr-only">Preis bearbeiten</span>
    </button>
  )
}

export interface CentralOfferCampaignSectionProps {
  title: string
  description: string
  /** Scroll-/Mess-Root für E2E (z. B. offer-central-campaign-scroll-root) */
  dataTestId: string
  currentKw: number
  currentJahr: number
  rows: CentralOfferCampaignRow[]
  isViewer: boolean
  togglePending: boolean
  /** Megaphon: hiddenForStore = aktuell für Markt deaktiviert */
  onToggleMegaphone: (plu: string, hiddenForStore: boolean) => void
  onOpenLocalPrice: (row: CentralOfferCampaignRow) => void
  /** Backshop: Bildspalte + kompaktere Mobile-Zeilen */
  domain?: 'obst' | 'backshop'
}

export function CentralOfferCampaignSection({
  title,
  description,
  dataTestId,
  currentKw,
  currentJahr,
  rows,
  isViewer,
  togglePending,
  onToggleMegaphone,
  onOpenLocalPrice,
  domain = 'obst',
}: CentralOfferCampaignSectionProps) {
  const isBackshop = domain === 'backshop'

  return (
    <CardSectionHeader title={title} description={description} kw={currentKw} jahr={currentJahr}>
      <div className="max-w-full min-w-0" data-testid={dataTestId}>
        <div className="hidden md:block min-w-0 overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-12" />
              {isBackshop && <col className="w-28" />}
              <col className="w-[5.5rem]" />
              <col className={isBackshop ? 'w-[34%]' : 'w-[40%]'} />
              <col className="min-w-0" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-border">
                <th className="px-3 py-3 w-12" aria-label="Megafon" />
                {isBackshop && (
                  <th
                    className="w-28 px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    aria-label="Bild"
                  />
                )}
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  PLU
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                  Artikel
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                  Preis
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.plu}
                  className={cn(
                    'border-b border-border last:border-b-0 hover:bg-muted/30',
                    row.hiddenForStore && 'opacity-50 line-through',
                  )}
                >
                  <td className="px-3 py-2 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      title={
                        row.hiddenForStore
                          ? 'Werbung für diesen Markt aktivieren'
                          : 'Werbung für diesen Markt ausblenden'
                      }
                      onClick={() => onToggleMegaphone(row.plu, row.hiddenForStore)}
                      disabled={togglePending}
                    >
                      <Megaphone className={cn('h-4 w-4', row.hiddenForStore && 'opacity-40')} />
                    </Button>
                  </td>
                  {isBackshop && (
                    <td className="px-2 py-2 align-middle w-28">
                      <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                    </td>
                  )}
                  <td className="px-3 py-2 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(row.plu)}</td>
                  <td className="px-3 py-2 text-sm align-middle break-words min-w-0">{row.name}</td>
                  <td className="px-3 py-2 text-sm align-middle min-w-0">
                    <PreisBearbeitenBlock
                      row={row}
                      isViewer={isViewer}
                      variant="desktop"
                      onOpen={() => onOpenLocalPrice(row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden divide-y divide-border" data-testid={`${dataTestId}-mobile-list`}>
          {rows.map((row) => (
            <li key={row.plu} className="px-3 py-2.5">
              <div className="flex gap-2 items-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  title={
                    row.hiddenForStore
                      ? 'Werbung für diesen Markt aktivieren'
                      : 'Werbung für diesen Markt ausblenden'
                  }
                  onClick={() => onToggleMegaphone(row.plu, row.hiddenForStore)}
                  disabled={togglePending}
                >
                  <Megaphone className={cn('h-4 w-4', row.hiddenForStore && 'opacity-40')} />
                </Button>
                {isBackshop && (
                  <div className="shrink-0 pt-0.5">
                    <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-mono text-sm">{getDisplayPlu(row.plu)}</p>
                  <p className="text-sm font-medium break-words leading-snug">{row.name}</p>
                  <PreisBearbeitenBlock
                    row={row}
                    isViewer={isViewer}
                    variant={isBackshop ? 'mobile-backshop' : 'mobile-obst'}
                    onOpen={() => onOpenLocalPrice(row)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </CardSectionHeader>
  )
}

function CardSectionHeader({
  title,
  description,
  kw,
  jahr,
  children,
}: {
  title: string
  description: string
  kw: number
  jahr: number
  children: ReactNode
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <h3 className="text-sm font-semibold">
          {title} (KW {kw}/{jahr})
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </>
  )
}

/** Zeile „Eigene Werbung“ */
export type LocalOwnOfferRow = {
  id: string
  plu: string
  name: string
  promoPrice: number | null
  durationWeeks: number
  isActive: boolean
}

export interface LocalOwnOfferSectionProps {
  title: string
  dataTestId: string
  rows: LocalOwnOfferRow[]
  updatePending: boolean
  removePending: boolean
  onDurationChange: (plu: string, durationWeeks: number) => void
  onRemove: (plu: string) => void
}

export function LocalOwnOfferSection({
  title,
  dataTestId,
  rows,
  updatePending,
  removePending,
  onDurationChange,
  onRemove,
}: LocalOwnOfferSectionProps) {
  return (
    <>
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="max-w-full min-w-0" data-testid={dataTestId}>
        <div className="hidden md:block min-w-0 overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[5.5rem]" />
              <col className="w-[38%]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
              <col className="w-[6rem]" />
              <col className="w-[12rem]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-border">
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  PLU
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                  Artikel
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Aktionspreis
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Laufzeit
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-right w-[12rem]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(row.plu)}</td>
                  <td className="px-3 py-3 text-sm align-middle min-w-0 break-words">{row.name}</td>
                  <td className="px-3 py-3 text-sm tabular-nums align-middle">
                    {row.promoPrice != null ? formatPreisEur(row.promoPrice) : '–'}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Select
                      value={String(row.durationWeeks)}
                      onValueChange={(v) => onDurationChange(row.plu, Number(v))}
                      disabled={updatePending}
                    >
                      <SelectTrigger className="w-[min(100%,120px)] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Woche</SelectItem>
                        <SelectItem value="2">2 Wochen</SelectItem>
                        <SelectItem value="3">3 Wochen</SelectItem>
                        <SelectItem value="4">4 Wochen</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    {row.isActive ? (
                      <Badge variant="default" className="text-xs">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Abgelaufen
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(row.plu)}
                      disabled={removePending}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      Aus Werbung entfernen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden divide-y divide-border" data-testid={`${dataTestId}-mobile-list`}>
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 space-y-3">
              <div>
                <p className="font-mono text-sm">{getDisplayPlu(row.plu)}</p>
                <p className="text-sm break-words mt-1">{row.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Aktionspreis:</span>
                <span className="tabular-nums font-medium">
                  {row.promoPrice != null ? formatPreisEur(row.promoPrice) : '–'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Laufzeit:</span>
                <Select
                  value={String(row.durationWeeks)}
                  onValueChange={(v) => onDurationChange(row.plu, Number(v))}
                  disabled={updatePending}
                >
                  <SelectTrigger className="w-[min(100%,200px)] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Woche</SelectItem>
                    <SelectItem value="2">2 Wochen</SelectItem>
                    <SelectItem value="3">3 Wochen</SelectItem>
                    <SelectItem value="4">4 Wochen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {row.isActive ? (
                  <Badge variant="default" className="text-xs">
                    Aktiv
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Abgelaufen
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onRemove(row.plu)}
                  disabled={removePending}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Entfernen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
