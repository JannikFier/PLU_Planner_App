// PLUTable: Zwei-Spalten-Tabelle mit Buchstaben-/Block-Headern, Flussrichtung und Trennlinien
// Unterstützt Auswahl-Modus (Checkboxen), optional Find-in-Page (Suche mit Pfeilen + Markierung)

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  PLU_TABLE_HEADER_CLASS,
  PLU_TABLE_HEADER_GEWICHT_CLASS,
  PLU_TABLE_HEADER_STUECK_CLASS,
} from '@/lib/constants'
import {
  groupItemsByLetter,
  groupItemsByBlock,
  splitLetterGroupsIntoColumns,
  getDisplayNameForItem,
  getDisplayPreisForItem,
  itemMatchesSearch,
  formatPluBlockSectionHeaderForDisplay,
  isLetterPluSectionHeaderLabel,
} from '@/lib/plu-helpers'
import {
  paginateNewspaperColumns,
  computeObstNewspaperHeightsPx,
  newspaperRowsToFlatRows,
  flattenNewspaperPagesToRows,
} from '@/lib/newspaper-column-pages'
import { cn } from '@/lib/utils'
import { obstOfferNameInnerClass } from '@/lib/obst-offer-name-highlight'
import { scrollToDataRowIndex } from '@/lib/find-in-page-scroll'
import { useFindInPage } from '@/hooks/useFindInPage'
import { Link } from 'react-router-dom'
import { GitCompareArrows, Megaphone, Search, Tag } from 'lucide-react'
import { FindInPageBar } from '@/components/plu/FindInPageBar'
import { FindInPageFixedPortal } from '@/components/plu/FindInPageFixedPortal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import { HighlightedSearchText } from './HighlightedSearchText'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import type { Block, StoreObstBlockOrder } from '@/types/database'
import { sortBlocksWithStoreOrder } from '@/lib/block-override-utils'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'

function itemHasDisplayPreis(item: DisplayItem | undefined): boolean {
  if (!item) return false
  return getDisplayPreisForItem(item) != null
}

/** Inline-Badge mit Marke (nur Backshop, nicht im PDF). */
function BackshopSourceInlineBadge({ item, listType }: { item: DisplayItem; listType: 'obst' | 'backshop' }) {
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

/** Kompakter Link zur Marken-Tinder-Gruppe (nur digital), wenn Teilmengen-Markenwahl. */
function BackshopMarkenTinderHintLine({
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

function OfferKindBadge({ item }: { item: DisplayItem }) {
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

/** Schriftgrößen aus den Layout-Einstellungen */
export interface FontSizes {
  header: number  // Titel-Banner ("PLU-Liste", "PLU-Liste Stück")
  column: number  // Gruppen-Header (— A —, Obst, etc.) + Spaltenköpfe
  product: number // PLU + Artikelname
}

const DEFAULT_FONT_SIZES: FontSizes = { header: 24, column: 16, product: 12 }

/** Backshop: Bildspalte – auf schmalen Screens kleiner, damit PLU/Artikel/Preis nicht überlappen */
const BACKSHOP_IMAGE_COL = 'w-[72px] sm:w-[96px] md:w-[128px]'
const BACKSHOP_IMAGE_SIZE = 'h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24'
/** object-contain = nichts abschneiden; crisp-edges = schärfere Skalierung */
const BACKSHOP_IMAGE_CLASS = 'object-contain rounded border border-border [image-rendering:crisp-edges]'

/** Mobile Kartenliste (nur md:hidden): größeres Bild zur besseren Erkennbarkeit */
const BACKSHOP_IMAGE_SIZE_LIST = 'h-24 w-24'

/** Zeigt Backshop-Bild oder Platzhalter; bei Lade fehler (kaputte URL) ebenfalls Platzhalter statt Broken-Icon. */
function BackshopImage({ src, size = 'default' }: { src: string | null | undefined; size?: 'default' | 'list' }) {
  const [loadFailed, setLoadFailed] = useState(false)
  const showPlaceholder = !src || loadFailed
  const box = size === 'list' ? BACKSHOP_IMAGE_SIZE_LIST : BACKSHOP_IMAGE_SIZE
  if (showPlaceholder) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded border border-border bg-muted/50 text-muted-foreground text-xs',
          box,
        )}
        data-tour="backshop-master-thumbnail"
      >
        –
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={cn(box, BACKSHOP_IMAGE_CLASS)}
      data-tour="backshop-master-thumbnail"
      onError={() => setLoadFailed(true)}
    />
  )
}

interface PLUTableProps {
  items: DisplayItem[]
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode?: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks?: Block[]
  /** Obst: Markt-Reihenfolge der Warengruppen (`store_obst_block_order`) für Liste und Suche – muss zu PDF passen. */
  obstStoreBlockOrder?: StoreObstBlockOrder[]
  fontSizes?: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  /** Suchleiste mit Find-in-Page (Pfeile, Markierung, Springen) oberhalb der Tabelle */
  showFindInPage?: boolean
  /**
   * Wenn true: kein „In Liste suchen“-Button in der Tabelle – Öffnen z. B. per Toolbar-Lupe (ref.openFindInPage).
   * Die Suchleiste erscheint fixiert oben rechts (unter dem App-Header).
   */
  findInPageExternalTrigger?: boolean
  /** Obst/Gemüse (Standard) oder Backshop (Bild-Spalte, eine Liste) */
  listType?: 'obst' | 'backshop'
  /**
   * Nur Backshop, Masterliste: Link-Ziel pro Produktgruppe für Hinweis bei Teilmengen-Markenwahl
   * (`?focusGroup=…` am Marken-Tinder).
   */
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}

/** Imperative API für externe Toolbar (Lupen-Button) */
export interface PLUTableHandle {
  openFindInPage: () => void
  closeFindInPage: () => void
}

/** Einzelne Zeile in der flachen Liste (Item oder Header) */
interface FlatRow {
  type: 'header' | 'item'
  label?: string
  item?: DisplayItem
}

/** Zeile für ROW_BY_ROW Rendering */
interface TableRow {
  type: 'fullHeader' | 'itemPair'
  label?: string
  left?: DisplayItem
  right?: DisplayItem
}

/** Baut flache Liste aus Buchstaben-Gruppen */
function buildFlatRowsFromLetterGroups(groups: LetterGroup<DisplayItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: `— ${group.letter} —` })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Baut flache Liste aus Block-Gruppen */
function buildFlatRowsFromBlockGroups(groups: BlockGroup<DisplayItem>[]): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.blockName })
    for (const item of group.items) {
      rows.push({ type: 'item', item })
    }
  }
  return rows
}

/** Gruppen in ROW_BY_ROW TableRows umwandeln: Header full-width, Items paarweise */
function buildRowByRowTable(groups: (LetterGroup<DisplayItem> | BlockGroup<DisplayItem>)[]): TableRow[] {
  const rows: TableRow[] = []
  for (const group of groups) {
    const label = 'letter' in group ? `— ${group.letter} —` : group.blockName
    rows.push({ type: 'fullHeader', label })

    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({
        type: 'itemPair',
        left: items[i],
        right: items[i + 1] ?? undefined,
      })
    }
  }
  return rows
}

/** Rendert eine einzelne Spalte der Tabelle (für COLUMN_FIRST). Bei listType backshop: Bild | PLU | Name */
function PLUColumn({
  rows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
  findInPageQuery,
  listType = 'obst',
  /** Spalten-Zeitung Obst: Buchstaben-Header gleiche Schriftgröße wie Produktzeilen */
  letterGroupHeaderFontPx,
  backshopMarkenTinderHrefForGroup,
}: {
  rows: FlatRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
  /** Nur für aktuelle Trefferzeile: Teilstring-Markierung in PLU/Name */
  findInPageQuery?: string
  listType?: 'obst' | 'backshop'
  letterGroupHeaderFontPx?: number
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}) {
  const groupHeaderFontPx = letterGroupHeaderFontPx ?? fonts.column
  const hasAnyPrice = useMemo(
    () => rows.some((r) => r.type === 'item' && itemHasDisplayPreis(r.item)),
    [rows],
  )
  const showImageColumn = listType === 'backshop'
  const firstItemRowIdx = useMemo(
    () => rows.findIndex((r) => r.type === 'item' && r.item != null),
    [rows],
  )

  const colCount = (selectionMode ? 1 : 0) + (showImageColumn ? 1 : 0) + 2 + (hasAnyPrice ? 1 : 0)

  return (
    <div className="flex-1 min-w-0">
      <table className="w-full table-fixed">
        <colgroup>
          {selectionMode && <col className="w-[36px]" />}
          {showImageColumn && <col className={BACKSHOP_IMAGE_COL} />}
          <col className="w-[80px]" />
          <col />
          {hasAnyPrice && <col className="w-[90px]" />}
        </colgroup>
        <thead>
          <tr className="border-b-2 border-border">
            {selectionMode && <th className="px-1 py-1.5" />}
            {showImageColumn && (
              <th
                className="px-1 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-r border-border"
                style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
              >
                Bild
              </th>
            )}
            <th
              className="px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
            >
              PLU
            </th>
            <th
              className="px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border"
              style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
            >
              Artikel
            </th>
            {hasAnyPrice && (
              <th
                className="px-2 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]"
                style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
              >
                Preis
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'header') {
              const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
              const raw = row.label ?? ''
              const letterHdr = isLetterPluSectionHeaderLabel(raw)
              const displayLabel = formatPluBlockSectionHeaderForDisplay(raw)
              return (
                <tr
                  key={`header-${i}-${row.label}`}
                  className="border-b border-border"
                  {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
                >
                  <td
                    colSpan={colCount}
                    className={cn(
                      'px-2 text-center font-bold text-muted-foreground bg-muted/50',
                      letterHdr ? 'tracking-widest uppercase' : 'tracking-wide',
                    )}
                    style={{
                      fontSize: groupHeaderFontPx + 'px',
                      paddingTop: '0.35em',
                      paddingBottom: '0.35em',
                    }}
                  >
                    {displayLabel}
                  </td>
                </tr>
              )
            }

            const item = row.item
            if (!item) return null
            const isSelected = selectedPLUs?.has(item.plu) ?? false
            const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
            const isActiveFindRow =
              findInPageHighlightRowIndex != null &&
              rowIndex !== undefined &&
              rowIndex === findInPageHighlightRowIndex
            const hq = isActiveFindRow ? findInPageQuery : undefined

            return (
              <tr
                key={item.id}
                {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
                {...(listType === 'backshop' && i === firstItemRowIdx && {
                  'data-tour': 'backshop-master-first-row',
                })}
                className={cn(
                  'border-b border-border last:border-b-0',
                  selectionMode && 'cursor-pointer hover:bg-muted/30',
                  isSelected && 'bg-primary/5',
                  isActiveFindRow && 'bg-primary/15 ring-1 ring-inset ring-primary/35',
                )}
                onClick={selectionMode ? () => onToggleSelect?.(item.plu) : undefined}
              >
                {selectionMode && (
                  <td className="px-1 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(item.plu)}
                      className="h-4 w-4 rounded border-border"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {showImageColumn && (
                  <td className="px-1 py-1 align-middle border-l border-r border-border">
                    <BackshopImage src={item.image_url} />
                  </td>
                )}
                <td className="px-2" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}>
                  <StatusBadge
                    plu={item.plu}
                    status={item.status}
                    oldPlu={item.old_plu}
                    style={{ fontSize: fonts.product + 'px' }}
                    highlightQuery={hq}
                  />
                </td>
                <td
                  className="px-2 break-words min-w-0 border-l border-border"
                  style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                  title={getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                >
                  <div className="min-w-0">
                    <span
                      className={cn(
                        obstOfferNameInnerClass(listType, item.offer_name_highlight_kind),
                        listType === 'backshop' &&
                          'inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 align-middle',
                      )}
                    >
                      {hq?.trim() ? (
                        <HighlightedSearchText
                          text={getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                          query={hq}
                        />
                      ) : (
                        getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
                      )}
                      <BackshopSourceInlineBadge item={item} listType={listType} />
                      <OfferKindBadge item={item} />
                      {listType === 'backshop' && (
                        <BackshopMarkenTinderHintLine
                          item={item}
                          hrefForGroup={backshopMarkenTinderHrefForGroup}
                        />
                      )}
                    </span>
                  </div>
                </td>
                {hasAnyPrice && (
                  <td className="w-[90px] min-w-[90px] px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}>
                    {(() => {
                      const p = getDisplayPreisForItem(item)
                      return p != null ? (
                        <PreisBadge value={p} style={{ fontSize: fonts.product + 'px' }} />
                      ) : null
                    })()}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Mobile Backshop: Kartenliste (Bild + Name + Preis + PLU) statt enger 4-Spalten-Tabelle */
function BackshopPLUMobileList({
  rows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
  findInPageQuery,
  backshopMarkenTinderHrefForGroup,
}: {
  rows: FlatRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
  findInPageQuery?: string
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}) {
  const firstItemRowIdx = useMemo(
    () => rows.findIndex((r) => r.type === 'item' && r.item != null),
    [rows],
  )
  return (
    <div className="flex-1 min-w-0 divide-y divide-border bg-background">
      {rows.map((row, i) => {
        if (row.type === 'header') {
          const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
          const raw = row.label ?? ''
          const letterHdr = isLetterPluSectionHeaderLabel(raw)
          const displayLabel = formatPluBlockSectionHeaderForDisplay(raw)
          return (
            <div
              key={`mheader-${i}-${row.label}`}
              {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
              className={cn(
                'bg-muted/50 px-2 py-1.5 text-center font-bold text-muted-foreground',
                letterHdr ? 'uppercase tracking-wider' : 'tracking-wide',
              )}
              style={{ fontSize: Math.min(fonts.column, 14) + 'px' }}
            >
              {displayLabel}
            </div>
          )
        }

        const item = row.item
        if (!item) return null
        const isSelected = selectedPLUs?.has(item.plu) ?? false
        const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
        const isActiveFindRow =
          findInPageHighlightRowIndex != null &&
          rowIndex !== undefined &&
          rowIndex === findInPageHighlightRowIndex
        const hq = isActiveFindRow ? findInPageQuery : undefined
        const preisVal = getDisplayPreisForItem(item)
        const showOfferOrPreisRow = item.is_offer || preisVal != null

        return (
          <div
            key={item.id}
            {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
            {...(i === firstItemRowIdx && { 'data-tour': 'backshop-master-first-row' })}
            className={cn(
              'flex gap-3 px-2 py-2.5',
              selectionMode && 'cursor-pointer active:bg-muted/30',
              isSelected && 'bg-primary/5',
              isActiveFindRow && 'bg-primary/15 ring-1 ring-inset ring-primary/35',
            )}
            onClick={selectionMode ? () => onToggleSelect?.(item.plu) : undefined}
          >
            {selectionMode && (
              <div className="flex shrink-0 items-start pt-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(item.plu)}
                  className="h-4 w-4 rounded border-border"
                />
              </div>
            )}
            <div className="shrink-0 self-start">
              <BackshopImage src={item.image_url} size="list" />
            </div>
            {/* Reihenfolge: Name → PLU → (Angebot + Preis eine Zeile) – nur mobile Kartenliste */}
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <div
                className="font-medium leading-snug text-foreground inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5"
                style={{ fontSize: fonts.product + 'px' }}
              >
                {hq?.trim() ? (
                  <HighlightedSearchText
                    text={getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                    query={hq}
                  />
                ) : (
                  getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
                )}
                <BackshopSourceInlineBadge item={item} listType="backshop" />
                <BackshopMarkenTinderHintLine item={item} hrefForGroup={backshopMarkenTinderHrefForGroup} />
              </div>
              <div>
                <StatusBadge
                  plu={item.plu}
                  status={item.status}
                  oldPlu={item.old_plu}
                  style={{ fontSize: Math.max(10, fonts.product - 1) + 'px' }}
                  highlightQuery={hq}
                />
              </div>
              {showOfferOrPreisRow && (
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-0.5">
                  <div className="min-w-0 flex-1">{item.is_offer ? <OfferKindBadge item={item} /> : null}</div>
                  <div className="shrink-0">
                    {preisVal != null ? (
                      <PreisBadge value={preisVal} style={{ fontSize: fonts.product + 'px' }} />
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Rendert eine Tabelle mit 4 Spalten für ROW_BY_ROW (Header über volle Breite). Bei backshop: Bild | PLU | Artikel pro Seite */
function RowByRowTable({
  tableRows,
  flatRows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
  findInPageQuery,
  listType = 'obst',
  backshopMarkenTinderHrefForGroup,
}: {
  tableRows: TableRow[]
  /** Gleiche flache Liste wie bei der mobilen Ansicht – Zuordnung data-row-index pro Artikel */
  flatRows: FlatRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
  findInPageQuery?: string
  listType?: 'obst' | 'backshop'
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}) {
  const showImageColumn = listType === 'backshop'
  const flatIndexByItemId = useMemo(() => {
    const m = new Map<string, number>()
    flatRows.forEach((r, i) => {
      if (r.type === 'item' && r.item) m.set(r.item.id, i)
    })
    return m
  }, [flatRows])
  const hasAnyPrice = useMemo(
    () =>
      tableRows.some(
        (r) =>
          r.type === 'itemPair' &&
          (itemHasDisplayPreis(r.left) || itemHasDisplayPreis(r.right)),
      ),
    [tableRows],
  )
  const totalCols = (selectionMode ? 2 : 0) + (showImageColumn ? 2 : 0) + 4 + (hasAnyPrice ? 2 : 0)
  const firstPairRowIdx = useMemo(
    () => tableRows.findIndex((r) => r.type === 'itemPair'),
    [tableRows],
  )

  return (
    <table className="w-full table-fixed">
      <colgroup>
        {selectionMode && <col className="w-[36px]" />}
        {showImageColumn && <col className={BACKSHOP_IMAGE_COL} />}
        <col className="w-[80px]" />
        <col />
        {hasAnyPrice && <col className="w-[90px]" />}
        {selectionMode && <col className="w-[36px]" />}
        {showImageColumn && <col className={BACKSHOP_IMAGE_COL} />}
        <col className="w-[80px]" />
        <col />
        {hasAnyPrice && <col className="w-[90px]" />}
      </colgroup>
      <thead>
        <tr className="border-b-2 border-border">
          {selectionMode && <th className="px-1 py-1.5" />}
          {showImageColumn && <th className="px-1 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-r border-border" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Bild</th>}
          <th className="px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>PLU</th>
          <th className="px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Artikel</th>
          {hasAnyPrice && <th className="px-2 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Preis</th>}
          {selectionMode && <th className="px-1 py-1.5 border-l-2 border-border" />}
          {showImageColumn && <th className="px-1 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l-2 border-r border-border" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Bild</th>}
          <th className={cn('px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider', !(selectionMode || hasAnyPrice || showImageColumn) && 'border-l-2 border-border')} style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>PLU</th>
          <th className="px-2 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Artikel</th>
          {hasAnyPrice && <th className="px-2 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]" style={{ fontSize: fonts.column + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}>Preis</th>}
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row, i) => {
          const off = findInPageRowOffset ?? 0
          if (row.type === 'fullHeader') {
            const headerFlatIdx = flatRows.findIndex((r) => r.type === 'header' && r.label === row.label)
            const headerDataIdx = headerFlatIdx >= 0 ? off + headerFlatIdx : undefined
            const raw = row.label ?? ''
            const letterHdr = isLetterPluSectionHeaderLabel(raw)
            const displayLabel = formatPluBlockSectionHeaderForDisplay(raw)
            return (
              <tr
                key={`header-${i}-${row.label}`}
                className="border-b border-border"
                {...(headerDataIdx !== undefined && { 'data-row-index': headerDataIdx })}
              >
                <td
                  colSpan={totalCols}
                  className={cn(
                    'px-2 text-center font-bold text-muted-foreground bg-muted/50',
                    letterHdr ? 'tracking-widest uppercase' : 'tracking-wide',
                  )}
                  style={{ fontSize: fonts.column + 'px', paddingTop: '0.35em', paddingBottom: '0.35em' }}
                >
                  {displayLabel}
                </td>
              </tr>
            )
          }

          const leftSelected = row.left ? (selectedPLUs?.has(row.left.plu) ?? false) : false
          const rightSelected = row.right ? (selectedPLUs?.has(row.right.plu) ?? false) : false
          const flatLeft = row.left ? flatIndexByItemId.get(row.left.id) : undefined
          const flatRight = row.right ? flatIndexByItemId.get(row.right.id) : undefined
          const absLeft = flatLeft !== undefined ? off + flatLeft : undefined
          const absRight = flatRight !== undefined ? off + flatRight : undefined
          const hlLeft = findInPageHighlightRowIndex != null && absLeft === findInPageHighlightRowIndex
          const hlRight = findInPageHighlightRowIndex != null && absRight === findInPageHighlightRowIndex
          const hqLeft = hlLeft ? findInPageQuery : undefined
          const hqRight = hlRight ? findInPageQuery : undefined
          /** Nur die Produkt-Hälfte (links/rechts), nicht die ganze Tabellenzeile */
          const findHL = 'bg-primary/15 ring-1 ring-inset ring-primary/35'

          return (
            <tr
              key={`pair-${i}`}
              className="border-b border-border last:border-b-0"
              {...(i === firstPairRowIdx && {
                'data-tour':
                  listType === 'backshop' ? 'backshop-master-first-row' : 'plu-table-first-data-row',
              })}
            >
              {row.left ? (
                <>
                  {selectionMode && (
                    <td
                      className={cn('px-1 py-1 text-center', hlLeft && findHL)}
                      {...(absLeft !== undefined && { 'data-row-index': absLeft })}
                    >
                      <input type="checkbox" checked={leftSelected} onChange={() => { const p = row.left?.plu; if (p) onToggleSelect?.(p) }} className="h-4 w-4 rounded border-border" />
                    </td>
                  )}
                  {showImageColumn && (
                    <td
                      className={cn('px-1 py-1 align-middle border-l border-r border-border', hlLeft && findHL)}
                      {...(!selectionMode && absLeft !== undefined && { 'data-row-index': absLeft })}
                    >
                      <BackshopImage src={row.left.image_url} />
                    </td>
                  )}
                  <td
                    className={cn('px-2', hlLeft && findHL)}
                    style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    {...(!selectionMode && !showImageColumn && absLeft !== undefined && { 'data-row-index': absLeft })}
                  >
                    <StatusBadge plu={row.left.plu} status={row.left.status} oldPlu={row.left.old_plu} style={{ fontSize: fonts.product + 'px' }} highlightQuery={hqLeft} />
                  </td>
                  <td
                    className={cn('px-2 break-words min-w-0 border-l border-border', hlLeft && findHL)}
                    style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    title={getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}
                  >
                    <div className="min-w-0">
                      <span
                        className={cn(
                          obstOfferNameInnerClass(listType, row.left.offer_name_highlight_kind),
                          listType === 'backshop' &&
                            'inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 align-middle',
                        )}
                      >
                        {hqLeft?.trim() ? (
                          <HighlightedSearchText
                            text={getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}
                            query={hqLeft}
                          />
                        ) : (
                          getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)
                        )}
                        <BackshopSourceInlineBadge item={row.left} listType={listType} />
                        <OfferKindBadge item={row.left} />
                        {listType === 'backshop' && (
                          <BackshopMarkenTinderHintLine
                            item={row.left}
                            hrefForGroup={backshopMarkenTinderHrefForGroup}
                          />
                        )}
                      </span>
                    </div>
                  </td>
                  {hasAnyPrice && (
                    <td
                      className={cn('w-[90px] min-w-[90px] px-2 border-l border-border', hlLeft && findHL)}
                      style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    >
                      {(() => {
                        const p = getDisplayPreisForItem(row.left)
                        return p != null ? <PreisBadge value={p} style={{ fontSize: fonts.product + 'px' }} /> : null
                      })()}
                    </td>
                  )}
                </>
              ) : (
                <>
                  {selectionMode && <td className="px-1 py-1" />}
                  {showImageColumn && <td className="px-1 py-1 border-l border-r border-border" />}
                  <td className="px-2" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} /><td className="px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} />
                  {hasAnyPrice && <td className="px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} />}
                </>
              )}
              {row.right ? (
                <>
                  {selectionMode && (
                    <td
                      className={cn('px-1 py-1 text-center border-l-2 border-border', hlRight && findHL)}
                      {...(absRight !== undefined && { 'data-row-index': absRight })}
                    >
                      <input type="checkbox" checked={rightSelected} onChange={() => { const p = row.right?.plu; if (p) onToggleSelect?.(p) }} className="h-4 w-4 rounded border-border" />
                    </td>
                  )}
                  {showImageColumn && (
                    <td
                      className={cn('px-1 py-1 align-middle border-l-2 border-r border-border', hlRight && findHL)}
                      {...(!selectionMode && absRight !== undefined && { 'data-row-index': absRight })}
                    >
                      <BackshopImage src={row.right.image_url} />
                    </td>
                  )}
                  <td
                    className={cn(
                      'px-2',
                      !selectionMode && !showImageColumn && 'border-l-2 border-border',
                      hlRight && findHL,
                    )}
                    style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    {...(!selectionMode && !showImageColumn && absRight !== undefined && { 'data-row-index': absRight })}
                  >
                    <StatusBadge plu={row.right.plu} status={row.right.status} oldPlu={row.right.old_plu} style={{ fontSize: fonts.product + 'px' }} highlightQuery={hqRight} />
                  </td>
                  <td
                    className={cn('px-2 break-words min-w-0 border-l border-border', hlRight && findHL)}
                    style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    title={getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}
                  >
                    <div className="min-w-0">
                      <span
                        className={cn(
                          obstOfferNameInnerClass(listType, row.right.offer_name_highlight_kind),
                          listType === 'backshop' &&
                            'inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 align-middle',
                        )}
                      >
                        {hqRight?.trim() ? (
                          <HighlightedSearchText
                            text={getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}
                            query={hqRight}
                          />
                        ) : (
                          getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)
                        )}
                        <BackshopSourceInlineBadge item={row.right} listType={listType} />
                        <OfferKindBadge item={row.right} />
                        {listType === 'backshop' && (
                          <BackshopMarkenTinderHintLine
                            item={row.right}
                            hrefForGroup={backshopMarkenTinderHrefForGroup}
                          />
                        )}
                      </span>
                    </div>
                  </td>
                  {hasAnyPrice && (
                    <td
                      className={cn('w-[90px] min-w-[90px] px-2 border-l border-border', hlRight && findHL)}
                      style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}
                    >
                      {(() => {
                        const p = getDisplayPreisForItem(row.right)
                        return p != null ? <PreisBadge value={p} style={{ fontSize: fonts.product + 'px' }} /> : null
                      })()}
                    </td>
                  )}
                </>
              ) : (
                <>
                  {selectionMode && <td className="px-1 py-1 border-l-2 border-border" />}
                  {showImageColumn && <td className="px-1 py-1 border-l-2 border-r border-border" />}
                  <td className={cn('px-2', !selectionMode && !showImageColumn && 'border-l-2 border-border')} style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} />
                  <td className="px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} />
                  {hasAnyPrice && <td className="px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} />}
                </>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Suchbare Zeilen: nur FlatRow – gleiche Reihenfolge wie mobile Liste und allFlatRows (Scroll-Treffer). */
function isFlatRowMatch(row: FlatRow, searchText: string): boolean {
  const q = searchText.trim().toLowerCase()
  if (!q) return false
  if (row.type === 'header') return false
  return row.item != null && itemMatchesSearch(row.item, searchText)
}

/**
 * PLU-Tabelle im Zwei-Spalten-Layout.
 */
export const PLUTable = forwardRef<PLUTableHandle, PLUTableProps>(function PLUTable(
  {
    items,
    displayMode,
    sortMode = 'ALPHABETICAL',
    flowDirection = 'COLUMN_FIRST',
    blocks = [],
    obstStoreBlockOrder,
    fontSizes,
    selectionMode = false,
    selectedPLUs,
    onToggleSelect,
    showFindInPage = false,
    findInPageExternalTrigger = false,
    listType = 'obst',
    backshopMarkenTinderHrefForGroup,
  },
  ref,
) {
  const fonts = fontSizes ?? DEFAULT_FONT_SIZES
  /** Backshop: eine gemeinsame Liste (Bild | PLU | Name), kein Stück/Gewicht-Split; Layout wie Obst (md+: zwei Spalten bei ROW_BY_ROW) */
  const effectiveDisplayMode = listType === 'backshop' ? 'MIXED' : displayMode

  /** Obst BY_BLOCK: gleiche Reihenfolge wie `buildDisplayList` / PDF (nicht nur globales `blocks.order_index`). */
  const obstBlockGroupOrder = useMemo(() => {
    if (listType !== 'obst' || sortMode !== 'BY_BLOCK' || blocks.length === 0) return undefined
    return sortBlocksWithStoreOrder(blocks, obstStoreBlockOrder ?? [])
  }, [listType, sortMode, blocks, obstStoreBlockOrder])

  const { searchableRows, sectionOffsets } = useMemo((): {
    searchableRows: FlatRow[]
    sectionOffsets: number[]
  } => {
    if (!showFindInPage || items.length === 0) return { searchableRows: [], sectionOffsets: [0] }
    /** Immer flache Zeilen wie allFlatRows / mobile DOM – Indizes = data-row-index (Scroll zum Treffer). */
    const buildForItems = (its: DisplayItem[]): FlatRow[] => {
      const grp =
        sortMode === 'BY_BLOCK'
          ? groupItemsByBlock(
              its,
              blocks,
              obstBlockGroupOrder
                ? { sortedBlocks: obstBlockGroupOrder, includeEmptyBlocks: true }
                : { includeEmptyBlocks: true },
            )
          : groupItemsByLetter(its)
      if (flowDirection === 'ROW_BY_ROW') {
        if (sortMode === 'ALPHABETICAL') {
          return buildFlatRowsFromLetterGroups(grp as LetterGroup<DisplayItem>[])
        }
        return buildFlatRowsFromBlockGroups(grp as BlockGroup<DisplayItem>[])
      }
      /** Gleiche Reihenfolge wie Desktop-Zeitung (links → rechts pro Seite) für data-row-index / Suche */
      if (listType === 'obst') {
        const heights = computeObstNewspaperHeightsPx(fonts)
        const groupList =
          sortMode === 'ALPHABETICAL'
            ? (grp as LetterGroup<DisplayItem>[]).map((lg) => ({
                label: `— ${lg.letter} —`,
                items: lg.items,
              }))
            : (grp as BlockGroup<DisplayItem>[]).map((bg) => ({
                label: bg.blockName,
                items: bg.items,
              }))
        const pages = paginateNewspaperColumns(groupList, heights)
        return newspaperRowsToFlatRows(flattenNewspaperPagesToRows(pages))
      }
      if (sortMode === 'ALPHABETICAL') {
        const [leftGroups, rightGroups] = splitLetterGroupsIntoColumns(grp as LetterGroup<DisplayItem>[])
        return [
          ...buildFlatRowsFromLetterGroups(leftGroups),
          ...buildFlatRowsFromLetterGroups(rightGroups),
        ]
      }
      const allRows = buildFlatRowsFromBlockGroups(grp as BlockGroup<DisplayItem>[])
      const mid = Math.ceil(allRows.length / 2)
      return [...allRows.slice(0, mid), ...allRows.slice(mid)]
    }
    if (effectiveDisplayMode === 'SEPARATED') {
      const pieceItems = items.filter((i) => i.item_type === 'PIECE')
      const weightItems = items.filter((i) => i.item_type === 'WEIGHT')
      const pieceRows = buildForItems(pieceItems)
      const weightRows = buildForItems(weightItems)
      return {
        searchableRows: [...pieceRows, ...weightRows],
        sectionOffsets: [0, pieceRows.length],
      }
    }
    const rows = buildForItems(items)
    return { searchableRows: rows, sectionOffsets: [0] }
  }, [
    showFindInPage,
    items,
    effectiveDisplayMode,
    sortMode,
    flowDirection,
    blocks,
    listType,
    fonts,
    obstBlockGroupOrder,
  ])

  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [searchOpen, setSearchOpen] = useState(false)
  const showSearchBar = Boolean(showFindInPage && (searchOpen || searchText.trim().length > 0))
  const { matchIndices, currentIndex, goNext, goPrev, totalMatches } = useFindInPage(
    searchableRows,
    deferredSearch,
    (row) => isFlatRowMatch(row, deferredSearch),
  )
  const findInPageHighlightRowIndex = totalMatches > 0 ? matchIndices[currentIndex] ?? null : null

  useEffect(() => {
    if (!showFindInPage || totalMatches === 0) return
    const idx = matchIndices[currentIndex]
    if (idx == null) return
    const run = () => {
      scrollToDataRowIndex(idx)
    }
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [showFindInPage, currentIndex, totalMatches, matchIndices, deferredSearch])

  const closeFindInPage = useCallback(() => {
    setSearchOpen(false)
    setSearchText('')
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      openFindInPage: () => setSearchOpen(true),
      closeFindInPage,
    }),
    [closeFindInPage],
  )

  useEffect(() => {
    if (!findInPageExternalTrigger || !showSearchBar) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFindInPage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [findInPageExternalTrigger, showSearchBar, closeFindInPage])

  const findInPageBarEl =
    showFindInPage && showSearchBar ? (
      <FindInPageBar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        currentIndex={currentIndex}
        totalMatches={totalMatches}
        onPrev={goPrev}
        onNext={goNext}
        placeholder="PLU oder Name suchen…"
        onClose={closeFindInPage}
      />
    ) : null

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Keine PLU-Einträge für diese Kalenderwoche vorhanden.
      </div>
    )
  }

  // SEPARATED: Zwei Abschnitte (Stück + Gewicht) – bei Backshop nie (effectiveDisplayMode = MIXED)
  if (effectiveDisplayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')

    return (
      <div className="space-y-8">
        {findInPageExternalTrigger && showFindInPage && showSearchBar && (
          <FindInPageFixedPortal>{findInPageBarEl}</FindInPageFixedPortal>
        )}
        {showFindInPage && !showSearchBar && !findInPageExternalTrigger && (
          <div className="rounded-t-lg border border-border bg-muted/30 px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
              aria-label="In Liste suchen"
            >
              <Search className="h-4 w-4" />
              In Liste suchen
            </Button>
          </div>
        )}
        {showSearchBar && !findInPageExternalTrigger && (
          <div className="sticky top-0 z-10 rounded-t-lg border border-border border-b bg-background px-4 py-2">
            {findInPageBarEl}
          </div>
        )}
        {pieceItems.length > 0 && (
          <div>
            <div
              data-tour="plu-table-header-stueck"
              className={PLU_TABLE_HEADER_STUECK_CLASS}
              style={{ fontSize: fonts.header + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
            >
              PLU-Liste Stück
            </div>
            <TwoColumnLayout
              items={pieceItems}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              obstBlockGroupOrder={obstBlockGroupOrder}
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
              findInPageRowOffset={showFindInPage ? sectionOffsets[0] : undefined}
              findInPageQuery={showFindInPage ? deferredSearch : undefined}
              listType={listType}
              backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
            />
          </div>
        )}
        {weightItems.length > 0 && (
          <div>
            <div
              data-tour="plu-table-header-gewicht"
              className={PLU_TABLE_HEADER_GEWICHT_CLASS}
              style={{ fontSize: fonts.header + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
            >
              PLU-Liste Gewicht
            </div>
            <TwoColumnLayout
              items={weightItems}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              obstBlockGroupOrder={obstBlockGroupOrder}
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
              findInPageRowOffset={showFindInPage ? sectionOffsets[1] : undefined}
              findInPageQuery={showFindInPage ? deferredSearch : undefined}
              listType={listType}
              backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
            />
          </div>
        )}
      </div>
    )
  }

  // MIXED: Alles zusammen mit großem Banner (Backshop: „PLU-Liste Backshop“)
  return (
    <div>
      {findInPageExternalTrigger && showFindInPage && showSearchBar && (
        <FindInPageFixedPortal>{findInPageBarEl}</FindInPageFixedPortal>
      )}
      <div
        className={PLU_TABLE_HEADER_CLASS}
        style={{ fontSize: fonts.header + 'px', paddingTop: '0.3em', paddingBottom: '0.3em' }}
        data-tour="plu-table-header-mixed"
      >
        {listType === 'backshop' ? (
          <>
            <span className="sm:hidden">Backshop</span>
            <span className="hidden sm:inline">PLU-Liste Backshop</span>
          </>
        ) : (
          <>
            <span className="sm:hidden">Obst & Gemüse</span>
            <span className="hidden sm:inline">PLU-Liste</span>
          </>
        )}
      </div>
      {showFindInPage && !showSearchBar && !findInPageExternalTrigger && (
        <div className="border-x border-t border-border bg-muted/30 px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchOpen(true)}
            aria-label="In Liste suchen"
          >
            <Search className="h-4 w-4" />
            In Liste suchen
          </Button>
        </div>
      )}
      {showSearchBar && !findInPageExternalTrigger && (
        <div className="sticky top-0 z-10 border-x border-t border-b border-border bg-background px-4 py-2">
          {findInPageBarEl}
        </div>
      )}
      <TwoColumnLayout
        items={items}
        sortMode={sortMode}
        flowDirection={flowDirection}
        blocks={blocks}
        obstBlockGroupOrder={obstBlockGroupOrder}
        fonts={fonts}
        selectionMode={selectionMode}
        selectedPLUs={selectedPLUs}
        onToggleSelect={onToggleSelect}
        findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
        findInPageRowOffset={showFindInPage ? sectionOffsets[0] : undefined}
        findInPageQuery={showFindInPage ? deferredSearch : undefined}
        listType={listType}
        backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
      />
    </div>
  )
})

PLUTable.displayName = 'PLUTable'

/** Zwei-Spalten-Layout mit Header-Gruppen */
function TwoColumnLayout({
  items,
  sortMode,
  flowDirection,
  blocks,
  obstBlockGroupOrder,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageHighlightRowIndex,
  findInPageRowOffset,
  findInPageQuery,
  listType = 'obst',
  backshopMarkenTinderHrefForGroup,
}: {
  items: DisplayItem[]
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  obstBlockGroupOrder?: Block[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageHighlightRowIndex?: number | null
  findInPageRowOffset?: number
  findInPageQuery?: string
  listType?: 'obst' | 'backshop'
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}) {
  const groups = useMemo(() => {
    if (sortMode === 'BY_BLOCK') {
      return groupItemsByBlock(
        items,
        blocks,
        obstBlockGroupOrder
          ? { sortedBlocks: obstBlockGroupOrder, includeEmptyBlocks: true }
          : { includeEmptyBlocks: true },
      )
    }
    return groupItemsByLetter(items)
  }, [items, sortMode, blocks, obstBlockGroupOrder])

  const rowByRowData = useMemo(() => {
    if (flowDirection !== 'ROW_BY_ROW') return null
    return buildRowByRowTable(groups as (LetterGroup<DisplayItem> | BlockGroup<DisplayItem>)[])
  }, [groups, flowDirection])

  const [leftRows, rightRows] = useMemo(() => {
    if (flowDirection === 'ROW_BY_ROW') return [[], []]
    /** Obst: Spalten-Zeitung – eigene Paginierung, nicht die alte Zwei-Spalten-Aufteilung */
    if (listType === 'obst' && flowDirection === 'COLUMN_FIRST') return [[], []]
    if (sortMode === 'ALPHABETICAL') {
      const letterGroups = groups as LetterGroup<DisplayItem>[]
      const [leftGroups, rightGroups] = splitLetterGroupsIntoColumns(letterGroups)
      return [
        buildFlatRowsFromLetterGroups(leftGroups),
        buildFlatRowsFromLetterGroups(rightGroups),
      ]
    }
    const allRows = buildFlatRowsFromBlockGroups(groups as BlockGroup<DisplayItem>[])
    const mid = Math.ceil(allRows.length / 2)
    return [allRows.slice(0, mid), allRows.slice(mid)]
  }, [groups, flowDirection, sortMode, listType])

  /** Obst, spaltenweise: gleiche Logik wie PDF (linke Spalte → rechte Spalte → Seitenwechsel) */
  const obstNewspaper = useMemo(() => {
    if (listType !== 'obst' || flowDirection !== 'COLUMN_FIRST') return null
    const heights = computeObstNewspaperHeightsPx(fonts)
    const groupList =
      sortMode === 'ALPHABETICAL'
        ? (groups as LetterGroup<DisplayItem>[]).map((lg) => ({
            label: `— ${lg.letter} —`,
            items: lg.items,
          }))
        : (groups as BlockGroup<DisplayItem>[]).map((bg) => ({
            label: bg.blockName,
            items: bg.items,
          }))
    return { pages: paginateNewspaperColumns(groupList, heights) }
  }, [listType, flowDirection, sortMode, groups, fonts])

  const allFlatRows = useMemo(() => {
    if (sortMode === 'BY_BLOCK') return buildFlatRowsFromBlockGroups(groups as BlockGroup<DisplayItem>[])
    return buildFlatRowsFromLetterGroups(groups as LetterGroup<DisplayItem>[])
  }, [groups, sortMode])

  if (flowDirection === 'ROW_BY_ROW' && rowByRowData) {
    return (
      <div className="rounded-b-lg border border-t-0 border-border">
        <div className="hidden md:block">
          <RowByRowTable
            tableRows={rowByRowData}
            flatRows={allFlatRows}
            fonts={fonts}
            selectionMode={selectionMode}
            selectedPLUs={selectedPLUs}
            onToggleSelect={onToggleSelect}
            findInPageRowOffset={findInPageRowOffset}
            findInPageHighlightRowIndex={findInPageHighlightRowIndex}
            findInPageQuery={findInPageQuery}
            listType={listType}
            backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
          />
        </div>
        <div className="md:hidden">
          {listType === 'backshop' ? (
            <BackshopPLUMobileList
              rows={allFlatRows}
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageRowOffset={findInPageRowOffset}
              findInPageHighlightRowIndex={findInPageHighlightRowIndex}
              findInPageQuery={findInPageQuery}
              backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
            />
          ) : (
            <PLUColumn
              rows={allFlatRows}
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageRowOffset={findInPageRowOffset}
              findInPageHighlightRowIndex={findInPageHighlightRowIndex}
              findInPageQuery={findInPageQuery}
              listType={listType}
              backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
            />
          )}
        </div>
      </div>
    )
  }

  if (obstNewspaper) {
    // Eine durchgehende Tabelle (wie Suche / Mobil): PDF-ähnliche Paginierung nur für die Zeilenfolge,
    // nicht mehr zwei getrennte Spalten auf Desktop — sonst wirken Artikel unter dem linken Gruppenkopf „weg“
    // (sie stehen in der rechten Spalte / auf Folgeseiten).
    const obstNewspaperFlatRows = newspaperRowsToFlatRows(
      flattenNewspaperPagesToRows(obstNewspaper.pages),
    )
    return (
      <div className="rounded-b-lg border border-t-0 border-border">
        <PLUColumn
          rows={obstNewspaperFlatRows}
          fonts={fonts}
          letterGroupHeaderFontPx={fonts.product}
          selectionMode={selectionMode}
          selectedPLUs={selectedPLUs}
          onToggleSelect={onToggleSelect}
          findInPageRowOffset={findInPageRowOffset}
          findInPageHighlightRowIndex={findInPageHighlightRowIndex}
          findInPageQuery={findInPageQuery}
          listType={listType}
          backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
        />
      </div>
    )
  }

  const leftRowCount = leftRows.length
  return (
    <div className="rounded-b-lg border border-t-0 border-border">
      <div className="hidden md:flex divide-x divide-border">
        <PLUColumn
          rows={leftRows}
          fonts={fonts}
          selectionMode={selectionMode}
          selectedPLUs={selectedPLUs}
          onToggleSelect={onToggleSelect}
          findInPageRowOffset={findInPageRowOffset}
          findInPageHighlightRowIndex={findInPageHighlightRowIndex}
          findInPageQuery={findInPageQuery}
          listType={listType}
          backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
        />
        <PLUColumn
          rows={rightRows}
          fonts={fonts}
          selectionMode={selectionMode}
          selectedPLUs={selectedPLUs}
          onToggleSelect={onToggleSelect}
          findInPageRowOffset={findInPageRowOffset !== undefined ? findInPageRowOffset + leftRowCount : undefined}
          findInPageHighlightRowIndex={findInPageHighlightRowIndex}
          findInPageQuery={findInPageQuery}
          listType={listType}
          backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
        />
      </div>
      <div className="md:hidden">
        {listType === 'backshop' ? (
          <BackshopPLUMobileList
            rows={allFlatRows}
            fonts={fonts}
            selectionMode={selectionMode}
            selectedPLUs={selectedPLUs}
            onToggleSelect={onToggleSelect}
            findInPageRowOffset={findInPageRowOffset}
            findInPageHighlightRowIndex={findInPageHighlightRowIndex}
            findInPageQuery={findInPageQuery}
            backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
          />
        ) : (
          <PLUColumn
            rows={allFlatRows}
            fonts={fonts}
            selectionMode={selectionMode}
            selectedPLUs={selectedPLUs}
            onToggleSelect={onToggleSelect}
            findInPageRowOffset={findInPageRowOffset}
            findInPageHighlightRowIndex={findInPageHighlightRowIndex}
            findInPageQuery={findInPageQuery}
            listType={listType}
            backshopMarkenTinderHrefForGroup={backshopMarkenTinderHrefForGroup}
          />
        )}
      </div>
    </div>
  )
}
