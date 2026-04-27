// Produktgruppen mit block_id: für einen Markt nur Mitglieder, deren effektive Warengruppe
// (Master block_id + store_backshop_name_block_override) mit group.block_id übereinstimmt.

import { effectiveBlockIdForStoreOverride } from '@/lib/block-override-utils'

/** Mindestfelder pro aufgelöstem Member für die Scope-Logik. */
export type ProductGroupResolvedForScope = {
  plu: string
  source: string
  system_name: string
  block_id: string | null
  display_name?: string | null
  image_url?: string | null
}

export type ProductGroupWithMembersForScope = {
  block_id: string | null
  members: Array<{ plu: string; source: string }>
  resolvedItems: ProductGroupResolvedForScope[]
}

/**
 * Filtert Mitglieder pro Gruppe nach effektiver Warengruppe für den aktuellen Markt.
 * Gruppen ohne `block_id` bleiben unverändert (gleiche Referenz).
 */
export function scopeProductGroupsByEffectiveBlock<G extends ProductGroupWithMembersForScope>(
  groups: G[],
  nameBlockOverrides: Map<string, string> | undefined,
): G[] {
  return groups.map((g) => {
    if (g.block_id == null) return g

    const keptKeys = new Set<string>()
    const filteredResolved = g.resolvedItems.filter((r) => {
      const eff = effectiveBlockIdForStoreOverride(r.system_name, r.block_id, nameBlockOverrides)
      if (eff !== g.block_id) return false
      keptKeys.add(`${r.plu}|${r.source}`)
      return true
    })

    if (keptKeys.size === g.members.length && filteredResolved.length === g.resolvedItems.length) {
      return g
    }

    const filteredMembers = g.members.filter((m) => keptKeys.has(`${m.plu}|${m.source}`))
    return { ...g, members: filteredMembers, resolvedItems: filteredResolved }
  })
}
