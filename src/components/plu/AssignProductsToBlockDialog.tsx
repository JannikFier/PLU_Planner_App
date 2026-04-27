// AssignProductsToBlockDialog: Produkte einer Warengruppe zuweisen (Layout wie „Produkte ausblenden“)

import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, UserPlus } from 'lucide-react'
import { useAssignObstProductBlockOverride } from '@/hooks/useStoreObstBlockLayout'
import {
  filterItemsBySearch,
  getDisplayPlu,
  groupItemsForDialog,
  groupItemsForDialogAlignedWithList,
  itemMatchesSearch,
} from '@/lib/plu-helpers'
import type { Block } from '@/types/database'
import type { StoreBlockOrderRow } from '@/lib/block-override-utils'
import {
  buildDialogPluLayout,
  newspaperPageMinHeightPx,
  type DialogPluFontSizes,
} from '@/lib/dialog-plu-layout'
import { newspaperRowsToFlatRows } from '@/lib/newspaper-column-pages'
import { PLU_TABLE_HEADER_GEWICHT_CLASS, PLU_TABLE_HEADER_STUECK_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DialogPluHideColumnTable } from '@/components/plu/DialogPluHideColumnTable'

type TableRow = { type: 'header'; label: string } | { type: 'row'; left?: SearchableItem; right?: SearchableItem }

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name?: string
  item_type?: 'PIECE' | 'WEIGHT' | string | null
  block_id?: string | null
}

const DEFAULT_FONT_SIZES: DialogPluFontSizes = { header: 24, column: 16, product: 12 }

interface AssignProductsToBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ziel-Warengruppe (Block-ID) */
  blockId: string | null
  /** Anzeigename der Warengruppe (Titel/Footer) */
  blockName: string
  /** Master-PLU-Zeilen mit system_name und block_id für Overrides */
  searchableItems: SearchableItem[]
  /** Anzeige-Modus: SEPARATED = nach Stück/Gewicht getrennt, MIXED = nur alphabetisch */
  displayMode?: 'MIXED' | 'SEPARATED'
  /** Optional: gleiche Gruppierung wie die Masterliste (Sortierung + Markt-Overrides) */
  listLayout?: {
    sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
    blocks: Block[]
    storeBlockOrder: StoreBlockOrderRow[]
    nameBlockOverrides: Map<string, string>
  }
  /** Wie Masterliste / Layout-Einstellungen */
  flowDirection?: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  fontSizes?: DialogPluFontSizes
}

export function AssignProductsToBlockDialog({
  open,
  onOpenChange,
  blockId,
  blockName,
  searchableItems,
  displayMode = 'MIXED',
  listLayout,
  flowDirection = 'COLUMN_FIRST',
  fontSizes = DEFAULT_FONT_SIZES,
}: AssignProductsToBlockDialogProps) {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [selectedPLUs, setSelectedPLUs] = useState<Set<string>>(new Set())
  const assignOverride = useAssignObstProductBlockOverride()
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

  const sortMode = listLayout?.sortMode ?? 'ALPHABETICAL'

  const layout = useMemo(
    () =>
      buildDialogPluLayout({
        groups,
        filteredItems,
        flowDirection,
        displayMode,
        sortMode,
        listType: 'obst',
        fontSizes,
      }),
    [groups, filteredItems, flowDirection, displayMode, sortMode, fontSizes],
  )

  const searchLower = deferredSearch.trim().toLowerCase()

  useEffect(() => {
    if (!open || !searchLower || filteredItems.length === 0 || !scrollContainerRef.current) return
    const first = scrollContainerRef.current.querySelector('[data-highlight="true"]')
    if (first) {
      first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open, searchLower, filteredItems])

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

  const handleAssign = async () => {
    if (!blockId || selectedPLUs.size === 0) return
    try {
      let n = 0
      for (const plu of selectedPLUs) {
        const item = searchableItems.find((i) => i.plu === plu)
        if (!item?.system_name) continue
        await assignOverride.mutateAsync({
          systemName: item.system_name,
          masterBlockId: item.block_id ?? null,
          targetBlockId: blockId,
        })
        n++
      }
      toast.success(`${n} Produkt${n === 1 ? '' : 'e'} „${blockName}“ zugewiesen`)
      setSelectedPLUs(new Set())
      setSearchText('')
      onOpenChange(false)
    } catch {
      // Fehler-Toast kommt vom Mutation-Hook
    }
  }

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSearchText('')
      setSelectedPLUs(new Set())
    }
    onOpenChange(openState)
  }

  const tableRows: TableRow[] =
    layout.mode === 'row_by_row' ? layout.tableRows : []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[90vw] lg:max-w-5xl xl:max-w-7xl max-h-[90vh] flex flex-col min-h-0 overflow-hidden"
        data-tour="obst-konfig-warengruppen-assign-dialog"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Produkte zur Warengruppe hinzufügen</DialogTitle>
          <DialogDescription>
            Warengruppe: <span className="font-medium text-foreground">{blockName}</span>. Suche nach PLU oder Name,
            wähle Produkte aus und weise sie dieser Gruppe zu (Markt-Override, wie in der Listenansicht).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col gap-4 py-4 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="PLU oder Name eingeben..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              aria-label="Suche"
              data-tour="obst-konfig-warengruppen-assign-search"
            />
          </div>

          <div className="border rounded-lg overflow-hidden flex flex-1 min-h-0 flex-col md:min-h-[400px]">
            {filteredItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte in der Liste.'}
                </p>
              </div>
            ) : (
              <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
                <ul
                  className="md:hidden divide-y divide-border"
                  data-testid="assign-products-to-block-dialog-mobile-list"
                  data-tour="obst-konfig-warengruppen-assign-mobile-list"
                >
                  {layout.mobileRows.map((row, i) => {
                    if (row.type === 'section') {
                      const stueck = row.title.includes('Stück')
                      return (
                        <li
                          key={`ms-${i}-${row.title}`}
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
                          key={`mh-${i}-${row.label}`}
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
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => toggleSelect(item.plu)}
                        >
                          <span className="font-mono text-sm">{getDisplayPlu(item.plu)}</span>
                          <p className="text-sm break-words mt-0.5">{item.display_name}</p>
                        </button>
                      </li>
                    )
                  })}
                </ul>

                {/* Desktop: Zeilenweise */}
                {layout.mode === 'row_by_row' && (
                  <table
                    className="hidden md:table w-full table-fixed"
                    data-tour="obst-konfig-warengruppen-assign-desktop-table"
                  >
                    <colgroup>
                      <col className="w-[36px]" />
                      <col className="w-[80px]" />
                      <col />
                      <col className="w-[36px]" />
                      <col className="w-[80px]" />
                      <col />
                    </colgroup>
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b-2 border-border">
                        <th className="px-1 py-1.5 w-[36px]">
                          <Label htmlFor="select-all" className="sr-only">Alle auswählen</Label>
                          <Checkbox
                            id="select-all"
                            checked={selectedPLUs.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={selectAll}
                            data-tour="obst-konfig-warengruppen-assign-select-all"
                          />
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                          PLU
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                          Artikel
                        </th>
                        <th className="px-1 py-1.5 w-[36px] border-l-2 border-border" />
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
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
                                colSpan={6}
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
                          <tr key={`r-${i}`} data-highlight={hasMatch ? 'true' : undefined} className="border-b border-border last:border-b-0">
                            <td className="px-1 py-1 text-center">
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
                            <td
                              className={cn(
                                'px-2 py-1 text-sm font-mono',
                                row.left && 'cursor-pointer hover:bg-muted/30',
                                leftH && 'bg-primary/10',
                              )}
                              onClick={row.left ? () => {
                                const p = row.left?.plu
                                if (p) toggleSelect(p)
                              } : undefined}
                            >
                              {row.left ? getDisplayPlu(row.left.plu) : ''}
                            </td>
                            <td
                              className={cn(
                                'px-2 py-1 text-sm break-words min-w-0 border-l border-border',
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
                            <td className="px-1 py-1 text-center border-l-2 border-border">
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
                            <td
                              className={cn(
                                'px-2 py-1 text-sm font-mono',
                                row.right && 'cursor-pointer hover:bg-muted/30',
                                rightH && 'bg-primary/10',
                              )}
                              onClick={row.right ? () => {
                                const p = row.right?.plu
                                if (p) toggleSelect(p)
                              } : undefined}
                            >
                              {row.right ? getDisplayPlu(row.right.plu) : ''}
                            </td>
                            <td
                              className={cn(
                                'px-2 py-1 text-sm break-words min-w-0 border-l border-border',
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
                )}

                {/* Desktop: Spaltenweise Obst (Zeitung) */}
                {layout.mode === 'newspaper_obst' && (
                  <div className="hidden md:block">
                    <table
                      className="w-full table-fixed"
                      data-tour="obst-konfig-warengruppen-assign-desktop-table"
                    >
                      <colgroup>
                        <col className="w-[36px]" />
                        <col className="w-[80px]" />
                        <col />
                        <col className="w-[36px]" />
                        <col className="w-[80px]" />
                        <col />
                      </colgroup>
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b-2 border-border">
                          <th className="px-1 py-1.5 w-[36px]">
                            <Label htmlFor="select-all-np" className="sr-only">Alle auswählen</Label>
                            <Checkbox
                              id="select-all-np"
                              checked={selectedPLUs.size === filteredItems.length && filteredItems.length > 0}
                              onCheckedChange={selectAll}
                              data-tour="obst-konfig-warengruppen-assign-select-all"
                            />
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                            PLU
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </th>
                          <th className="px-1 py-1.5 w-[36px] border-l-2 border-border" />
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                            PLU
                          </th>
                          <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                            Artikel
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {layout.sections.map((sec, secIdx) => (
                          <Fragment key={`sec-${secIdx}`}>
                            {sec.sectionBanner && (
                              <tr>
                                <td
                                  colSpan={6}
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
                              <Fragment key={`pg-${secIdx}-${pageIdx}`}>
                                {pageIdx > 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-0 border-0">
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
                                  <td colSpan={6} className="p-0 align-top border-b border-border">
                                    <div
                                      className="flex divide-x divide-border items-start"
                                      style={{
                                        minHeight: newspaperPageMinHeightPx(pageIdx, sec.heights),
                                      }}
                                    >
                                      <DialogPluHideColumnTable
                                        rows={newspaperRowsToFlatRows(page.left)}
                                        deferredSearch={deferredSearch}
                                        selectedPLUs={selectedPLUs}
                                        toggleSelect={toggleSelect}
                                      />
                                      <DialogPluHideColumnTable
                                        rows={newspaperRowsToFlatRows(page.right)}
                                        deferredSearch={deferredSearch}
                                        selectedPLUs={selectedPLUs}
                                        toggleSelect={toggleSelect}
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
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            data-tour="obst-konfig-warengruppen-assign-cancel"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!blockId || selectedPLUs.size === 0 || assignOverride.isPending}
            data-tour="obst-konfig-warengruppen-assign-submit"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {assignOverride.isPending
              ? 'Wird zugewiesen...'
              : `${selectedPLUs.size} Produkt${selectedPLUs.size === 1 ? '' : 'e'} zuweisen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
