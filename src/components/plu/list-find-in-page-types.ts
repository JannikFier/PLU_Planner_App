import { cn } from '@/lib/utils'

/** Optional: Find-in-Page (scope + Treffer) für simple Listen mit data-row-index */
export interface ListFindInPageBinding {
  scopeId: string
  activeRowIndex: number | null
  matchIndices: readonly number[]
}

export function listFindInPageRowClassName(rowIndex: number, fp: ListFindInPageBinding | undefined): string {
  if (!fp) return ''
  const hit = fp.matchIndices.includes(rowIndex)
  const active = fp.activeRowIndex === rowIndex
  return cn(
    hit && 'bg-primary/10',
    active && 'bg-primary/[0.18] ring-1 ring-inset ring-primary/25',
  )
}
