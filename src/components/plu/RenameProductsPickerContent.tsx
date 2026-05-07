// Vollseite / Picker: Produkte umbenennen – PLU-Liste mit Suche, Stift pro Zeile (Obst + Backshop)

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Search } from 'lucide-react'
import {
  filterItemsBySearch,
  getDisplayPlu,
  itemMatchesSearch,
  groupItemsForDialog,
  groupItemsForDialogAlignedWithList,
} from '@/lib/plu-helpers'
import type { Block } from '@/types/database'
import type { StoreBlockOrderRow } from '@/lib/block-override-utils'
import { RenameDialog } from '@/components/plu/RenameDialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { MasterPLUItem, BackshopMasterPLUItem, BackshopSource } from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import { buildDialogPluLayout, type DialogPluFontSizes, type DialogFlatRow } from '@/lib/dialog-plu-layout'
import { newspaperPageMinHeightPx, newspaperRowsToFlatRows } from '@/lib/newspaper-column-pages'
import { PLU_TABLE_HEADER_GEWICHT_CLASS, PLU_TABLE_HEADER_STUECK_CLASS } from '@/lib/constants'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import { isBackshopExcelSource } from '@/lib/backshop-sources'

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name: string
  item_type?: 'PIECE' | 'WEIGHT' | string | null
  block_id?: string | null
  image_url?: string | null
  source?: BackshopSource | null
  is_market_custom?: boolean
}

type TableRow = { type: 'header'; label: string } | { type: 'row'; left?: SearchableItem; right?: SearchableItem }

const DEFAULT_FONT_OBST: DialogPluFontSizes = { header: 24, column: 16, product: 12 }
const DEFAULT_FONT_BACKSHOP: DialogPluFontSizes = { header: 32, column: 18, product: 18 }

function RenamePickerThumb({ url }: { url: string | null | undefined }) {
  if (!url) return <div className="h-9 w-9 shrink-0 rounded border bg-muted" aria-hidden />
  return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded border object-cover" loading="lazy" />
}

function RenamePickerBrandBadge({ item }: { item: SearchableItem }) {
  if (item.is_market_custom) return null
  const s = item.source
  if (!s || s === 'manual' || !isBackshopExcelSource(s)) return null
  return <BackshopSourceBadge source={s} variant="compact" className="shrink-0" />
}

/** Eine Spalte: optional Bild (Backshop) | PLU | Artikel + Stift */
function RenameColumnTable({
  rows,
  deferredSearch,
  onRename,
  listKind,
}: {
  rows: DialogFlatRow<SearchableItem>[]
  deferredSearch: string
  onRename: (item: SearchableItem) => void
  listKind: 'obst' | 'backshop'
}) {
  const showImg = listKind === 'backshop'
  const colSpan = showImg ? 3 : 2
  return (
    <table className="w-full table-fixed flex-1 min-w-0">
      <colgroup>
        {showImg ? <col className="w-[44px]" /> : null}
        <col className="w-[80px]" />
        <col />
      </colgroup>
      <tbody>
        {rows.map((row, i) => {
          if (row.type === 'header') {
            return (
              <tr key={`rc-${i}`} className="border-b border-border">
                <td
                  colSpan={colSpan}
                  className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                >
                  {row.label}
                </td>
              </tr>
            )
          }
          const item = row.item
          const match = itemMatchesSearch(item, deferredSearch)
          return (
            <tr
              key={item.id}
              data-highlight={match ? 'true' : undefined}
              className={cn('border-b border-border', match && 'bg-primary/10')}
            >
              {showImg ? (
                <td className={cn('px-1 py-1 align-middle', match && 'bg-primary/10')}>
                  <RenamePickerThumb url={item.image_url} />
                </td>
              ) : null}
              <td className={cn('px-2 py-1 text-sm font-mono align-middle', match && 'bg-primary/10')}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  {getDisplayPlu(item.plu)}
                  <RenamePickerBrandBadge item={item} />
                </span>
              </td>
              <td className={cn('px-2 py-1 text-sm border-l border-border align-middle', match && 'bg-primary/10')}>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="flex-1 min-w-0 break-words" title={item.display_name}>
                    {item.display_name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onRename(item)}
                    aria-label="Umbenennen"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Master-Item zu DisplayItem (für RenameDialog). */
function masterItemToDisplayItem(m: MasterPLUItem): DisplayItem {
  return {
    id: m.id,
    plu: m.plu,
    system_name: m.system_name,
    display_name: m.display_name ?? m.system_name,
    item_type: m.item_type as 'PIECE' | 'WEIGHT',
    status: m.status as DisplayItem['status'],
    old_plu: m.old_plu,
    warengruppe: m.warengruppe,
    block_id: m.block_id,
    block_name: null,
    preis: m.preis,
    is_custom: false,
    is_manually_renamed: m.is_manually_renamed ?? false,
  }
}

/** Backshop-Master-Item zu DisplayItem (mit image_url). */
function backshopMasterItemToDisplayItem(m: BackshopMasterPLUItem): DisplayItem {
  return {
    id: m.id,
    plu: m.plu,
    system_name: m.system_name,
    display_name: m.display_name ?? m.system_name,
    item_type: 'PIECE',
    status: m.status as DisplayItem['status'],
    old_plu: m.old_plu,
    warengruppe: m.warengruppe,
    block_id: m.block_id,
    block_name: null,
    preis: null,
    is_custom: false,
    is_manually_renamed: m.is_manually_renamed ?? false,
    image_url: m.image_url ?? undefined,
  }
}

/** Globale Umbenennung (plu → display_name) für Backshop */
export type RenamedItemOverride = { plu: string; display_name: string }

export interface RenameProductsPickerContentProps {
  /** Obst/Gemüse: MasterPLUItem[]; Backshop: BackshopMasterPLUItem[] */
  searchableItems: MasterPLUItem[] | BackshopMasterPLUItem[]
  /** Bei 'backshop': Backshop-RPCs, RenameDialog mit Bild. */
  listType?: 'default' | 'backshop'
  /** Bei 'backshop': Globale Umbenennungen (überschreiben display_name aus searchableItems) */
  renamedOverrides?: RenamedItemOverride[]
  /** Anzeige-Modus: SEPARATED = nach Stück/Gewicht getrennt, MIXED = nur alphabetisch */
  displayMode?: 'MIXED' | 'SEPARATED'
  /** Optional: gleiche Gruppierung wie die Masterliste */
  listLayout?: {
    sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
    blocks: Block[]
    storeBlockOrder: StoreBlockOrderRow[]
    nameBlockOverrides: Map<string, string>
  }
  /** Wie Masterliste; Backshop-Standard: zeilenweise */
  flowDirection?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  fontSizes?: DialogPluFontSizes
  /** Optional: Tutorial-Anker am Seiten-Wrapper */
  dataTour?: string
  /** Optional: Tutorial-Anker am inneren RenameDialog DialogContent */
  renameDialogDataTour?: string
  /** Optional: Tutorial-Anker am inneren RenameDialog Speichern-Button */
  renameDialogSubmitDataTour?: string
  /** Nur Backshop: Umschalter „Meine Liste“ / „Alle Produkte“ (beide setzen, sonst keine UI). */
  renameListScope?: 'my_list' | 'all_products'
  onRenameListScopeChange?: (scope: 'my_list' | 'all_products') => void
  /** Zurück zur Liste (Abbrechen / Fertig) */
  onCancel: () => void
}

export function RenameProductsPickerContent({
  searchableItems,
  listType = 'default',
  renamedOverrides = [],
  displayMode = 'MIXED',
  listLayout,
  flowDirection: flowDirectionProp,
  fontSizes: fontSizesProp,
  dataTour,
  renameDialogDataTour,
  renameDialogSubmitDataTour,
  renameListScope,
  onRenameListScopeChange,
  onCancel,
}: RenameProductsPickerContentProps) {
  const listKind = listType === 'backshop' ? 'backshop' : 'obst'
  const showBackshopListScopeControls =
    listType === 'backshop' && renameListScope != null && onRenameListScopeChange != null
  const flowDirection =
    flowDirectionProp ?? (listKind === 'backshop' ? 'ROW_BY_ROW' : 'COLUMN_FIRST')
  const fontSizes = fontSizesProp ?? (listKind === 'backshop' ? DEFAULT_FONT_BACKSHOP : DEFAULT_FONT_OBST)

  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [renameItem, setRenameItem] = useState<DisplayItem | null>(null)
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const overrideByPlu = useMemo(
    () => new Map(renamedOverrides.map((r) => [r.plu, r.display_name])),
    [renamedOverrides],
  )

  const searchableAsList: SearchableItem[] = useMemo(
    () =>
      searchableItems.map((m) => {
        const base = m as MasterPLUItem & BackshopMasterPLUItem
        const display = overrideByPlu.get(m.plu) ?? base.display_name ?? base.system_name
        const row: SearchableItem = {
          id: m.id,
          plu: m.plu,
          display_name: display,
          system_name: base.system_name,
          item_type: 'item_type' in base ? base.item_type : undefined,
          block_id: 'block_id' in base ? base.block_id : undefined,
        }
        if (listType === 'backshop') {
          const bm = m as BackshopMasterPLUItem
          row.image_url = bm.image_url
          row.source = bm.source
          row.is_market_custom = false
        }
        return row
      }),
    [searchableItems, overrideByPlu, listType],
  )

  const filteredItems = useMemo(
    () => filterItemsBySearch(searchableAsList, deferredSearch),
    [searchableAsList, deferredSearch],
  )

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

  const sortMode = listLayout?.sortMode ?? 'ALPHABETICAL'

  const layout = useMemo(
    () =>
      buildDialogPluLayout({
        groups,
        filteredItems,
        flowDirection,
        displayMode,
        sortMode,
        listType: listKind,
        fontSizes,
      }),
    [groups, filteredItems, flowDirection, displayMode, sortMode, listKind, fontSizes],
  )

  const tableRows: TableRow[] = layout.mode === 'row_by_row' ? layout.tableRows : []

  const searchLower = deferredSearch.trim().toLowerCase()
  useEffect(() => {
    if (!searchLower || filteredItems.length === 0 || !scrollContainerRef.current) return
    const first = scrollContainerRef.current.querySelector('[data-highlight="true"]')
    if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [searchLower, filteredItems.length])

  const handleRenameDialogClose = useCallback(
    (closed: boolean) => {
      if (!closed) {
        setRenameItem(null)
        return
      }
      setRenameItem(null)
      if (listType === 'backshop') {
        queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['backshop-renamed-items'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['renamed-items'] })
      }
    },
    [queryClient, listType],
  )

  const handleOpenRename = (item: SearchableItem) => {
    const master = searchableItems.find((m) => m.id === item.id)
    if (!master) return
    if (listType === 'backshop') {
      const display = backshopMasterItemToDisplayItem(master as BackshopMasterPLUItem)
      const ov = overrideByPlu.get(master.plu)
      display.display_name = ov ?? display.display_name
      display.is_manually_renamed =
        (ov != null && ov.trim() !== (master.system_name ?? '').trim()) ||
        (display.is_manually_renamed ?? false)
      setRenameItem(display)
    } else {
      const display = masterItemToDisplayItem(master as MasterPLUItem)
      const ov = overrideByPlu.get(master.plu)
      display.display_name = ov ?? display.display_name
      display.is_manually_renamed =
        (ov != null && ov.trim() !== (master.system_name ?? '').trim()) ||
        (display.is_manually_renamed ?? false)
      setRenameItem(display)
    }
  }

  return (
    <>
      <div
        className="flex flex-col min-h-0 flex-1 gap-4"
        {...(dataTour ? { 'data-tour': dataTour } : {})}
      >
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Produkte umbenennen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suche nach PLU oder Name, dann klicke auf den Stift, um den Anzeigenamen zu ändern.
            {showBackshopListScopeControls ? (
              <>
                {' '}
                Unter „Meine Liste“ siehst du nur Artikel, die auf deiner Backshop-Liste angezeigt werden
                (wie in der PLU-Tabelle).
              </>
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            'shrink-0',
            showBackshopListScopeControls ? 'flex flex-wrap items-center gap-2 justify-between' : undefined,
          )}
          data-testid={showBackshopListScopeControls ? 'backshop-rename-list-scope' : undefined}
        >
          <div className={cn('relative min-w-0', showBackshopListScopeControls ? 'flex-1' : 'w-full')}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="PLU oder Name eingeben…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 w-full min-w-0"
              aria-label="Suche"
            />
          </div>
          {showBackshopListScopeControls ? (
            <div className="flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5" role="group" aria-label="Artikelumfang">
              <Button
                type="button"
                size="sm"
                variant={renameListScope === 'my_list' ? 'default' : 'ghost'}
                className="h-8 px-2.5 text-xs sm:text-sm"
                onClick={() => onRenameListScopeChange!('my_list')}
              >
                Meine Liste
              </Button>
              <Button
                type="button"
                size="sm"
                variant={renameListScope === 'all_products' ? 'default' : 'ghost'}
                className="h-8 px-2.5 text-xs sm:text-sm"
                onClick={() => onRenameListScopeChange!('all_products')}
              >
                Alle Produkte
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border rounded-lg overflow-hidden flex flex-1 min-h-0 flex-col md:min-h-[400px]">
          {filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground text-center">
                {searchText.trim()
                  ? 'Keine Treffer.'
                  : showBackshopListScopeControls && renameListScope === 'my_list'
                    ? 'Keine Artikel aus deiner Liste. Mit „Alle Produkte“ den vollen Katalog durchsuchen.'
                    : 'Keine Produkte in dieser Version.'}
              </p>
            </div>
          ) : (
            <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
                  <ul className="md:hidden divide-y divide-border" data-testid="rename-products-dialog-mobile-list">
                    {layout.mobileRows.map((row, i) => {
                      if (row.type === 'section') {
                        const stueck = row.title.includes('Stück')
                        return (
                          <li
                            key={`mrs-${i}`}
                            className={cn(
                              stueck ? PLU_TABLE_HEADER_STUECK_CLASS : PLU_TABLE_HEADER_GEWICHT_CLASS,
                              'list-none',
                            )}
                          >
                            {row.title}
                          </li>
                        )
                      }
                      if (row.type === 'header') {
                        return (
                          <li
                            key={`mrh-${i}-${row.label}`}
                            className="px-3 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                          >
                            {row.label}
                          </li>
                        )
                      }
                      const item = row.item
                      const match = itemMatchesSearch(item, deferredSearch)
                      return (
                        <li
                          key={item.id}
                          data-highlight={match ? 'true' : undefined}
                          className={cn('flex items-start gap-2 px-3 py-2', match && 'bg-primary/10')}
                        >
                          {listKind === 'backshop' ? (
                            <RenamePickerThumb url={item.image_url} />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm inline-flex items-center gap-1 flex-wrap">
                              {getDisplayPlu(item.plu)}
                              <RenamePickerBrandBadge item={item} />
                            </p>
                            <p className="text-sm break-words mt-0.5">{item.display_name}</p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 w-10 shrink-0"
                                onClick={() => handleOpenRename(item)}
                                aria-label="Umbenennen"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Umbenennen</TooltipContent>
                          </Tooltip>
                        </li>
                      )
                    })}
                  </ul>

                  {/* Zeilenweise */}
                  {layout.mode === 'row_by_row' && (
                    <table className="hidden md:table w-full table-fixed border-collapse">
                      <colgroup>
                        {listKind === 'backshop' ? <col className="w-[44px]" /> : null}
                        <col className="w-[80px]" />
                        <col />
                        {listKind === 'backshop' ? <col className="w-[44px]" /> : null}
                        <col className="w-[80px]" />
                        <col />
                      </colgroup>
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b-2 border-border">
                          {listKind === 'backshop' ? (
                            <th className="w-[44px] px-1 py-1.5" aria-hidden />
                          ) : null}
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                            PLU
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </th>
                          {listKind === 'backshop' ? (
                            <th className="w-[44px] px-1 py-1.5 border-l-2 border-border" aria-hidden />
                          ) : null}
                          <th
                            className={cn(
                              'px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]',
                              listKind === 'backshop' ? 'border-l border-border' : 'border-l-2 border-border',
                            )}
                          >
                            PLU
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, i) => {
                          const headerColSpan = listKind === 'backshop' ? 6 : 4
                          if (row.type === 'header') {
                            return (
                              <tr key={`h-${i}-${row.label}`} className="border-b border-border">
                                <td
                                  colSpan={headerColSpan}
                                  className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                                >
                                  {row.label}
                                </td>
                              </tr>
                            )
                          }
                          const leftMatch = row.left ? itemMatchesSearch(row.left, deferredSearch) : false
                          const rightMatch = row.right ? itemMatchesSearch(row.right, deferredSearch) : false
                          const highlightRow = leftMatch || rightMatch
                          return (
                            <tr
                              key={`r-${i}`}
                              data-highlight={highlightRow ? 'true' : undefined}
                              className={cn(
                                'border-b border-border last:border-b-0',
                                highlightRow && 'bg-primary/10',
                              )}
                            >
                              {listKind === 'backshop' ? (
                                <td className="px-1 py-1 align-middle">
                                  {row.left ? <RenamePickerThumb url={row.left.image_url} /> : null}
                                </td>
                              ) : null}
                              <td className="px-2 py-1 text-sm font-mono align-middle">
                                {row.left ? (
                                  <span className="inline-flex items-center gap-1 flex-wrap">
                                    {getDisplayPlu(row.left.plu)}
                                    <RenamePickerBrandBadge item={row.left} />
                                  </span>
                                ) : (
                                  ''
                                )}
                              </td>
                              <td className="px-2 py-1 text-sm border-l border-border align-middle">
                                {row.left ? (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="flex-1 min-w-0 truncate" title={row.left.display_name}>
                                      {row.left.display_name}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                      onClick={() => {
                                        if (row.left) handleOpenRename(row.left)
                                      }}
                                      aria-label="Umbenennen"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  ''
                                )}
                              </td>
                              {listKind === 'backshop' ? (
                                <td className="px-1 py-1 align-middle border-l-2 border-border">
                                  {row.right ? <RenamePickerThumb url={row.right.image_url} /> : null}
                                </td>
                              ) : null}
                              <td
                                className={cn(
                                  'px-2 py-1 text-sm font-mono align-middle',
                                  listKind === 'backshop' ? 'border-l border-border' : 'border-l-2 border-border',
                                )}
                              >
                                {row.right ? (
                                  <span className="inline-flex items-center gap-1 flex-wrap">
                                    {getDisplayPlu(row.right.plu)}
                                    <RenamePickerBrandBadge item={row.right} />
                                  </span>
                                ) : (
                                  ''
                                )}
                              </td>
                              <td className="px-2 py-1 text-sm border-l border-border align-middle">
                                {row.right ? (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="flex-1 min-w-0 truncate" title={row.right.display_name}>
                                      {row.right.display_name}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                      onClick={() => {
                                        if (row.right) handleOpenRename(row.right)
                                      }}
                                      aria-label="Umbenennen"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  ''
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Obst: Zeitung */}
                  {layout.mode === 'newspaper_obst' && (
                    <div className="hidden md:block">
                      <table className="w-full table-fixed border-collapse">
                        <colgroup>
                          <col className="w-[80px]" />
                          <col />
                          <col className="w-[80px]" />
                          <col />
                        </colgroup>
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b-2 border-border">
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                              PLU
                            </th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                              Artikel
                            </th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px] border-l-2 border-border">
                              PLU
                            </th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                              Artikel
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {layout.sections.map((sec, secIdx) => (
                            <Fragment key={`rsec-${secIdx}`}>
                              {sec.sectionBanner && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className={cn(
                                      'p-0',
                                      sec.sectionBanner.includes('Stück')
                                        ? PLU_TABLE_HEADER_STUECK_CLASS
                                        : PLU_TABLE_HEADER_GEWICHT_CLASS,
                                    )}
                                  >
                                    {sec.sectionBanner}
                                  </td>
                                </tr>
                              )}
                              {sec.pages.map((page, pageIdx) => (
                                <Fragment key={`rpg-${secIdx}-${pageIdx}`}>
                                  {pageIdx > 0 && (
                                    <tr>
                                      <td colSpan={4} className="p-0 border-0">
                                        <div
                                          className="flex items-center gap-3 border-t border-dashed border-border bg-muted/25 px-4 py-2.5 text-sm font-medium text-muted-foreground"
                                          role="separator"
                                          aria-label={`Seite ${pageIdx + 1}`}
                                        >
                                          <span className="h-px min-w-[2rem] flex-1 bg-border" aria-hidden />
                                          Seite {pageIdx + 1}
                                          <span className="h-px min-w-[2rem] flex-1 bg-border" aria-hidden />
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="border-0">
                                    <td colSpan={4} className="p-0 align-top border-b border-border">
                                      <div
                                        className="flex divide-x divide-border items-start"
                                        style={{
                                          minHeight: newspaperPageMinHeightPx(pageIdx, sec.heights),
                                        }}
                                      >
                                        <RenameColumnTable
                                          rows={newspaperRowsToFlatRows(page.left)}
                                          deferredSearch={deferredSearch}
                                          onRename={handleOpenRename}
                                          listKind={listKind}
                                        />
                                        <RenameColumnTable
                                          rows={newspaperRowsToFlatRows(page.right)}
                                          deferredSearch={deferredSearch}
                                          onRename={handleOpenRename}
                                          listKind={listKind}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                </Fragment>
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Backshop: zwei Spalten-Listen (wie PLUTable split) */}
                  {layout.mode === 'split_columns' && (
                    <div className="hidden md:block">
                      <div className="sticky top-0 z-10 bg-background border-b-2 border-border flex w-full">
                        <div className="flex-1 flex min-w-0 border-r border-border">
                          {listKind === 'backshop' ? (
                            <span className="w-[44px] shrink-0 px-1 py-1.5" aria-hidden />
                          ) : null}
                          <span className="w-[80px] shrink-0 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            PLU
                          </span>
                          <span className="flex-1 min-w-0 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </span>
                        </div>
                        <div className="flex-1 flex min-w-0">
                          {listKind === 'backshop' ? (
                            <span className="w-[44px] shrink-0 px-1 py-1.5" aria-hidden />
                          ) : null}
                          <span className="w-[80px] shrink-0 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            PLU
                          </span>
                          <span className="flex-1 min-w-0 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </span>
                        </div>
                      </div>
                      <div className="flex divide-x divide-border">
                        <RenameColumnTable
                          rows={layout.leftFlat}
                          deferredSearch={deferredSearch}
                          onRename={handleOpenRename}
                          listKind={listKind}
                        />
                        <RenameColumnTable
                          rows={layout.rightFlat}
                          deferredSearch={deferredSearch}
                          onRename={handleOpenRename}
                          listKind={listKind}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
        </div>
        <div className="flex justify-end pt-2 shrink-0">
          <Button variant="outline" type="button" onClick={onCancel}>
            Zurück zur Liste
          </Button>
        </div>
      </div>

      <RenameDialog
        open={!!renameItem}
        onOpenChange={handleRenameDialogClose}
        item={renameItem}
        listType={listType}
        dataTour={renameDialogDataTour}
        submitDataTour={renameDialogSubmitDataTour}
      />
    </>
  )
}
