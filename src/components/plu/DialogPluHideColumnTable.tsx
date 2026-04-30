// Eine Zeitungsspalte für Hide-/Zuweisen-Dialoge: Checkbox | PLU | Artikel
// colgroup wie PLUTable / Backshop-Hide-Dialog – zuverlässige Spaltenbreiten bei table-fixed in Flex

import { getDisplayPlu, itemMatchesSearch } from '@/lib/plu-helpers'
import type { DialogFlatRow } from '@/lib/dialog-plu-layout'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

/** Minimalfelder pro Zeile (Ausblend-Picker / AssignProductsToBlockDialog) */
export interface DialogPluHideColumnItem {
  id: string
  plu: string
  display_name: string
}

export interface DialogPluHideColumnTableProps<T extends DialogPluHideColumnItem> {
  rows: DialogFlatRow<T>[]
  deferredSearch: string
  selectedPLUs: Set<string>
  toggleSelect: (plu: string) => void
}

export function DialogPluHideColumnTable<T extends DialogPluHideColumnItem>({
  rows,
  deferredSearch,
  selectedPLUs,
  toggleSelect,
}: DialogPluHideColumnTableProps<T>) {
  return (
    <table className="w-full table-fixed flex-1 min-w-0">
      <colgroup>
        <col className="w-[36px]" />
        <col className="w-[80px]" />
        <col />
      </colgroup>
      <tbody>
        {rows.map((row, i) => {
          if (row.type === 'header') {
            return (
              <tr key={`dphc-h-${i}`} className="border-b border-border">
                <td
                  colSpan={3}
                  className="px-2 py-2 text-center font-bold text-muted-foreground tracking-widest uppercase bg-muted/50 text-sm"
                >
                  {row.label}
                </td>
              </tr>
            )
          }
          const item = row.item
          const match = itemMatchesSearch(item, deferredSearch)
          const sel = selectedPLUs.has(item.plu)
          return (
            <tr
              key={item.id}
              data-highlight={match ? 'true' : undefined}
              className={cn('border-b border-border', match && 'bg-primary/10')}
            >
              <td className="px-1 py-1 text-center">
                <Checkbox
                  checked={sel}
                  onCheckedChange={() => toggleSelect(item.plu)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Auswahl PLU ${getDisplayPlu(item.plu)}`}
                />
              </td>
              <td
                className={cn(
                  'px-2 py-1 text-sm font-mono',
                  'cursor-pointer hover:bg-muted/30',
                  match && 'bg-primary/10',
                )}
                onClick={() => toggleSelect(item.plu)}
              >
                {getDisplayPlu(item.plu)}
              </td>
              <td
                className={cn(
                  'px-2 py-1 text-sm break-words min-w-0 border-l border-border',
                  'cursor-pointer hover:bg-muted/30',
                  match && 'bg-primary/10',
                )}
                title={item.display_name}
                onClick={() => toggleSelect(item.plu)}
              >
                {item.display_name}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
