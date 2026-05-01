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
} from '@/lib/plu-helpers'
import {
  paginateNewspaperColumns,
  computeObstNewspaperHeightsPx,
  newspaperRowsToFlatRows,
  flattenNewspaperPagesToRows,
} from '@/lib/newspaper-column-pages'
import { scrollToDataRowIndex } from '@/lib/find-in-page-scroll'
import { useFindInPage } from '@/hooks/useFindInPage'
import { Search } from 'lucide-react'
import { FindInPageBar } from '@/components/plu/FindInPageBar'
import { FindInPageFixedPortal } from '@/components/plu/FindInPageFixedPortal'
import { Button } from '@/components/ui/button'
import type { Block, StoreObstBlockOrder } from '@/types/database'
import { sortBlocksWithStoreOrder } from '@/lib/block-override-utils'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'
import {
  buildFlatRowsFromBlockGroups,
  buildFlatRowsFromLetterGroups,
  isFlatRowMatch,
  type FlatRow,
} from '@/lib/plu-table-rows'
import { DEFAULT_FONT_SIZES, type FontSizes } from '@/components/plu/plu-table-types'
import { PluTableTwoColumnLayout } from '@/components/plu/PluTableTwoColumnLayout'

export type { FontSizes } from '@/components/plu/plu-table-types'

interface PLUTableProps {
  items: DisplayItem[]
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode?: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks?: Block[]
  obstStoreBlockOrder?: StoreObstBlockOrder[]
  fontSizes?: FontSizes
  selectionMode?: boolean
  selectedPLUs?: Set<string>
  onToggleSelect?: (plu: string) => void
  showFindInPage?: boolean
  findInPageExternalTrigger?: boolean
  listType?: 'obst' | 'backshop'
  backshopMarkenTinderHrefForGroup?: (groupId: string) => string
}

/** Imperative API für externe Toolbar (Lupen-Button) */
export interface PLUTableHandle {
  openFindInPage: () => void
  closeFindInPage: () => void
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
  const effectiveDisplayMode = listType === 'backshop' ? 'MIXED' : displayMode

  const obstBlockGroupOrder = useMemo(() => {
    if (listType !== 'obst' || sortMode !== 'BY_BLOCK' || blocks.length === 0) return undefined
    return sortBlocksWithStoreOrder(blocks, obstStoreBlockOrder ?? [])
  }, [listType, sortMode, blocks, obstStoreBlockOrder])

  const { searchableRows, sectionOffsets } = useMemo((): {
    searchableRows: FlatRow[]
    sectionOffsets: number[]
  } => {
    if (!showFindInPage || items.length === 0) return { searchableRows: [], sectionOffsets: [0] }
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

  useEffect(() => {
    if (!findInPageExternalTrigger || !showSearchBar) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (el.closest('[data-plu-find-in-page-root]')) return
      if (el.closest('[data-plu-find-in-page-trigger]')) return
      closeFindInPage()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
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
            <PluTableTwoColumnLayout
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
            <PluTableTwoColumnLayout
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
      <PluTableTwoColumnLayout
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
