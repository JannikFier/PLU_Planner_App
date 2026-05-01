// Zwei-Spalten-Layout, ROW_BY_ROW, Obst-Zeitung – orchestriert Spalten- und Mobile-Ansicht

import { Fragment, useMemo } from 'react'
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
  newspaperPageMinHeightPx,
  newspaperPageStartFlatRowIndex,
} from '@/lib/newspaper-column-pages'
import { cn } from '@/lib/utils'
import type { Block } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { LetterGroup, BlockGroup } from '@/lib/plu-helpers'
import {
  buildFlatRowsFromBlockGroups,
  buildFlatRowsFromLetterGroups,
  buildRowByRowTable,
} from '@/lib/plu-table-rows'
import type { FontSizes } from '@/components/plu/plu-table-types'
import { PluTableColumn } from '@/components/plu/PluTableColumn'
import { PluTableBackshopMobileList } from '@/components/plu/PluTableBackshopMobileList'
import { PluTableRowByRow } from '@/components/plu/PluTableRowByRow'

export function PluTableTwoColumnLayout({
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
    return {
      pages: paginateNewspaperColumns(groupList, heights),
      heights,
    }
  }, [listType, flowDirection, sortMode, groups, fonts])

  const allFlatRows = useMemo(() => {
    if (sortMode === 'BY_BLOCK') return buildFlatRowsFromBlockGroups(groups as BlockGroup<DisplayItem>[])
    return buildFlatRowsFromLetterGroups(groups as LetterGroup<DisplayItem>[])
  }, [groups, sortMode])

  const backshopWideFromLg = listType === 'backshop'

  if (flowDirection === 'ROW_BY_ROW' && rowByRowData) {
    return (
      <div className="rounded-b-lg border border-t-0 border-border">
        <div className={cn('hidden', backshopWideFromLg ? 'lg:block' : 'md:block')}>
          <PluTableRowByRow
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
        <div className={backshopWideFromLg ? 'lg:hidden' : 'md:hidden'}>
          {listType === 'backshop' ? (
            <PluTableBackshopMobileList
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
            <PluTableColumn
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
    const { pages, heights } = obstNewspaper
    const obstNewspaperFlatRows = newspaperRowsToFlatRows(flattenNewspaperPagesToRows(pages))

    const pluColumnCommon = {
      fonts,
      letterGroupHeaderFontPx: fonts.product,
      selectionMode,
      selectedPLUs,
      onToggleSelect,
      findInPageHighlightRowIndex,
      findInPageQuery,
      listType,
      backshopMarkenTinderHrefForGroup,
    }

    return (
      <div className="rounded-b-lg border border-t-0 border-border">
        <div className="md:hidden">
          <PluTableColumn
            rows={obstNewspaperFlatRows}
            {...pluColumnCommon}
            findInPageRowOffset={findInPageRowOffset}
          />
        </div>
        <div className="hidden md:block">
          {pages.map((page, pageIdx) => (
            <Fragment key={`obst-np-${pageIdx}`}>
              {pageIdx > 0 && (
                <div
                  className="flex items-center gap-3 border-t border-dashed border-border bg-muted/25 px-4 py-2.5 text-sm font-medium text-muted-foreground"
                  role="separator"
                  aria-label={`Seite ${pageIdx + 1}`}
                >
                  <span className="h-px min-w-[2rem] flex-1 bg-border" aria-hidden />
                  Seite {pageIdx + 1}
                  <span className="h-px min-w-[2rem] flex-1 bg-border" aria-hidden />
                </div>
              )}
              <div
                className="flex w-full divide-x divide-border items-start border-b border-border"
                style={{ minHeight: newspaperPageMinHeightPx(pageIdx, heights) }}
              >
                <PluTableColumn
                  rows={newspaperRowsToFlatRows(page.left)}
                  {...pluColumnCommon}
                  findInPageRowOffset={
                    findInPageRowOffset !== undefined
                      ? findInPageRowOffset + newspaperPageStartFlatRowIndex(pages, pageIdx)
                      : undefined
                  }
                />
                <PluTableColumn
                  rows={newspaperRowsToFlatRows(page.right)}
                  {...pluColumnCommon}
                  findInPageRowOffset={
                    findInPageRowOffset !== undefined
                      ? findInPageRowOffset +
                        newspaperPageStartFlatRowIndex(pages, pageIdx) +
                        page.left.length
                      : undefined
                  }
                />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  const leftRowCount = leftRows.length
  return (
    <div className="rounded-b-lg border border-t-0 border-border">
      <div className={cn('hidden divide-x divide-border', backshopWideFromLg ? 'lg:flex' : 'md:flex')}>
        <PluTableColumn
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
        <PluTableColumn
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
      <div className={backshopWideFromLg ? 'lg:hidden' : 'md:hidden'}>
        {listType === 'backshop' ? (
          <PluTableBackshopMobileList
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
          <PluTableColumn
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
