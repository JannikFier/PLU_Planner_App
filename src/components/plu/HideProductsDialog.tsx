// HideProductsDialog: Dialog zum Ausblenden von Produkten
// Suchleiste (PLU/Name), Liste mit Scroll zu Treffern, Multi-Auswahl, Batch-Ausblenden

import { useState, useMemo, useRef, useEffect } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
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
import { Search, EyeOff } from 'lucide-react'
import { useHideProductsBatch } from '@/hooks/useHiddenItems'
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

type TableRow = { type: 'header'; label: string } | { type: 'row'; left?: SearchableItem; right?: SearchableItem }
type MobileFlatRow =
  | { type: 'header'; label: string }
  | { type: 'item'; item: SearchableItem }

function buildMobileFlatRows(groups: { label: string; items: SearchableItem[] }[]): MobileFlatRow[] {
  const out: MobileFlatRow[] = []
  for (const g of groups) {
    out.push({ type: 'header', label: g.label })
    for (const item of g.items) {
      out.push({ type: 'item', item })
    }
  }
  return out
}

function buildTableRows(groups: { label: string; items: SearchableItem[] }[]): TableRow[] {
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

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name?: string
  item_type?: 'PIECE' | 'WEIGHT' | string | null
  block_id?: string | null
}

interface HideProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Produkte die noch ausgeblendet werden können (Master + Custom, nicht bereits ausgeblendet) */
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
}

export function HideProductsDialog({
  open,
  onOpenChange,
  searchableItems,
  displayMode = 'MIXED',
  listLayout,
}: HideProductsDialogProps) {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDebouncedValue(searchText, 200)
  const [selectedPLUs, setSelectedPLUs] = useState<Set<string>>(new Set())
  const hideBatch = useHideProductsBatch()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Leere Suche = alle Items; sonst gefiltert
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

  // Nach Suchen-Änderung: Zum ersten Treffer scrollen
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

  const handleHide = async () => {
    if (selectedPLUs.size === 0) return
    try {
      await hideBatch.mutateAsync([...selectedPLUs])
      setSelectedPLUs(new Set())
      setSearchText('')
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchText('')
      setSelectedPLUs(new Set())
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col min-h-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Produkte ausblenden</DialogTitle>
          <DialogDescription>
            Suche nach PLU oder Name und wähle die Produkte aus, die ausgeblendet werden sollen.
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
            />
          </div>

          <div className="border rounded-lg overflow-hidden flex flex-1 min-h-0 flex-col md:min-h-[400px]">
            {filteredItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte zum Ausblenden. Alle sind bereits ausgeblendet.'}
                </p>
              </div>
            ) : (
              <div ref={scrollContainerRef} className="overflow-auto flex-1 min-h-0">
                <ul className="md:hidden divide-y divide-border" data-testid="hide-products-dialog-mobile-list">
                  {mobileFlatRows.map((row, i) => {
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
                <table className="hidden md:table w-full table-fixed">
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
                        <tr key={`r-${i}`} data-highlight={hasMatch} className="border-b border-border last:border-b-0">
                          {/* Linke Spalte */}
                          <td className="px-1 py-1 text-center">
                            {row.left ? (
                              <Checkbox
                                checked={leftSel}
                                onCheckedChange={() => { const p = row.left?.plu; if (p) toggleSelect(p) }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : null}
                          </td>
                          <td
                            className={cn('px-2 py-1 text-sm font-mono', row.left && 'cursor-pointer hover:bg-muted/30', leftH && 'bg-primary/10')}
                            onClick={row.left ? () => { const p = row.left?.plu; if (p) toggleSelect(p) } : undefined}
                          >
                            {row.left ? getDisplayPlu(row.left.plu) : ''}
                          </td>
                          <td
                            className={cn('px-2 py-1 text-sm break-words min-w-0 border-l border-border', row.left && 'cursor-pointer hover:bg-muted/30', leftH && 'bg-primary/10')}
                            title={row.left?.display_name}
                            onClick={row.left ? () => { const p = row.left?.plu; if (p) toggleSelect(p) } : undefined}
                          >
                            {row.left?.display_name ?? ''}
                          </td>
                          {/* Rechte Spalte */}
                          <td className="px-1 py-1 text-center border-l-2 border-border">
                            {row.right ? (
                              <Checkbox
                                checked={rightSel}
                                onCheckedChange={() => { const p = row.right?.plu; if (p) toggleSelect(p) }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : null}
                          </td>
                          <td
                            className={cn('px-2 py-1 text-sm font-mono', row.right && 'cursor-pointer hover:bg-muted/30', rightH && 'bg-primary/10')}
                            onClick={row.right ? () => { const p = row.right?.plu; if (p) toggleSelect(p) } : undefined}
                          >
                            {row.right ? getDisplayPlu(row.right.plu) : ''}
                          </td>
                          <td
                            className={cn('px-2 py-1 text-sm break-words min-w-0 border-l border-border', row.right && 'cursor-pointer hover:bg-muted/30', rightH && 'bg-primary/10')}
                            title={row.right?.display_name}
                            onClick={row.right ? () => { const p = row.right?.plu; if (p) toggleSelect(p) } : undefined}
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
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleHide}
            disabled={selectedPLUs.size === 0 || hideBatch.isPending}
          >
            <EyeOff className="h-4 w-4 mr-2" />
            {hideBatch.isPending ? 'Wird ausgeblendet...' : `${selectedPLUs.size} Produkt${selectedPLUs.size === 1 ? '' : 'e'} ausblenden`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
