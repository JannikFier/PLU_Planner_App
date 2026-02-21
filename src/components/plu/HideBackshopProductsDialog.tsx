// Backshop: Dialog zum Ausblenden von Produkten (Suche, Auswahl, einzeln ausblenden)

import { useState, useMemo, useRef, useEffect } from 'react'
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
import { useBackshopHideProduct } from '@/hooks/useBackshopHiddenItems'
import { filterItemsBySearch, getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name?: string
}

function normalizeLetterForGrouping(char: string): string {
  const upper = char.toUpperCase()
  if (upper === 'Ä') return 'A'
  if (upper === 'Ö') return 'O'
  if (upper === 'Ü') return 'U'
  return upper
}

function groupByLetter(items: SearchableItem[]): { letter: string; items: SearchableItem[] }[] {
  const grouped = new Map<string, SearchableItem[]>()
  for (const item of items) {
    const name = item.display_name ?? item.system_name ?? ''
    const firstChar = name.charAt(0)
    const letter = normalizeLetterForGrouping(firstChar) || '?'
    const existing = grouped.get(letter)
    if (existing) existing.push(item)
    else grouped.set(letter, [item])
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([letter, items]) => ({ letter, items }))
}

type TableRow = { type: 'header'; label: string } | { type: 'row'; left?: SearchableItem; right?: SearchableItem }
function buildTableRows(groups: { letter: string; items: SearchableItem[] }[]): TableRow[] {
  const rows: TableRow[] = []
  for (const group of groups) {
    rows.push({ type: 'header', label: `— ${group.letter} —` })
    const items = group.items
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ type: 'row', left: items[i], right: items[i + 1] })
    }
  }
  return rows
}

interface HideBackshopProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchableItems: SearchableItem[]
}

export function HideBackshopProductsDialog({
  open,
  onOpenChange,
  searchableItems,
}: HideBackshopProductsDialogProps) {
  const [searchText, setSearchText] = useState('')
  const [selectedPLUs, setSelectedPLUs] = useState<Set<string>>(new Set())
  const hideProduct = useBackshopHideProduct()
  const listRef = useRef<HTMLTableSectionElement | null>(null)

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return searchableItems
    return filterItemsBySearch(searchableItems, searchText)
  }, [searchableItems, searchText])

  const groups = useMemo(() => groupByLetter(filteredItems), [filteredItems])
  const tableRows = useMemo(() => buildTableRows(groups), [groups])

  const searchLower = searchText.trim().toLowerCase()
  const isMatch = (item: SearchableItem) => {
    if (!searchLower) return false
    const pluMatch = item.plu.toLowerCase().includes(searchLower)
    const name = (item.display_name ?? item.system_name ?? '').toLowerCase()
    const sys = (item.system_name ?? '').toLowerCase()
    return pluMatch || name.includes(searchLower) || sys.includes(searchLower)
  }

  useEffect(() => {
    if (!open || !searchLower || filteredItems.length === 0 || !listRef.current) return
    const first = listRef.current.querySelector('[data-highlight="true"]')
    if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
      for (const plu of selectedPLUs) {
        await hideProduct.mutateAsync(plu)
      }
      setSelectedPLUs(new Set())
      setSearchText('')
      onOpenChange(false)
    } catch {
      // Toast im Hook
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchText('')
      setSelectedPLUs(new Set())
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Produkte ausblenden (Backshop)</DialogTitle>
          <DialogDescription>
            Suche nach PLU oder Name und wähle die Produkte aus, die ausgeblendet werden sollen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
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

          <div className="border rounded-lg overflow-hidden min-h-[400px] max-h-[60vh] flex flex-col">
            {filteredItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte zum Ausblenden.'}
                </p>
              </div>
            ) : (
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full table-fixed">
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
                        <Checkbox
                          id="backshop-select-all"
                          checked={selectedPLUs.size === filteredItems.length && filteredItems.length > 0}
                          onCheckedChange={selectAll}
                        />
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-[80px]">PLU</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase border-l border-border">Artikel</th>
                      <th className="px-1 py-1.5 w-[36px] border-l-2 border-border" />
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase w-[80px]">PLU</th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase border-l border-border">Artikel</th>
                    </tr>
                  </thead>
                  <tbody ref={listRef}>
                    {tableRows.map((row, i) => {
                      if (row.type === 'header') {
                        return (
                          <tr key={`h-${i}-${row.label}`} className="border-b border-border">
                            <td colSpan={6} className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm">
                              {row.label}
                            </td>
                          </tr>
                        )
                      }
                      const leftMatch = row.left ? isMatch(row.left) : false
                      const rightMatch = row.right ? isMatch(row.right) : false
                      return (
                        <tr key={`r-${i}`} className={cn('border-b border-border', (leftMatch || rightMatch) && 'bg-primary/5')}>
                          <td className="px-1 py-1.5">
                            {row.left && (
                              <Checkbox
                                checked={selectedPLUs.has(row.left.plu)}
                                onCheckedChange={() => toggleSelect(row.left!.plu)}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-sm" data-highlight={leftMatch ? 'true' : undefined}>
                            {row.left ? getDisplayPlu(row.left.plu) : ''}
                          </td>
                          <td className="px-2 py-1.5 border-l border-border" data-highlight={leftMatch ? 'true' : undefined}>
                            {row.left?.display_name ?? ''}
                          </td>
                          <td className="px-1 py-1.5 border-l-2 border-border">
                            {row.right && (
                              <Checkbox
                                checked={selectedPLUs.has(row.right.plu)}
                                onCheckedChange={() => toggleSelect(row.right!.plu)}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-sm" data-highlight={rightMatch ? 'true' : undefined}>
                            {row.right ? getDisplayPlu(row.right.plu) : ''}
                          </td>
                          <td className="px-2 py-1.5 border-l border-border" data-highlight={rightMatch ? 'true' : undefined}>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>Abbrechen</Button>
            <Button
              onClick={handleHide}
              disabled={selectedPLUs.size === 0 || hideProduct.isPending}
            >
              <EyeOff className="h-4 w-4 mr-2" />
              {selectedPLUs.size} Produkt{selectedPLUs.size !== 1 ? 'e' : ''} ausblenden
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
