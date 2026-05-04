// ROW_BY_ROW: volle Breite, zwei Produkt-Hälften pro Zeile (Backshop: Bild-Spalten)

import { useMemo } from 'react'
import {
  getDisplayNameForItem,
  getDisplayPreisForItem,
  formatPluBlockSectionHeaderForDisplay,
  isLetterPluSectionHeaderLabel,
} from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { obstOfferNameInnerClass } from '@/lib/obst-offer-name-highlight'
import { PreisBadge } from '@/components/plu/PreisBadge'
import { StatusBadge } from '@/components/plu/StatusBadge'
import { HighlightedSearchText } from '@/components/plu/HighlightedSearchText'
import { BACKSHOP_IMAGE_COL, PluTableBackshopThumbnail } from '@/components/plu/PluTableBackshopThumbnail'
import type { FontSizes } from '@/components/plu/plu-table-types'
import type { FlatRow, TableRow } from '@/lib/plu-table-rows'
import {
  BackshopMarkenTinderHintLine,
  BackshopOfferSheetTestBadge,
  BackshopSourceInlineBadge,
  OfferKindBadge,
} from '@/components/plu/plu-table-inline-badges'
import { itemHasDisplayPreis } from '@/lib/plu-table-inline-badges-helpers'

/** Rendert eine Tabelle mit 4 Spalten für ROW_BY_ROW (Header über volle Breite). Bei backshop: Bild | PLU | Artikel pro Seite */
export function PluTableRowByRow({
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
                      <PluTableBackshopThumbnail src={row.left.image_url} />
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
                        <BackshopOfferSheetTestBadge item={row.left} listType={listType} />
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
                      <PluTableBackshopThumbnail src={row.right.image_url} />
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
                        <BackshopOfferSheetTestBadge item={row.right} listType={listType} />
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
