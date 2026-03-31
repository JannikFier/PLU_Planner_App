// PLUTable: Zwei-Spalten-Tabelle mit Buchstaben-/Block-Headern, Flussrichtung und Trennlinien
// Unterstützt Auswahl-Modus (Checkboxen), optional Find-in-Page (Suche mit Pfeilen + Markierung)

import { useMemo, useState, useEffect, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
} from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { useFindInPage } from '@/hooks/useFindInPage'
import { Megaphone, Search, Tag } from 'lucide-react'
import { FindInPageBar } from '@/components/plu/FindInPageBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import { HighlightedSearchText } from './HighlightedSearchText'
import type { Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'

function itemHasDisplayPreis(item: DisplayItem | undefined): boolean {
  if (!item) return false
  return getDisplayPreisForItem(item) != null
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

/** Backshop: Bildspaltenbreite und Bildgröße (mind. doppelt so groß wie früher für Produkterkennung). */
const BACKSHOP_IMAGE_COL = 'w-[128px]'
const BACKSHOP_IMAGE_SIZE = 'h-24 w-24'
/** object-contain = nichts abschneiden; crisp-edges = schärfere Skalierung */
const BACKSHOP_IMAGE_CLASS = 'object-contain rounded border border-border [image-rendering:crisp-edges]'

/** Zeigt Backshop-Bild oder Platzhalter; bei Lade fehler (kaputte URL) ebenfalls Platzhalter statt Broken-Icon. */
function BackshopImage({ src }: { src: string | null | undefined }) {
  const [loadFailed, setLoadFailed] = useState(false)
  const showPlaceholder = !src || loadFailed
  if (showPlaceholder) {
    return (
      <span className={cn('inline-block', BACKSHOP_IMAGE_SIZE, 'rounded border border-border bg-muted/50 text-muted-foreground text-xs flex items-center justify-center')}>
        –
      </span>
    )
  }
  return <img src={src} alt="" className={cn(BACKSHOP_IMAGE_SIZE, BACKSHOP_IMAGE_CLASS)} onError={() => setLoadFailed(true)} />
}

interface PLUTableProps {
  items: DisplayItem[]
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode?: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks?: Block[]
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
}) {
  const hasAnyPrice = useMemo(
    () => rows.some((r) => r.type === 'item' && itemHasDisplayPreis(r.item)),
    [rows],
  )
  const showImageColumn = listType === 'backshop'

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
              return (
                <tr
                  key={`header-${i}-${row.label}`}
                  className="border-b border-border"
                  {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
                >
                  <td
                    colSpan={colCount}
                    className="px-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50"
                    style={{ fontSize: fonts.column + 'px', paddingTop: '0.35em', paddingBottom: '0.35em' }}
                  >
                    {row.label}
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
                className={cn(
                  'border-b border-border last:border-b-0',
                  selectionMode && 'cursor-pointer hover:bg-muted/30',
                  isSelected && 'bg-primary/5',
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
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    {hq?.trim() ? (
                      <HighlightedSearchText
                        text={getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                        query={hq}
                      />
                    ) : (
                      getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
                    )}
                    <OfferKindBadge item={item} />
                  </span>
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

/** Rendert eine Tabelle mit 4 Spalten für ROW_BY_ROW (Header über volle Breite). Bei backshop: Bild | PLU | Artikel pro Seite */
function RowByRowTable({
  tableRows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
  findInPageQuery,
  listType = 'obst',
}: {
  tableRows: TableRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
  findInPageQuery?: string
  listType?: 'obst' | 'backshop'
}) {
  const showImageColumn = listType === 'backshop'
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
          if (row.type === 'fullHeader') {
            const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
            return (
              <tr key={`header-${i}-${row.label}`} className="border-b border-border" {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}>
                <td colSpan={totalCols} className="px-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50" style={{ fontSize: fonts.column + 'px', paddingTop: '0.35em', paddingBottom: '0.35em' }}>{row.label}</td>
              </tr>
            )
          }

          const leftSelected = row.left ? (selectedPLUs?.has(row.left.plu) ?? false) : false
          const rightSelected = row.right ? (selectedPLUs?.has(row.right.plu) ?? false) : false
          const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
          const isActiveFindRow =
            findInPageHighlightRowIndex != null &&
            rowIndex !== undefined &&
            rowIndex === findInPageHighlightRowIndex
          const hq = isActiveFindRow ? findInPageQuery : undefined

          const imageCell = (item: DisplayItem) => (
            <td className="px-1 py-1 align-middle border-l border-r border-border">
              <BackshopImage src={item.image_url} />
            </td>
          )

          return (
            <tr key={`pair-${i}`} className="border-b border-border last:border-b-0" {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}>
              {row.left ? (
                <>
                  {selectionMode && <td className="px-1 py-1 text-center"><input type="checkbox" checked={leftSelected} onChange={() => { const p = row.left?.plu; if (p) onToggleSelect?.(p) }} className="h-4 w-4 rounded border-border" /></td>}
                  {showImageColumn && imageCell(row.left)}
                  <td className="px-2" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}><StatusBadge plu={row.left.plu} status={row.left.status} oldPlu={row.left.old_plu} style={{ fontSize: fonts.product + 'px' }} highlightQuery={hq} /></td>
                  <td className="px-2 break-words min-w-0 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} title={getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}>
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      {hq?.trim() ? (
                        <HighlightedSearchText
                          text={getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}
                          query={hq}
                        />
                      ) : (
                        getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)
                      )}
                      <OfferKindBadge item={row.left} />
                    </span>
                  </td>
                  {hasAnyPrice && (
                    <td className="w-[90px] min-w-[90px] px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}>
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
                  {selectionMode && <td className="px-1 py-1 text-center border-l-2 border-border"><input type="checkbox" checked={rightSelected} onChange={() => { const p = row.right?.plu; if (p) onToggleSelect?.(p) }} className="h-4 w-4 rounded border-border" /></td>}
                  {showImageColumn && imageCell(row.right)}
                  <td className={cn('px-2', !selectionMode && !showImageColumn && 'border-l-2 border-border')} style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}><StatusBadge plu={row.right.plu} status={row.right.status} oldPlu={row.right.old_plu} style={{ fontSize: fonts.product + 'px' }} highlightQuery={hq} /></td>
                  <td className="px-2 break-words min-w-0 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }} title={getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}>
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      {hq?.trim() ? (
                        <HighlightedSearchText
                          text={getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}
                          query={hq}
                        />
                      ) : (
                        getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)
                      )}
                      <OfferKindBadge item={row.right} />
                    </span>
                  </td>
                  {hasAnyPrice && (
                    <td className="w-[90px] min-w-[90px] px-2 border-l border-border" style={{ fontSize: fonts.product + 'px', paddingTop: '0.25em', paddingBottom: '0.25em' }}>
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

/** Suchbare Zeilen für Find-in-Page (Reihenfolge wie im DOM). */
type SearchableRow = TableRow | FlatRow

function isRowMatch(row: SearchableRow, searchText: string): boolean {
  const q = searchText.trim().toLowerCase()
  if (!q) return false
  if (row.type === 'fullHeader' || row.type === 'header') return false
  if (row.type === 'itemPair')
    return (
      (row.left != null && itemMatchesSearch(row.left, searchText)) ||
      (row.right != null && itemMatchesSearch(row.right, searchText))
    )
  if (row.type === 'item') return row.item != null && itemMatchesSearch(row.item, searchText)
  return false
}

/** Find-in-Page-Leiste: gleicher horizontaler Rahmen wie DashboardLayout (max-w-7xl + Padding) */
function FindInPageFixedPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed top-16 left-0 right-0 z-[45] pointer-events-none">
      <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6 pointer-events-auto">
        <div className="max-w-[min(100%,420px)] rounded-lg border border-border bg-background p-3 shadow-lg">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
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
    fontSizes,
    selectionMode = false,
    selectedPLUs,
    onToggleSelect,
    showFindInPage = false,
    findInPageExternalTrigger = false,
    listType = 'obst',
  },
  ref,
) {
  const fonts = fontSizes ?? DEFAULT_FONT_SIZES
  /** Backshop: immer eine Liste (Bild | PLU | Name), kein Stück/Gewicht-Split */
  const effectiveDisplayMode = listType === 'backshop' ? 'MIXED' : displayMode

  const { searchableRows, sectionOffsets } = useMemo((): {
    searchableRows: SearchableRow[]
    sectionOffsets: number[]
  } => {
    if (!showFindInPage || items.length === 0) return { searchableRows: [], sectionOffsets: [0] }
    const buildForItems = (its: DisplayItem[]): SearchableRow[] => {
      const grp =
        sortMode === 'BY_BLOCK'
          ? groupItemsByBlock(its, blocks)
          : groupItemsByLetter(its)
      if (flowDirection === 'ROW_BY_ROW')
        return buildRowByRowTable(grp as (LetterGroup<DisplayItem> | BlockGroup<DisplayItem>)[])
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
  }, [showFindInPage, items, effectiveDisplayMode, sortMode, flowDirection, blocks])

  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [searchOpen, setSearchOpen] = useState(false)
  const showSearchBar = Boolean(showFindInPage && (searchOpen || searchText.trim().length > 0))
  const { matchIndices, currentIndex, goNext, goPrev, totalMatches } = useFindInPage(
    searchableRows,
    deferredSearch,
    (row) => isRowMatch(row, deferredSearch),
  )
  const findInPageHighlightRowIndex = totalMatches > 0 ? matchIndices[currentIndex] ?? null : null

  useEffect(() => {
    if (!showFindInPage || totalMatches === 0) return
    const idx = matchIndices[currentIndex]
    if (idx == null) return
    const el = document.querySelector(`[data-row-index="${idx}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [showFindInPage, currentIndex, totalMatches, matchIndices])

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
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
              findInPageRowOffset={showFindInPage ? sectionOffsets[0] : undefined}
              findInPageQuery={showFindInPage ? deferredSearch : undefined}
              listType={listType}
            />
          </div>
        )}
        {weightItems.length > 0 && (
          <div>
            <div
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
              fonts={fonts}
              selectionMode={selectionMode}
              selectedPLUs={selectedPLUs}
              onToggleSelect={onToggleSelect}
              findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
              findInPageRowOffset={showFindInPage ? sectionOffsets[1] : undefined}
              findInPageQuery={showFindInPage ? deferredSearch : undefined}
              listType={listType}
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
      >
        {listType === 'backshop' ? 'PLU-Liste Backshop' : 'PLU-Liste'}
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
        fonts={fonts}
        selectionMode={selectionMode}
        selectedPLUs={selectedPLUs}
        onToggleSelect={onToggleSelect}
        findInPageHighlightRowIndex={showFindInPage ? findInPageHighlightRowIndex : undefined}
        findInPageRowOffset={showFindInPage ? sectionOffsets[0] : undefined}
        findInPageQuery={showFindInPage ? deferredSearch : undefined}
        listType={listType}
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
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageHighlightRowIndex,
  findInPageRowOffset,
  findInPageQuery,
  listType = 'obst',
}: {
  items: DisplayItem[]
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageHighlightRowIndex?: number | null
  findInPageRowOffset?: number
  findInPageQuery?: string
  listType?: 'obst' | 'backshop'
}) {
  const groups = useMemo(() => {
    if (sortMode === 'BY_BLOCK') return groupItemsByBlock(items, blocks)
    return groupItemsByLetter(items)
  }, [items, sortMode, blocks])

  const rowByRowData = useMemo(() => {
    if (flowDirection !== 'ROW_BY_ROW') return null
    return buildRowByRowTable(groups as (LetterGroup<DisplayItem> | BlockGroup<DisplayItem>)[])
  }, [groups, flowDirection])

  const [leftRows, rightRows] = useMemo(() => {
    if (flowDirection === 'ROW_BY_ROW') return [[], []]
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
  }, [groups, flowDirection, sortMode])

  const allFlatRows = useMemo(() => {
    if (sortMode === 'BY_BLOCK') return buildFlatRowsFromBlockGroups(groups as BlockGroup<DisplayItem>[])
    return buildFlatRowsFromLetterGroups(groups as LetterGroup<DisplayItem>[])
  }, [groups, sortMode])

  if (flowDirection === 'ROW_BY_ROW' && rowByRowData) {
    return (
      <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
        <div className="hidden md:block">
          <RowByRowTable
            tableRows={rowByRowData}
            fonts={fonts}
            selectionMode={selectionMode}
            selectedPLUs={selectedPLUs}
            onToggleSelect={onToggleSelect}
            findInPageRowOffset={findInPageRowOffset}
            findInPageHighlightRowIndex={findInPageHighlightRowIndex}
            findInPageQuery={findInPageQuery}
            listType={listType}
          />
        </div>
        <div className="md:hidden">
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
          />
        </div>
      </div>
    )
  }

  const leftRowCount = leftRows.length
  return (
    <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
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
        />
      </div>
      <div className="md:hidden">
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
        />
      </div>
    </div>
  )
}
