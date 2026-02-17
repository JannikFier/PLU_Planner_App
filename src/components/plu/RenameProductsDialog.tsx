// RenameProductsDialog: Dialog „Produkte umbenennen“ – PLU-Liste mit Suche (Filter wie Ausgeblenden), Stift pro Zeile

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Search } from 'lucide-react'
import { filterItemsBySearch, getDisplayPlu, itemMatchesSearch } from '@/lib/plu-helpers'
import { RenameDialog } from '@/components/plu/RenameDialog'
import { cn } from '@/lib/utils'
import type { MasterPLUItem } from '@/types/database'
import type { DisplayItem } from '@/types/plu'

/** Ä→A, Ö→O, Ü→U für Gruppierung */
function normalizeLetterForGrouping(char: string): string {
  const upper = char.toUpperCase()
  if (upper === 'Ä') return 'A'
  if (upper === 'Ö') return 'O'
  if (upper === 'Ü') return 'U'
  return upper
}

interface SearchableItem {
  id: string
  plu: string
  display_name: string
  system_name: string
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

export interface RenameProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Alle Master-Items der aktiven Version (id, plu, display_name, system_name). */
  searchableItems: MasterPLUItem[]
}

export function RenameProductsDialog({
  open,
  onOpenChange,
  searchableItems,
}: RenameProductsDialogProps) {
  const [searchText, setSearchText] = useState('')
  const [renameItem, setRenameItem] = useState<DisplayItem | null>(null)
  const queryClient = useQueryClient()
  const listRef = useRef<HTMLTableSectionElement | null>(null)

  const searchableAsList: SearchableItem[] = useMemo(
    () =>
      searchableItems.map((m) => ({
        id: m.id,
        plu: m.plu,
        display_name: m.display_name ?? m.system_name,
        system_name: m.system_name,
      })),
    [searchableItems],
  )

  const filteredItems = useMemo(
    () => filterItemsBySearch(searchableAsList, searchText),
    [searchableAsList, searchText],
  )

  const groups = useMemo(() => groupByLetter(filteredItems), [filteredItems])
  const tableRows = useMemo(() => buildTableRows(groups), [groups])

  // Bei Suchänderung zum ersten Treffer scrollen (wie HideProductsDialog)
  const searchLower = searchText.trim().toLowerCase()
  useEffect(() => {
    if (!open || !searchLower || filteredItems.length === 0 || !listRef.current) return
    const first = listRef.current.querySelector('[data-highlight="true"]')
    if (first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open, searchLower, filteredItems.length])

  const handleRenameDialogClose = useCallback(
    (closed: boolean) => {
      if (!closed) {
        setRenameItem(null)
        return
      }
      setRenameItem(null)
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
    },
    [queryClient],
  )

  const handleOpenRename = (item: SearchableItem) => {
    const master = searchableItems.find((m) => m.id === item.id)
    if (!master) return
    setRenameItem(masterItemToDisplayItem(master))
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setSearchText('')
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Produkte umbenennen</DialogTitle>
            <DialogDescription>
              Suche nach PLU oder Name, dann klicke auf den Stift, um den Anzeigenamen zu ändern.
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
                    {searchText.trim() ? 'Keine Treffer.' : 'Keine Produkte in dieser Version.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[80px]" />
                      <col />
                      <col className="w-[44px]" />
                      <col className="w-[80px]" />
                      <col />
                      <col className="w-[44px]" />
                    </colgroup>
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b-2 border-border">
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                          PLU
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                          Artikel
                        </th>
                        <th className="px-1 py-1.5 w-[44px] border-l-2 border-border" />
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                          PLU
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border">
                          Artikel
                        </th>
                        <th className="px-1 py-1.5 w-[44px] border-l-2 border-border" />
                      </tr>
                    </thead>
                    <tbody ref={listRef}>
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
                        const leftMatch = row.left ? itemMatchesSearch(row.left, searchText) : false
                        const rightMatch = row.right ? itemMatchesSearch(row.right, searchText) : false
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
                            <td className="px-2 py-1 text-sm font-mono">{row.left ? getDisplayPlu(row.left.plu) : ''}</td>
                            <td className="px-2 py-1 text-sm border-l border-border">
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
                                    onClick={() => handleOpenRename(row.left!)}
                                    aria-label="Umbenennen"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="border-l-2 border-border" />
                            <td className="px-2 py-1 text-sm font-mono">
                              {row.right ? getDisplayPlu(row.right.plu) : ''}
                            </td>
                            <td className="px-2 py-1 text-sm border-l border-border">
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
                                    onClick={() => handleOpenRename(row.right!)}
                                    aria-label="Umbenennen"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="border-l-2 border-border" />
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

      <RenameDialog
        open={!!renameItem}
        onOpenChange={handleRenameDialogClose}
        item={renameItem}
      />
    </>
  )
}
