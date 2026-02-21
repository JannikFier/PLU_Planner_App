// AddToOfferDialog: Produkte zur Werbung hinzufügen
// Suchfeld (PLU/Name), Laufzeit 1–4 Wochen, Klick auf Treffer = hinzufügen

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Megaphone } from 'lucide-react'
import { filterItemsBySearch, getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

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

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name?: string
}

/** Baut Reihen: Header pro Gruppe, dann Items paarweise (links/rechts) wie Master-PLU-Liste */
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

export interface AddToOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchableItems: SearchableItem[]
  /** Klick auf Produkt: (plu, durationWeeks) → hinzufügen */
  onAdd: (plu: string, durationWeeks: number) => void
  isAdding?: boolean
}

export function AddToOfferDialog({
  open,
  onOpenChange,
  searchableItems,
  onAdd,
  isAdding = false,
}: AddToOfferDialogProps) {
  const [searchText, setSearchText] = useState('')
  const [durationWeeks, setDurationWeeks] = useState(1)

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return searchableItems
    return filterItemsBySearch(searchableItems, searchText)
  }, [searchableItems, searchText])

  const groups = useMemo(() => groupByLetter(filteredItems), [filteredItems])
  const tableRows = useMemo(() => buildTableRows(groups), [groups])

  const handleAdd = (plu: string) => {
    onAdd(plu, durationWeeks)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setSearchText('')
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Produkte zur Werbung hinzufügen</DialogTitle>
          <DialogDescription>
            Suche nach PLU oder Name. Klicke auf ein Produkt, um es mit der gewählten Laufzeit zur Werbung hinzuzufügen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 min-w-0 flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Laufzeit:</span>
              <Select value={String(durationWeeks)} onValueChange={(v) => setDurationWeeks(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Woche</SelectItem>
                  <SelectItem value="2">2 Wochen</SelectItem>
                  <SelectItem value="3">3 Wochen</SelectItem>
                  <SelectItem value="4">4 Wochen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden min-h-[400px] max-h-[60vh] flex flex-col min-w-0">
            {filteredItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte vorhanden.'}
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 min-w-0">
                <table className="w-full table-fixed" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col className="w-[70px] min-w-[70px]" />
                    <col />
                    <col className="w-[58px] min-w-[58px]" />
                    <col className="w-[70px] min-w-[70px]" />
                    <col />
                    <col className="w-[58px] min-w-[58px]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b-2 border-border">
                      <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0 overflow-hidden">
                        PLU
                      </th>
                      <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border min-w-0 overflow-hidden">
                        Artikel
                      </th>
                      <th className="px-1 py-1.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border w-[58px]">
                        Aktion
                      </th>
                      <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l-2 border-border min-w-0 overflow-hidden">
                        PLU
                      </th>
                      <th className="px-1.5 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border min-w-0 overflow-hidden">
                        Artikel
                      </th>
                      <th className="px-1 py-1.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border w-[58px]">
                        Aktion
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
                      return (
                        <tr
                          key={`r-${i}`}
                          className={cn(
                            'border-b border-border last:border-b-0 hover:bg-muted/30',
                            isAdding && 'opacity-70',
                          )}
                        >
                          {/* Linke Spalte */}
                          <td className="px-1.5 py-1 font-mono text-sm min-w-0 overflow-hidden">{row.left ? getDisplayPlu(row.left.plu) : ''}</td>
                          <td className="px-1.5 py-1 text-sm break-words min-w-0 overflow-hidden border-l border-border">
                            {row.left?.display_name ?? row.left?.system_name ?? ''}
                          </td>
                          <td className="px-1 py-1 text-center border-l border-border w-[58px]">
                            {row.left ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleAdd(row.left!.plu)}
                                disabled={isAdding}
                                title="Zur Werbung hinzufügen"
                              >
                                <Megaphone className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </td>
                          {/* Rechte Spalte */}
                          <td className="px-1.5 py-1 font-mono text-sm border-l-2 border-border min-w-0 overflow-hidden">
                            {row.right ? getDisplayPlu(row.right.plu) : ''}
                          </td>
                          <td className="px-1.5 py-1 text-sm break-words min-w-0 overflow-hidden border-l border-border">
                            {row.right?.display_name ?? row.right?.system_name ?? ''}
                          </td>
                          <td className="px-1 py-1 text-center border-l border-border w-[58px]">
                            {row.right ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleAdd(row.right!.plu)}
                                disabled={isAdding}
                                title="Zur Werbung hinzufügen"
                              >
                                <Megaphone className="h-4 w-4" />
                              </Button>
                            ) : null}
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
      </DialogContent>
    </Dialog>
  )
}
