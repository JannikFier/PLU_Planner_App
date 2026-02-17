// PLUTable: Zwei-Spalten-Tabelle mit Buchstaben-/Block-Headern, Flussrichtung und Trennlinien
// Unterstützt Auswahl-Modus (Checkboxen), optional Find-in-Page (Suche mit Pfeilen + Markierung)

import { useMemo, useState, useEffect } from 'react'
import {
  groupItemsByLetter,
  groupItemsByBlock,
  splitLetterGroupsIntoColumns,
  getDisplayNameForItem,
  itemMatchesSearch,
} from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { useFindInPage } from '@/hooks/useFindInPage'
import { Search } from 'lucide-react'
import { FindInPageBar } from '@/components/plu/FindInPageBar'
import { Button } from '@/components/ui/button'
import { PreisBadge } from './PreisBadge'
import { StatusBadge } from './StatusBadge'
import type { Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'

/** Schriftgrößen aus den Layout-Einstellungen */
export interface FontSizes {
  header: number  // Titel-Banner ("PLU-Liste", "PLU-Liste Stück")
  column: number  // Gruppen-Header (— A —, Obst, etc.) + Spaltenköpfe
  product: number // PLU + Artikelname
}

const DEFAULT_FONT_SIZES: FontSizes = { header: 24, column: 16, product: 12 }

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

/** Rendert eine einzelne Spalte der Tabelle (für COLUMN_FIRST) */
function PLUColumn({
  rows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
}: {
  rows: FlatRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
}) {
  const hasAnyPrice = useMemo(
    () => rows.some((r) => r.type === 'item' && r.item?.preis != null),
    [rows],
  )

  return (
    <div className="flex-1 min-w-0">
      <table className="w-full table-fixed">
        <colgroup>
          {selectionMode && <col className="w-[36px]" />}
          <col className="w-[80px]" />
          <col />
          {hasAnyPrice && <col className="w-[90px]" />}
        </colgroup>
        <thead>
          <tr className="border-b-2 border-border">
            {selectionMode && <th className="px-1 py-1.5" />}
            <th
              className="px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ fontSize: fonts.column + 'px' }}
            >
              PLU
            </th>
            <th
              className="px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border"
              style={{ fontSize: fonts.column + 'px' }}
            >
              Artikel
            </th>
            {hasAnyPrice && (
              <th
                className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]"
                style={{ fontSize: fonts.column + 'px' }}
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
                    colSpan={2 + (selectionMode ? 1 : 0) + (hasAnyPrice ? 1 : 0)}
                    className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50"
                    style={{ fontSize: fonts.column + 'px' }}
                  >
                    {row.label}
                  </td>
                </tr>
              )
            }

            const item = row.item!
            const isSelected = selectedPLUs?.has(item.plu) ?? false
            const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
            const isHighlight = findInPageHighlightRowIndex !== undefined && rowIndex === findInPageHighlightRowIndex

            return (
              <tr
                key={item.id}
                {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
                className={cn(
                  'border-b border-border last:border-b-0',
                  selectionMode && 'cursor-pointer hover:bg-muted/30',
                  isSelected && 'bg-primary/5',
                  isHighlight && 'bg-primary/10',
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
                <td className="px-2 py-1" style={{ fontSize: fonts.product + 'px' }}>
                  <StatusBadge
                    plu={item.plu}
                    status={item.status}
                    oldPlu={item.old_plu}
                    style={{ fontSize: fonts.product + 'px' }}
                  />
                </td>
                <td
                  className="px-2 py-1 break-words min-w-0 border-l border-border"
                  style={{ fontSize: fonts.product + 'px' }}
                  title={getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                >
                  {getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)}
                </td>
                {hasAnyPrice && (
                  <td className="w-[90px] min-w-[90px] px-2 py-1 border-l border-border" style={{ fontSize: fonts.product + 'px' }}>
                    {item.preis != null ? (
                      <PreisBadge value={item.preis} style={{ fontSize: fonts.product + 'px' }} />
                    ) : null}
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

/** Rendert eine Tabelle mit 4 Spalten für ROW_BY_ROW (Header über volle Breite) */
function RowByRowTable({
  tableRows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
}: {
  tableRows: TableRow[]
  fonts: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  findInPageRowOffset?: number
  findInPageHighlightRowIndex?: number | null
}) {
  const hasAnyPrice = useMemo(
    () =>
      tableRows.some(
        (r) => r.type === 'itemPair' && (r.left?.preis != null || r.right?.preis != null),
      ),
    [tableRows],
  )
  const totalCols = (selectionMode ? 2 : 0) + 4 + (hasAnyPrice ? 2 : 0)

  return (
    <table className="w-full table-fixed">
      <colgroup>
        {selectionMode && <col className="w-[36px]" />}
        <col className="w-[80px]" />
        <col />
        {hasAnyPrice && <col className="w-[90px]" />}
        {selectionMode && <col className="w-[36px]" />}
        <col className="w-[80px]" />
        <col />
        {hasAnyPrice && <col className="w-[90px]" />}
      </colgroup>
      <thead>
        <tr className="border-b-2 border-border">
          {selectionMode && <th className="px-1 py-1.5" />}
          <th
            className="px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ fontSize: fonts.column + 'px' }}
          >
            PLU
          </th>
          <th
            className="px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border"
            style={{ fontSize: fonts.column + 'px' }}
          >
            Artikel
          </th>
          {hasAnyPrice && (
            <th
              className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]"
              style={{ fontSize: fonts.column + 'px' }}
            >
              Preis
            </th>
          )}
          {selectionMode && <th className="px-1 py-1.5 border-l-2 border-border" />}
          <th
            className={cn('px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider', !(selectionMode || hasAnyPrice) && 'border-l-2 border-border')}
            style={{ fontSize: fonts.column + 'px' }}
          >
            PLU
          </th>
          <th
            className="px-2 py-1.5 text-left font-semibold text-muted-foreground uppercase tracking-wider border-l border-border"
            style={{ fontSize: fonts.column + 'px' }}
          >
            Artikel
          </th>
          {hasAnyPrice && (
            <th
              className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider border-l border-border w-[90px] min-w-[90px]"
              style={{ fontSize: fonts.column + 'px' }}
            >
              Preis
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row, i) => {
          if (row.type === 'fullHeader') {
            const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
            return (
              <tr
                key={`header-${i}-${row.label}`}
                className="border-b border-border"
                {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
              >
                <td
                  colSpan={totalCols}
                  className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50"
                  style={{ fontSize: fonts.column + 'px' }}
                >
                  {row.label}
                </td>
              </tr>
            )
          }

          const leftSelected = row.left ? (selectedPLUs?.has(row.left.plu) ?? false) : false
          const rightSelected = row.right ? (selectedPLUs?.has(row.right.plu) ?? false) : false
          const rowIndex = findInPageRowOffset !== undefined ? findInPageRowOffset + i : undefined
          const isHighlight = findInPageHighlightRowIndex !== undefined && rowIndex === findInPageHighlightRowIndex

          return (
            <tr
              key={`pair-${i}`}
              className={cn('border-b border-border last:border-b-0', isHighlight && 'bg-primary/10')}
              {...(rowIndex !== undefined && { 'data-row-index': rowIndex })}
            >
              {/* Linke Seite */}
              {row.left ? (
                <>
                  {selectionMode && (
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={leftSelected}
                        onChange={() => onToggleSelect?.(row.left!.plu)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1" style={{ fontSize: fonts.product + 'px' }}>
                    <StatusBadge plu={row.left.plu} status={row.left.status} oldPlu={row.left.old_plu} style={{ fontSize: fonts.product + 'px' }} />
                  </td>
                  <td className="px-2 py-1 break-words min-w-0 border-l border-border" style={{ fontSize: fonts.product + 'px' }} title={getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}>
                    {getDisplayNameForItem(row.left.display_name, row.left.system_name, row.left.is_custom)}
                  </td>
                  {hasAnyPrice && (
                    <td className="w-[90px] min-w-[90px] px-2 py-1 border-l border-border" style={{ fontSize: fonts.product + 'px' }}>
                      {row.left.preis != null ? (
                        <PreisBadge value={row.left.preis} style={{ fontSize: fonts.product + 'px' }} />
                      ) : null}
                    </td>
                  )}
                </>
              ) : (
                <>
                  {selectionMode && <td className="px-1 py-1" />}
                  <td className="px-2 py-1" />
                  <td className="px-2 py-1 border-l border-border" />
                  {hasAnyPrice && <td className="px-2 py-1 border-l border-border" />}
                </>
              )}
              {/* Rechte Seite */}
              {row.right ? (
                <>
                  {selectionMode && (
                    <td className="px-1 py-1 text-center border-l-2 border-border">
                      <input
                        type="checkbox"
                        checked={rightSelected}
                        onChange={() => onToggleSelect?.(row.right!.plu)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                  )}
                  <td className={cn('px-2 py-1', !selectionMode && 'border-l-2 border-border')} style={{ fontSize: fonts.product + 'px' }}>
                    <StatusBadge plu={row.right.plu} status={row.right.status} oldPlu={row.right.old_plu} style={{ fontSize: fonts.product + 'px' }} />
                  </td>
                  <td className="px-2 py-1 break-words min-w-0 border-l border-border" style={{ fontSize: fonts.product + 'px' }} title={getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}>
                    {getDisplayNameForItem(row.right.display_name, row.right.system_name, row.right.is_custom)}
                  </td>
                  {hasAnyPrice && (
                    <td className="w-[90px] min-w-[90px] px-2 py-1 border-l border-border" style={{ fontSize: fonts.product + 'px' }}>
                      {row.right.preis != null ? (
                        <PreisBadge value={row.right.preis} style={{ fontSize: fonts.product + 'px' }} />
                      ) : null}
                    </td>
                  )}
                </>
              ) : (
                <>
                  {selectionMode && <td className="px-1 py-1 border-l-2 border-border" />}
                  <td className={cn('px-2 py-1', !selectionMode && 'border-l-2 border-border')} />
                  <td className="px-2 py-1 border-l border-border" />
                  {hasAnyPrice && <td className="px-2 py-1 border-l border-border" />}
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

/**
 * PLU-Tabelle im Zwei-Spalten-Layout.
 */
export function PLUTable({
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
}: PLUTableProps) {
  const fonts = fontSizes ?? DEFAULT_FONT_SIZES

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
    if (displayMode === 'SEPARATED') {
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
  }, [showFindInPage, items, displayMode, sortMode, flowDirection, blocks])

  const [searchText, setSearchText] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const showSearchBar = Boolean(showFindInPage && (searchOpen || searchText.trim().length > 0))
  const { matchIndices, currentIndex, goNext, goPrev, totalMatches } = useFindInPage(
    searchableRows,
    searchText,
    (row) => isRowMatch(row, searchText),
  )
  const findInPageHighlightRowIndex = totalMatches > 0 ? matchIndices[currentIndex] ?? null : null

  useEffect(() => {
    if (!showFindInPage || totalMatches === 0) return
    const idx = matchIndices[currentIndex]
    if (idx == null) return
    const el = document.querySelector(`[data-row-index="${idx}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [showFindInPage, currentIndex, totalMatches, matchIndices])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Keine PLU-Einträge für diese Kalenderwoche vorhanden.
      </div>
    )
  }

  // SEPARATED: Zwei Abschnitte (Stück + Gewicht)
  if (displayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')

    return (
      <div className="space-y-8">
        {showFindInPage && !showSearchBar && (
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
        {showSearchBar && (
          <div className="sticky top-0 z-10 rounded-t-lg border border-border border-b bg-background px-4 py-2">
            <FindInPageBar
              searchText={searchText}
              onSearchTextChange={setSearchText}
              currentIndex={currentIndex}
              totalMatches={totalMatches}
              onPrev={goPrev}
              onNext={goNext}
              placeholder="PLU oder Name suchen…"
              onClose={() => {
                setSearchOpen(false)
                setSearchText('')
              }}
            />
          </div>
        )}
        {pieceItems.length > 0 && (
          <div>
            <div
              className="rounded-t-lg bg-blue-500/10 border border-b-0 border-blue-200 px-4 py-2 font-semibold text-blue-700 uppercase tracking-wider text-center"
              style={{ fontSize: fonts.header + 'px' }}
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
            />
          </div>
        )}
        {weightItems.length > 0 && (
          <div>
            <div
              className="rounded-t-lg bg-amber-500/10 border border-b-0 border-amber-200 px-4 py-2 font-semibold text-amber-700 uppercase tracking-wider text-center"
              style={{ fontSize: fonts.header + 'px' }}
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
            />
          </div>
        )}
      </div>
    )
  }

  // MIXED: Alles zusammen mit großem Banner
  return (
    <div>
      <div
        className="rounded-t-lg bg-gray-500/10 border border-b-0 border-gray-300 px-4 py-2 font-semibold text-gray-700 uppercase tracking-wider text-center"
        style={{ fontSize: fonts.header + 'px' }}
      >
        PLU-Liste
      </div>
      {showFindInPage && !showSearchBar && (
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
      {showSearchBar && (
        <div className="sticky top-0 z-10 border-x border-t border-b border-border bg-background px-4 py-2">
          <FindInPageBar
            searchText={searchText}
            onSearchTextChange={setSearchText}
            currentIndex={currentIndex}
            totalMatches={totalMatches}
            onPrev={goPrev}
            onNext={goNext}
            placeholder="PLU oder Name suchen…"
            onClose={() => {
              setSearchOpen(false)
              setSearchText('')
            }}
          />
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
      />
    </div>
  )
}

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
        />
        <PLUColumn
          rows={rightRows}
          fonts={fonts}
          selectionMode={selectionMode}
          selectedPLUs={selectedPLUs}
          onToggleSelect={onToggleSelect}
          findInPageRowOffset={findInPageRowOffset !== undefined ? findInPageRowOffset + leftRowCount : undefined}
          findInPageHighlightRowIndex={findInPageHighlightRowIndex}
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
        />
      </div>
    </div>
  )
}
