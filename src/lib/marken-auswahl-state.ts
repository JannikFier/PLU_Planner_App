// Reine Helfer für Zustand „Marken-Auswahl“: Filter-Chips, Sidebar-Badges, Vorschau-Logik.

import { BACKSHOP_SOURCES, type BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'

export type MarkenListFilter = 'all' | 'offen' | 'teil' | 'confirmed'
export type GroupListStatus = 'offen' | 'teil' | 'confirmed'

export function sortMemberSources(sources: Iterable<BackshopSource>): BackshopSource[] {
  const u = new Set<BackshopSource>(sources)
  return [...u].sort(
    (a, b) => BACKSHOP_SOURCES.indexOf(a as BackshopExcelSource) - BACKSHOP_SOURCES.indexOf(b as BackshopExcelSource),
  )
}

/** Fachzustand der Gruppe für UI (Sidebar, Chips) — nach DB-`chosen_sources` + Member-Menge. */
export function getGroupListStatus(
  memberSources: BackshopSource[],
  chosen: BackshopSource[] | undefined,
): GroupListStatus {
  if (memberSources.length === 0) return 'offen'
  const c = (chosen ?? []).filter((s) => memberSources.includes(s))
  if (c.length === 0) return 'offen'
  if (c.length === memberSources.length) return 'confirmed'
  return 'teil'
}

export function countByStatus(
  list: { id: string; mem: BackshopSource[]; chosen: BackshopSource[] | undefined }[],
): { all: number; offen: number; teil: number; confirmed: number } {
  const out = { all: list.length, offen: 0, teil: 0, confirmed: 0 }
  for (const row of list) {
    const s = getGroupListStatus(row.mem, row.chosen)
    if (s === 'offen') out.offen += 1
    else if (s === 'teil') out.teil += 1
    else out.confirmed += 1
  }
  return out
}

/** Passt `listFilter` zur Zielgruppe? */
export function matchesListFilter(
  st: GroupListStatus,
  filter: MarkenListFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'offen') return st === 'offen'
  if (filter === 'teil') return st === 'teil'
  return st === 'confirmed'
}
