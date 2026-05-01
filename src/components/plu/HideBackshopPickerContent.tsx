// Backshop: Vollseite / Picker – Produkte ausblenden mit Bild und Marken-Kürzel (nur E/H/A)

import { useState, useMemo, useRef, useEffect } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, EyeOff } from 'lucide-react'
import { useBackshopHideProduct } from '@/hooks/useBackshopHiddenItems'
import {
  filterItemsBySearch,
  getDisplayPlu,
  groupItemsForDialog,
  groupItemsForDialogAlignedWithList,
  itemMatchesSearch,
} from '@/lib/plu-helpers'
import type { Block } from '@/types/database'
import type { StoreBlockOrderRow } from '@/lib/block-override-utils'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import { isBackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'
import {
  PICKER_STICKY_ACTION_BAR_BOTTOM_PADDING,
  PickerStickyActionBar,
} from '@/components/plu/PickerStickyActionBar'

export interface HideBackshopPickerRow {
  id: string
  plu: string
  display_name: string
  system_name?: string
  item_type?: 'PIECE' | 'WEIGHT' | string | null
  block_id?: string | null
  image_url?: string | null
  /** Master-Zeile: DB-Quelle; bei Markt-eigenen Produkten weglassen */
  source?: BackshopSource | null
  /** true = Markt-eigenes Produkt → kein Marken-Badge */
  is_market_custom?: boolean
}

type TableRow =
  | { type: 'header'; label: string }
  | { type: 'row'; left?: HideBackshopPickerRow; right?: HideBackshopPickerRow }

type MobileFlatRow = { type: 'header'; label: string } | { type: 'item'; item: HideBackshopPickerRow }

function buildMobileFlatRows(groups: { label: string; items: HideBackshopPickerRow[] }[]): MobileFlatRow[] {
  const out: MobileFlatRow[] = []
  for (const g of groups) {
    out.push({ type: 'header', label: g.label })
    for (const item of g.items) {
      out.push({ type: 'item', item })
    }
  }
  return out
}

function buildTableRows(groups: { label: string; items: HideBackshopPickerRow[] }[]): TableRow[] {
  const rows: TableRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: group.label })
    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ type: 'row', left: items[i], right: items[i + 1] })
    }
  }
  return rows
}

function PickerThumb({ url }: { url: string | null | undefined }) {
  if (!url) {
    return <div className="h-10 w-10 shrink-0 rounded border bg-muted" aria-hidden />
  }
  return (
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded border object-cover" loading="lazy" />
  )
}

function PickerBrandBadge({ row }: { row: HideBackshopPickerRow }) {
  if (row.is_market_custom) return null
  const s = row.source
  if (!s || s === 'manual' || !isBackshopExcelSource(s)) return null
  return <BackshopSourceBadge source={s} variant="compact" className="shrink-0" />
}

export interface HideBackshopPickerContentProps {
  searchableItems: HideBackshopPickerRow[]
  displayMode?: 'MIXED' | 'SEPARATED'
  listLayout?: {
    sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
    blocks: Block[]
    storeBlockOrder: StoreBlockOrderRow[]
    nameBlockOverrides: Map<string, string>
  }
  onCancel: () => void
  onAfterBatchSuccess: () => void
}

export function HideBackshopPickerContent({
  searchableItems,
  displayMode = 'MIXED',
  listLayout,
  onCancel,
  onAfterBatchSuccess,
}: HideBackshopPickerContentProps) {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [selectedPLUs, setSelectedPLUs] = useState<Set<string>>(new Set())
  const hideProduct = useBackshopHideProduct()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const filteredItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    if (!q) return searchableItems
    return filterItemsBySearch(searchableItems, deferredSearch)
  }, [searchableItems, deferredSearch])

  const groups = useMemo(() => {
    if (listLayout) {
      return groupItemsForDialogAlignedWithList(
        filteredItems,
        displayMode,
        listLayout.sortMode,
        listLayout.blocks,
        listLayout.storeBlockOrder,
        listLayout.nameBlockOverrides,
      )
    }
    return groupItemsForDialog(filteredItems, displayMode)
  }, [filteredItems, displayMode, listLayout])

  const tableRows = useMemo(() => buildTableRows(groups), [groups])
  const mobileFlatRows = useMemo(() => buildMobileFlatRows(groups), [groups])

  const searchLower = deferredSearch.trim().toLowerCase()

  useEffect(() => {
    if (!searchLower || filteredItems.length === 0 || !scrollContainerRef.current) return
    const first = scrollContainerRef.current.querySelector('[data-highlight="true"]')
    if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [searchLower, filteredItems])

  const toggleSelect = (plu: string) => {
    setSelectedPLUs((prev) => {
      const next = new Set(prev)
      if (next.has(plu)) next.delete(plu)
      else next.add(plu)
      return next
    })
  }

  const selectAll = () => {
    if (selectedPLUs.size === filteredItems.length) {
      setSelectedPLUs(new Set())
    } else {
      setSelectedPLUs(new Set(filteredItems.map((i) => i.plu)))
    }
  }

  const handleHide = async () => {
    if (selectedPLUs.size === 0) return
    try {
      for (const plu of selectedPLUs) {
        await hideProduct.mutateAsync(plu)
      }
      setSelectedPLUs(new Set())
      setSearchText('')
      onAfterBatchSuccess()
    } catch {
      // Toast im Hook
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4',
        PICKER_STICKY_ACTION_BAR_BOTTOM_PADDING,
      )}
      data-tour="backshop-hidden-add-dialog"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Produkte ausblenden (Backshop)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Suche nach PLU oder Name und wähle die Produkte aus, die ausgeblendet werden sollen.
        </p>
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="PLU oder Name eingeben…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
          aria-label="Suche"
        />
      </div>

      <div className="border rounded-lg overflow-hidden flex flex-1 min-h-0 flex-col md:min-h-[400px]">
        {filteredItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground text-center">
              {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte zum Ausblenden.'}
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
            <ul className="md:hidden divide-y divide-border" data-testid="hide-backshop-products-dialog-mobile-list">
              {mobileFlatRows.map((row, i) => {
                if (row.type === 'header') {
                  return (
                    <li
                      key={`mbh-${i}-${row.label}`}
                      className="px-3 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                    >
                      {row.label}
                    </li>
                  )
                }
                const item = row.item
                const match = itemMatchesSearch(item, deferredSearch)
                const sel = selectedPLUs.has(item.plu)
                return (
                  <li
                    key={item.id}
                    data-highlight={match ? 'true' : undefined}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2',
                      match && 'bg-primary/10',
                      sel && 'ring-1 ring-inset ring-primary/20',
                    )}
                  >
                    <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={sel}
                        onCheckedChange={() => toggleSelect(item.plu)}
                        aria-label={`Auswahl PLU ${getDisplayPlu(item.plu)}`}
                      />
                    </div>
                    <PickerThumb url={item.image_url} />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => toggleSelect(item.plu)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm">{getDisplayPlu(item.plu)}</span>
                        <PickerBrandBadge row={item} />
                      </div>
                      <p className="text-sm break-words mt-0.5">{item.display_name}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
            <table className="hidden md:table w-full table-fixed">
              <colgroup>
                <col className="w-[36px]" />
                <col className="w-[48px]" />
                <col className="w-[72px]" />
                <col />
                <col className="w-[36px]" />
                <col className="w-[48px]" />
                <col className="w-[72px]" />
                <col />
              </colgroup>
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b-2 border-border">
                  <th className="px-1 py-1.5 w-[36px]">
                    <Label htmlFor="backshop-select-all" className="sr-only">
                      Alle auswählen
                    </Label>
                    <Checkbox
                      id="backshop-select-all"
                      checked={selectedPLUs.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </th>
                  <th className="px-0.5 py-1.5 w-[48px]" aria-hidden />
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[72px]">
                    PLU
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                    Artikel
                  </th>
                  <th className="px-1 py-1.5 w-[36px] border-l-2 border-border" />
                  <th className="px-0.5 py-1.5 w-[48px]" aria-hidden />
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[72px]">
                    PLU
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                    Artikel
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => {
                  if (row.type === 'header') {
                    return (
                      <tr key={`h-${i}-${row.label}`} className="border-b border-border">
                        <td
                          colSpan={8}
                          className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                        >
                          {row.label}
                        </td>
                      </tr>
                    )
                  }
                  const leftH = row.left ? itemMatchesSearch(row.left, deferredSearch) : false
                  const rightH = row.right ? itemMatchesSearch(row.right, deferredSearch) : false
                  const leftSel = row.left ? selectedPLUs.has(row.left.plu) : false
                  const rightSel = row.right ? selectedPLUs.has(row.right.plu) : false
                  const hasMatch = (row.left && leftH) || (row.right && rightH)
                  return (
                    <tr
                      key={`r-${i}`}
                      data-highlight={hasMatch ? 'true' : undefined}
                      className={cn('border-b border-border last:border-b-0', hasMatch && 'bg-primary/10')}
                    >
                      <td className="px-1 py-1 text-center align-middle">
                        {row.left ? (
                          <Checkbox
                            checked={leftSel}
                            onCheckedChange={() => {
                              const p = row.left?.plu
                              if (p) toggleSelect(p)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : null}
                      </td>
                      <td className="px-0.5 py-1 align-middle">
                        {row.left ? <PickerThumb url={row.left.image_url} /> : null}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-sm font-mono align-middle',
                          row.left && 'cursor-pointer hover:bg-muted/30',
                          leftH && 'bg-primary/10',
                        )}
                        onClick={row.left ? () => {
                            const p = row.left?.plu
                            if (p) toggleSelect(p)
                          } : undefined}
                      >
                        {row.left ? (
                          <span className="inline-flex items-center gap-1 flex-wrap">
                            {getDisplayPlu(row.left.plu)}
                            <PickerBrandBadge row={row.left} />
                          </span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-sm break-words min-w-0 border-l border-border align-middle',
                          row.left && 'cursor-pointer hover:bg-muted/30',
                          leftH && 'bg-primary/10',
                        )}
                        title={row.left?.display_name}
                        onClick={row.left ? () => {
                            const p = row.left?.plu
                            if (p) toggleSelect(p)
                          } : undefined}
                      >
                        {row.left?.display_name ?? ''}
                      </td>
                      <td className="px-1 py-1 text-center border-l-2 border-border align-middle">
                        {row.right ? (
                          <Checkbox
                            checked={rightSel}
                            onCheckedChange={() => {
                              const p = row.right?.plu
                              if (p) toggleSelect(p)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : null}
                      </td>
                      <td className="px-0.5 py-1 align-middle">
                        {row.right ? <PickerThumb url={row.right.image_url} /> : null}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-sm font-mono align-middle',
                          row.right && 'cursor-pointer hover:bg-muted/30',
                          rightH && 'bg-primary/10',
                        )}
                        onClick={row.right ? () => {
                            const p = row.right?.plu
                            if (p) toggleSelect(p)
                          } : undefined}
                      >
                        {row.right ? (
                          <span className="inline-flex items-center gap-1 flex-wrap">
                            {getDisplayPlu(row.right.plu)}
                            <PickerBrandBadge row={row.right} />
                          </span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-2 py-1 text-sm break-words min-w-0 border-l border-border align-middle',
                          row.right && 'cursor-pointer hover:bg-muted/30',
                          rightH && 'bg-primary/10',
                        )}
                        title={row.right?.display_name}
                        onClick={row.right ? () => {
                            const p = row.right?.plu
                            if (p) toggleSelect(p)
                          } : undefined}
                      >
                        {row.right?.display_name ?? ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PickerStickyActionBar>
        <Button variant="outline" type="button" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          type="button"
          onClick={handleHide}
          disabled={selectedPLUs.size === 0 || hideProduct.isPending}
          data-tour="backshop-hidden-add-dialog-submit"
        >
          <EyeOff className="h-4 w-4 mr-2" />
          {hideProduct.isPending
            ? 'Wird ausgeblendet…'
            : `${selectedPLUs.size} Produkt${selectedPLUs.size !== 1 ? 'e' : ''} ausblenden`}
        </Button>
      </PickerStickyActionBar>
    </div>
  )
}
