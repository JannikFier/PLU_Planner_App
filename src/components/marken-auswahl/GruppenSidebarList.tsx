import { useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MarkenQuellBadge } from '@/components/marken-auswahl/MarkenQuellBadge'
import { cn } from '@/lib/utils'
import { getGroupListStatus, countByStatus, matchesListFilter, type MarkenListFilter } from '@/lib/marken-auswahl-state'
import type { BackshopSource } from '@/types/database'
import type { BackshopProductGroupWithMembers } from '@/hooks/useBackshopProductGroups'
import type { BackshopBlock } from '@/types/database'

const FILTER_LABEL: Record<MarkenListFilter, string> = {
  all: 'Alle',
  offen: 'Offen',
  teil: 'Teilweise',
  confirmed: 'Alle bestätigt',
}

type Row = {
  g: BackshopProductGroupWithMembers
  mem: BackshopSource[]
  chosen: BackshopSource[]
  st: ReturnType<typeof getGroupListStatus>
}

export type GruppenSidebarListLayout = 'sidebar' | 'full'

export function GruppenSidebarList({
  groups,
  blocks,
  search,
  onSearch,
  listFilter,
  onListFilter,
  choiceByGroup,
  memberSourcesFor,
  selectedGroupId,
  onSelectGroup,
  focusGroupId,
  onFocusConsumed,
  onArrowKey,
  layout = 'sidebar',
  /** Schmal: Detail-Inhalt direkt unter der Gruppenzeile (Akkordeon) */
  inlineExpandedGroupId = null,
  renderGroupInlinePanel,
}: {
  groups: BackshopProductGroupWithMembers[]
  blocks: BackshopBlock[]
  search: string
  onSearch: (v: string) => void
  listFilter: MarkenListFilter
  onListFilter: (f: MarkenListFilter) => void
  choiceByGroup: Map<string, BackshopSource[]>
  memberSourcesFor: (groupId: string) => BackshopSource[]
  selectedGroupId: string | null
  onSelectGroup: (id: string) => void
  focusGroupId: string | null
  onFocusConsumed: () => void
  onArrowKey?: (dir: 'up' | 'down') => void
  layout?: GruppenSidebarListLayout
  inlineExpandedGroupId?: string | null
  renderGroupInlinePanel?: (groupId: string) => ReactNode
}) {
  const blockName = useCallback(
    (bid: string | null) => (bid && blocks.find((b) => b.id === bid)?.name) || 'Ohne Warengruppe',
    [blocks],
  )
  const rowRef = useRef<Record<string, HTMLButtonElement | null>>({})

  const withMeta: Row[] = useMemo(
    () =>
      groups.map((g) => {
        const mem = memberSourcesFor(g.id)
        const ch = choiceByGroup.get(g.id) ?? []
        return { g, mem, chosen: ch, st: getGroupListStatus(mem, ch) }
      }),
    [groups, memberSourcesFor, choiceByGroup],
  )

  const q = search.trim().toLowerCase()
  const filtered: Row[] = useMemo(() => {
    return withMeta.filter((row) => {
      if (q) {
        const inName = row.g.display_name.toLowerCase().includes(q)
        const inMem = row.g.resolvedItems.some(
          (it) => it.system_name.toLowerCase().includes(q) || it.plu.toLowerCase().includes(q),
        )
        if (!inName && !inMem) return false
      }
      return matchesListFilter(row.st, listFilter)
    })
  }, [withMeta, q, listFilter])

  const byWg = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const row of filtered) {
      const w = blockName(row.g.block_id)
      if (!m.has(w)) m.set(w, [])
      m.get(w)!.push(row)
    }
    return m
  }, [filtered, blockName])

  const firstGroupId = useMemo(() => {
    for (const rows of byWg.values()) {
      if (rows.length > 0) return rows[0]!.g.id
    }
    return null
  }, [byWg])

  const chipCounts = useMemo(
    () => countByStatus(withMeta.map((r) => ({ id: r.g.id, mem: r.mem, chosen: r.chosen }))),
    [withMeta],
  )

  useEffect(() => {
    if (!focusGroupId) return
    const el = rowRef.current[focusGroupId]
    el?.scrollIntoView({ block: 'nearest' })
    onFocusConsumed()
  }, [focusGroupId, onFocusConsumed])

  return (
    <div
      data-testid="marken-auswahl-gruppen-liste"
      data-tour="backshop-marken-auswahl-sidebar"
      className={cn(
        'flex flex-col h-full min-h-0 bg-stone-50/30 outline-none',
        layout === 'sidebar'
          ? 'w-[360px] min-w-[360px] max-w-[360px] border-r border-stone-200'
          : 'w-full min-w-0 max-w-none border-stone-200',
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          onArrowKey?.('down')
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          onArrowKey?.('up')
        }
      }}
    >
      <div className="p-3 border-b border-stone-200 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Suchen…"
            className="h-8 pl-8 text-sm bg-white border-stone-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTER_LABEL) as MarkenListFilter[]).map((k) => {
            const c =
              k === 'all'
                ? chipCounts.all
                : k === 'offen'
                  ? chipCounts.offen
                  : k === 'teil'
                    ? chipCounts.teil
                    : chipCounts.confirmed
            return (
              <button
                key={k}
                type="button"
                onClick={() => onListFilter(k)}
                className={cn(
                  'h-[26px] inline-flex items-center gap-1 rounded-full border px-2 text-xs tabular-nums',
                  listFilter === k
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
                )}
              >
                {FILTER_LABEL[k]}
                <span className="text-[10px] opacity-80">{c}</span>
              </button>
            )
          })}
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-0 pb-6">
          {filtered.length === 0 ? (
            <p className="text-xs text-stone-500 p-3">Keine Treffer</p>
          ) : (
            Array.from(byWg.entries()).map(([wg, rowsF]) => (
              <div key={wg}>
                <div
                  className="sticky top-0 z-10 border-y border-stone-200 bg-stone-50 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400"
                >
                  {wg}
                </div>
                {rowsF.map((row) => {
                  const { g, mem, chosen, st } = row
                  const isSel = selectedGroupId === g.id
                  const isInlineOpen = Boolean(
                    renderGroupInlinePanel && inlineExpandedGroupId === g.id,
                  )
                  const stLabel =
                    st === 'offen' ? { t: 'Offen', c: 'bg-stone-100 text-stone-700 border-stone-200' }
                    : st === 'teil' ? { t: 'Teil', c: 'bg-blue-50 text-blue-900 border-blue-200' }
                    : { t: 'Alle', c: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
                  return (
                    <div key={g.id} className="border-b border-stone-200">
                    <button
                      type="button"
                      id={`marken-gruppe-trigger-${g.id}`}
                      ref={(el) => {
                        rowRef.current[g.id] = el
                      }}
                      onClick={() => onSelectGroup(g.id)}
                      aria-expanded={renderGroupInlinePanel ? isInlineOpen : undefined}
                      aria-controls={isInlineOpen ? `marken-gruppe-panel-${g.id}` : undefined}
                      className={cn(
                        'w-full text-left px-3 py-2.5 transition-colors',
                        isSel ? 'bg-stone-100 border-l-[3px] border-l-stone-900' : 'border-l-[3px] border-l-transparent hover:bg-stone-100/50',
                      )}
                      {...(g.id === firstGroupId
                        ? { 'data-tour': 'backshop-marken-auswahl-sidebar-first-group' }
                        : {})}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-medium text-stone-900 line-clamp-2 pr-1">{g.display_name}</span>
                        <span className={cn('shrink-0 text-[10px] px-1.5 py-0.5 rounded border', stLabel.c)}>{stLabel.t}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 flex-wrap">
                          {mem.map((s) => (
                            <MarkenQuellBadge key={s} source={s} size="sm" dimmed={!chosen.includes(s)} />
                          ))}
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono tabular-nums">
                          {chosen.filter((c) => mem.includes(c)).length}/{mem.length}
                        </span>
                      </div>
                    </button>
                    {isInlineOpen && renderGroupInlinePanel && (
                      <div
                        id={`marken-gruppe-panel-${g.id}`}
                        role="region"
                        aria-labelledby={`marken-gruppe-trigger-${g.id}`}
                        className="bg-white border-t border-stone-100"
                      >
                        {renderGroupInlinePanel(g.id)}
                      </div>
                    )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
