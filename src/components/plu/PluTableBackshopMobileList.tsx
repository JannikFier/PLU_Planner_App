// Mobile Backshop: Kartenliste (Bild + Name + Preis + PLU)

import { useMemo } from 'react'
import {
  getDisplayNameForItem,
  getDisplayPreisForItem,
  formatPluBlockSectionHeaderForDisplay,
  isLetterPluSectionHeaderLabel,
} from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { PreisBadge } from '@/components/plu/PreisBadge'
import { StatusBadge } from '@/components/plu/StatusBadge'
import { HighlightedSearchText } from '@/components/plu/HighlightedSearchText'
import { PluTableBackshopThumbnail } from '@/components/plu/PluTableBackshopThumbnail'
import type { FontSizes } from '@/components/plu/plu-table-types'
import type { FlatRow } from '@/lib/plu-table-rows'
import {
  BackshopMarkenTinderHintLine,
  BackshopOfferSheetTestBadge,
  BackshopSourceInlineBadge,
  OfferKindBadge,
} from '@/components/plu/plu-table-inline-badges'

export function PluTableBackshopMobileList({
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
              <PluTableBackshopThumbnail src={item.image_url} size="list" />
            </div>
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
                <BackshopOfferSheetTestBadge item={item} listType="backshop" />
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
