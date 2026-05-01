// Einzelne Tabellenspalte (COLUMN_FIRST) – Bild | PLU | Artikel bei Backshop

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
import type { FlatRow } from '@/lib/plu-table-rows'
import {
  BackshopMarkenTinderHintLine,
  BackshopOfferSheetTestBadge,
  BackshopSourceInlineBadge,
  OfferKindBadge,
  itemHasDisplayPreis,
} from '@/components/plu/plu-table-inline-badges'

/** Rendert eine einzelne Spalte der Tabelle (für COLUMN_FIRST). Bei listType backshop: Bild | PLU | Name */
export function PluTableColumn({
  rows,
  fonts,
  selectionMode,
  selectedPLUs,
  onToggleSelect,
  findInPageRowOffset,
  findInPageHighlightRowIndex,
  findInPageQuery,
  listType = 'obst',
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
                    <PluTableBackshopThumbnail src={item.image_url} />
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
                      <BackshopOfferSheetTestBadge item={item} listType={listType} />
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
