// KW-Detail: zentrale Werbungsartikel (Kacheln + Tabelle), Bestellzahlen, Strichcode

import { useCallback, useEffect, useRef, useState, startTransition } from 'react'
import { Barcode, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BackshopPluBarcodeDialog } from '@/components/backshop-werbung/BackshopPluBarcodeDialog'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { formatPreisEur, getDisplayPlu } from '@/lib/plu-helpers'
import type { BackshopWerbungResolvedLine } from '@/hooks/useBackshopWerbungLinesWithMaster'
import type { BackshopWerbungWeekdayQuantity } from '@/types/database'
import {
  useUpsertBackshopWerbungWeekdayQuantities,
} from '@/hooks/useBackshopWerbungWeekdayQuantities'
import { cn } from '@/lib/utils'

function formatOptionalEur(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return formatPreisEur(Number(v))
}

function parseQtyInput(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

type WeekdayField = 'qty_mo' | 'qty_di' | 'qty_mi' | 'qty_do' | 'qty_fr' | 'qty_sa'

const WEEKDAYS: { key: WeekdayField; label: string }[] = [
  { key: 'qty_mo', label: 'Mo' },
  { key: 'qty_di', label: 'Di' },
  { key: 'qty_mi', label: 'Mi' },
  { key: 'qty_do', label: 'Do' },
  { key: 'qty_fr', label: 'Fr' },
  { key: 'qty_sa', label: 'Sa' },
]

const PRICE_MIN = 'min-w-[4.75rem] sm:min-w-[5.25rem]'

/** Zentrierte Preis-Zelle, neutral getrennt (ohne Primary-Akzent am Rand) */
function tdPrice(block: 'liste' | 'aktion', edge: 'first' | 'second'): string {
  const base = `px-3 py-2.5 align-middle text-center tabular-nums text-sm ${PRICE_MIN}`
  if (block === 'liste') {
    return edge === 'first'
      ? `${base} border-l border-border/60 bg-muted/30`
      : `${base} bg-muted/30`
  }
  return edge === 'first'
    ? `${base} border-l border-dashed border-border/55 bg-muted/15`
    : `${base} bg-muted/15`
}

function thPrice(block: 'liste' | 'aktion', edge: 'first' | 'second'): string {
  const base = `px-3 py-2.5 text-center font-medium align-middle ${PRICE_MIN}`
  if (block === 'liste') {
    return edge === 'first'
      ? `${base} border-l border-border/60 bg-muted/35`
      : `${base} bg-muted/35`
  }
  return edge === 'first'
    ? `${base} border-l border-dashed border-border/55 bg-muted/22`
    : `${base} bg-muted/22`
}

interface ArticleWeekdayEditorProps {
  kw: number
  jahr: number
  plu: string
  stored: BackshopWerbungWeekdayQuantity | undefined
  readOnly: boolean
  /** In breiter Desktop-Tabelle: festes 3×2-Raster statt 6 Spalten (verhindert gequetschte Mo–Sa-Zelle). */
  layout?: 'responsive' | 'tableGrid'
}

function ArticleWeekdayEditor({
  kw,
  jahr,
  plu,
  stored,
  readOnly,
  layout = 'responsive',
}: ArticleWeekdayEditorProps) {
  const mutation = useUpsertBackshopWerbungWeekdayQuantities()
  const [values, setValues] = useState<Record<WeekdayField, string>>({
    qty_mo: '',
    qty_di: '',
    qty_mi: '',
    qty_do: '',
    qty_fr: '',
    qty_sa: '',
  })
  const valuesRef = useRef(values)
  useEffect(() => {
    valuesRef.current = values
  }, [values])

  useEffect(() => {
    const init = (v: number | null | undefined) =>
      v != null && !Number.isNaN(Number(v)) ? String(v) : ''
    startTransition(() => {
      setValues({
        qty_mo: init(stored?.qty_mo ?? null),
        qty_di: init(stored?.qty_di ?? null),
        qty_mi: init(stored?.qty_mi ?? null),
        qty_do: init(stored?.qty_do ?? null),
        qty_fr: init(stored?.qty_fr ?? null),
        qty_sa: init(stored?.qty_sa ?? null),
      })
    })
  }, [stored])

  const persist = useCallback(() => {
    if (readOnly) return
    const v = valuesRef.current
    mutation.mutate({
      kw_nummer: kw,
      jahr,
      plu,
      qty_mo: parseQtyInput(v.qty_mo),
      qty_di: parseQtyInput(v.qty_di),
      qty_mi: parseQtyInput(v.qty_mi),
      qty_do: parseQtyInput(v.qty_do),
      qty_fr: parseQtyInput(v.qty_fr),
      qty_sa: parseQtyInput(v.qty_sa),
    })
  }, [readOnly, kw, jahr, plu, mutation])

  const onChange = (key: WeekdayField, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }))
  }

  const gridClass =
    layout === 'tableGrid'
      ? 'grid grid-cols-3 gap-2 w-full'
      : 'grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 w-full'

  return (
    <div className={gridClass}>
      {WEEKDAYS.map(({ key, label }) => (
        <label
          key={key}
          className={cn(
            'flex flex-col gap-0.5 text-xs',
            layout === 'tableGrid' ? 'min-w-0' : 'w-14 max-w-[4rem]',
          )}
        >
          <span
            className={cn(
              'text-muted-foreground font-medium',
              layout === 'tableGrid' ? 'text-center' : 'text-center sm:text-left',
            )}
          >
            {label}
          </span>
          <input
            type="text"
            inputMode="decimal"
            disabled={readOnly}
            className={cn(
              'h-9 w-full rounded-md border border-input bg-background px-1.5 text-sm disabled:opacity-60',
              layout === 'tableGrid' ? 'text-center min-w-0' : 'max-w-[3.75rem] text-center sm:text-left',
            )}
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
            onBlur={() => persist()}
            aria-label={`Bestellmenge ${label}`}
          />
        </label>
      ))}
    </div>
  )
}

export interface BackshopWerbungKwDetailContentProps {
  kw: number
  jahr: number
  lines: BackshopWerbungResolvedLine[]
  weekdayMap: Map<string, BackshopWerbungWeekdayQuantity>
  readOnlyWeekdays: boolean
}

export function BackshopWerbungKwDetailContent({
  kw,
  jahr,
  lines,
  weekdayMap,
  readOnlyWeekdays,
}: BackshopWerbungKwDetailContentProps) {
  const [barcodeFor, setBarcodeFor] = useState<{
    plu: string
    name: string
    source_art_nr: string | null
  } | null>(null)

  const openBarcode = (plu: string, name: string, source_art_nr: string | null) => {
    setBarcodeFor({ plu, name, source_art_nr })
  }

  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Für diese Kalenderwoche sind keine zugeordneten Werbeartikel hinterlegt.
      </p>
    )
  }

  return (
    <>
      {/* Breite Tabelle erst ab lg – darunter Karten (vermeidet „Zwickel“ zwischen Handy und Desktop). */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border w-full" data-testid="backshop-werbung-detail-table-wrap">
        <table className="w-full min-w-[56rem] text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/25">
              <th
                rowSpan={2}
                className="px-2 py-2 text-left font-medium align-middle w-28 border-b border-border/80"
              >
                Bild
              </th>
              <th
                rowSpan={2}
                className="px-2 py-2 text-left font-medium align-middle whitespace-nowrap border-b border-border/80"
              >
                PLU
              </th>
              <th
                rowSpan={2}
                className="px-2 py-2 text-left font-medium align-middle min-w-[8rem] max-w-[min(28vw,14rem)] border-b border-border/80"
              >
                Artikel
              </th>
              <th
                colSpan={2}
                scope="colgroup"
                className="px-3 py-3 text-center border-l border-border/60 bg-muted/45 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.35)]"
              >
                <span className="block text-sm font-semibold text-foreground tracking-tight">
                  Normalpreise
                </span>
                <span className="block text-[11px] font-normal text-muted-foreground mt-1 leading-snug">
                  Liste · regulärer Einkauf / Verkauf
                </span>
              </th>
              <th
                colSpan={2}
                scope="colgroup"
                className="px-3 py-3 text-center border-l border-dashed border-border/55 bg-muted/28 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.25)]"
              >
                <span className="block text-sm font-semibold text-foreground tracking-tight">
                  Aktionspreise
                </span>
                <span className="block text-[11px] font-normal text-muted-foreground mt-1 leading-snug">
                  Werbung · Aktions-EK / -VK
                </span>
              </th>
              <th
                rowSpan={2}
                className="px-2 py-2 text-left font-medium align-middle w-[15rem] min-w-[15rem] border-b border-border/80"
              >
                Mo–Sa
              </th>
              <th
                rowSpan={2}
                className="px-2 py-2 text-center font-medium align-middle w-12 border-b border-border/80"
              >
                Code
              </th>
            </tr>
            <tr className="border-b border-border/60 bg-muted/25">
              <th
                className={thPrice('liste', 'first')}
                title="Listen-EK (z. B. Nor. WP)"
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Liste
                  </span>
                  <span className="text-sm font-semibold">EK</span>
                </span>
              </th>
              <th className={thPrice('liste', 'second')} title="Listen-VK (z. B. Nor. UVP)">
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Liste
                  </span>
                  <span className="text-sm font-semibold">VK</span>
                </span>
              </th>
              <th
                className={thPrice('aktion', 'first')}
                title="Aktions-EK (z. B. Akt. WP)"
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Aktion
                  </span>
                  <span className="text-sm font-semibold">EK</span>
                </span>
              </th>
              <th className={thPrice('aktion', 'second')} title="Aktions-VK (z. B. Akt. UVP)">
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Aktion
                  </span>
                  <span className="text-sm font-semibold">VK</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineId} className="border-b border-border/80 even:bg-muted/20">
                <td className="px-2 py-2 align-middle w-28">
                  <BackshopThumbnail src={line.image_url} size="2xl" />
                </td>
                <td className="px-2 py-2 align-middle font-medium text-base text-foreground tabular-nums whitespace-nowrap">
                  {getDisplayPlu(line.plu)}
                </td>
                <td className="px-2 py-2 align-middle min-w-0 max-w-[min(28vw,14rem)] break-words text-base text-foreground">
                  {line.display_name}
                </td>
                <td className={tdPrice('liste', 'first')}>{formatOptionalEur(line.list_ek)}</td>
                <td className={tdPrice('liste', 'second')}>{formatOptionalEur(line.list_vk)}</td>
                <td className={tdPrice('aktion', 'first')}>{formatOptionalEur(line.purchase_price)}</td>
                <td className={tdPrice('aktion', 'second')}>{formatOptionalEur(line.promo_price)}</td>
                <td className="px-2 py-2 align-middle w-[15rem] min-w-[15rem]">
                  <ArticleWeekdayEditor
                    kw={kw}
                    jahr={jahr}
                    plu={line.plu}
                    stored={weekdayMap.get(line.plu)}
                    readOnly={readOnlyWeekdays}
                    layout="tableGrid"
                  />
                </td>
                <td className="px-2 py-2 align-middle text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Strichcode anzeigen"
                    onClick={() =>
                      openBarcode(line.plu, line.display_name, line.source_art_nr)
                    }
                  >
                    <Barcode className="h-5 w-5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablet & schmaler Desktop bis lg: Kartenlayout */}
      <div className="lg:hidden space-y-4" data-testid="backshop-werbung-detail-cards">
        {lines.map((line) => (
          <Card key={line.lineId} className="overflow-hidden shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="shrink-0 w-28 h-28 rounded-md border bg-muted/40 overflow-hidden flex items-center justify-center p-1.5">
                  {line.image_url ? (
                    <img
                      src={line.image_url}
                      alt=""
                      className="max-h-full max-w-full w-auto h-auto object-contain [image-rendering:crisp-edges]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold text-base text-foreground leading-snug break-words">{line.display_name}</p>
                  <p className="text-base font-medium text-foreground tabular-nums">
                    PLU {getDisplayPlu(line.plu)}
                  </p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="mb-1.5">
                        <p className="text-sm font-semibold text-foreground tracking-tight">Normalpreise</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          Liste · regulärer Einkauf / Verkauf
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-border/60 bg-muted/30 p-2.5 text-center">
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Liste · EK</dt>
                          <dd className="font-medium tabular-nums mt-0.5">{formatOptionalEur(line.list_ek)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Liste · VK</dt>
                          <dd className="font-medium tabular-nums mt-0.5">{formatOptionalEur(line.list_vk)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <div className="mb-1.5">
                        <p className="text-sm font-semibold text-foreground tracking-tight">Aktionspreise</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          Werbung · Aktions-EK / -VK
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-dashed border-border/55 bg-muted/15 p-2.5 text-center">
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Aktion · EK</dt>
                          <dd className="font-medium tabular-nums mt-0.5">{formatOptionalEur(line.purchase_price)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Aktion · VK</dt>
                          <dd className="font-medium tabular-nums mt-0.5">{formatOptionalEur(line.promo_price)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <ArticleWeekdayEditor
                kw={kw}
                jahr={jahr}
                plu={line.plu}
                stored={weekdayMap.get(line.plu)}
                readOnly={readOnlyWeekdays}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  openBarcode(line.plu, line.display_name, line.source_art_nr)
                }
              >
                <Barcode className="h-4 w-4 mr-2" />
                Strichcode anzeigen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {barcodeFor && (
        <BackshopPluBarcodeDialog
          open={!!barcodeFor}
          onOpenChange={(open) => {
            if (!open) setBarcodeFor(null)
          }}
          plu={barcodeFor.plu}
          productName={barcodeFor.name}
          sourceArtNr={barcodeFor.source_art_nr}
          kw={kw}
          jahr={jahr}
        />
      )}
    </>
  )
}
