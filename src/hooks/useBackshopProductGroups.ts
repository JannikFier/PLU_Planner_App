// Backshop-Produktgruppen + Members: Lade-Hooks.
// Gruppen verbinden gleiche Artikel verschiedener Quellen (Edeka/Harry/Aryzta).

import { useQuery } from '@tanstack/react-query'
import { supabase, queryRest } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import {
  mergeBackshopMasterItemsWithCarryoverForDisplay,
  buildBackshopMasterItemByKeyMap,
} from '@/lib/backshop-merge-master-with-carryover'
import { resolveEffectiveBackshopVersionId } from '@/lib/backshop-effective-version-id'
import type {
  BackshopProductGroup,
  BackshopProductGroupMember,
  BackshopMasterPLUItem,
  StoreListCarryover,
} from '@/types/database'

/** Gruppe inkl. Members. */
export interface BackshopProductGroupWithMembers extends BackshopProductGroup {
  members: BackshopProductGroupMember[]
  /** Aus aktiver Version + marktspezifischem Carryover aufgelöste Artikel (wie sichtbare Backshop-Liste). */
  resolvedItems: Array<{
    plu: string
    source: BackshopProductGroupMember['source']
    system_name: string
    display_name: string | null
    image_url: string | null
    /** Master-Warengruppe (aktive Version); für Markt-Overrides siehe scopeProductGroupsByEffectiveBlock. */
    block_id: string | null
  }>
}

/** Lädt alle Produktgruppen und löst Members anhand der effektiven Backshop-Liste (Master aktiv + Carryover). */
export function useBackshopProductGroups() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<BackshopProductGroupWithMembers[]>({
    queryKey: ['backshop-product-groups', currentStoreId ?? 'none'],
    queryFn: async ({ signal }) => {
      const [groupsRes, membersRes, versionMeta] = await Promise.all([
        supabase
          .from('backshop_product_groups')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('backshop_product_group_members').select('*'),
        resolveEffectiveBackshopVersionId(signal),
      ])
      if (groupsRes.error) throw groupsRes.error
      if (membersRes.error) throw membersRes.error
      const groups = (groupsRes.data ?? []) as BackshopProductGroup[]
      const members = (membersRes.data ?? []) as BackshopProductGroupMember[]
      const effectiveVersionId = versionMeta.versionId

      let activeItems: BackshopMasterPLUItem[] = []
      if (effectiveVersionId) {
        const { data } = await supabase
          .from('backshop_master_plu_items')
          .select('*')
          .eq('version_id', effectiveVersionId)
        activeItems = (data ?? []) as BackshopMasterPLUItem[]
      }

      let carryoverRows: StoreListCarryover[] = []
      if (effectiveVersionId && currentStoreId) {
        carryoverRows =
          (await queryRest<StoreListCarryover[]>(
            'store_list_carryover',
            {
              select: '*',
              store_id: `eq.${currentStoreId}`,
              list_type: `eq.backshop`,
              for_version_id: `eq.${effectiveVersionId}`,
            },
            { signal },
          )) ?? []
      }

      const mergedItems =
        effectiveVersionId != null
          ? mergeBackshopMasterItemsWithCarryoverForDisplay(
              activeItems,
              carryoverRows,
              effectiveVersionId,
            )
          : activeItems
      const itemByKey = buildBackshopMasterItemByKeyMap(mergedItems)

      const membersByGroup = new Map<string, BackshopProductGroupMember[]>()
      for (const m of members) {
        const arr = membersByGroup.get(m.group_id)
        if (arr) arr.push(m)
        else membersByGroup.set(m.group_id, [m])
      }

      return groups.map((g) => {
        const gm = membersByGroup.get(g.id) ?? []
        const resolved = gm.map((m) => {
          const it = itemByKey.get(`${m.plu}|${m.source}`)
          return {
            plu: m.plu,
            source: m.source,
            system_name: it?.system_name ?? '(nicht in aktiver Version)',
            display_name: it?.display_name ?? null,
            image_url: it?.image_url ?? null,
            block_id: it?.block_id ?? null,
          }
        })
        return { ...g, members: gm, resolvedItems: resolved }
      })
    },
    staleTime: 30_000,
  })
}
