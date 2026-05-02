import { useMemo, useCallback } from 'react'
import type { BackshopSource } from '@/types/database'
import type { BackshopProductGroupWithMembers } from '@/hooks/useBackshopProductGroups'
import { BACKSHOP_SOURCES } from '@/lib/backshop-sources'
import { getGroupListStatus } from '@/lib/marken-auswahl-state'
import { resolveEffectiveChosenSourcesForGroupFilter } from '@/lib/backshop-group-effective-chosen'

export type BackshopMarkenAuswahlChoiceRow = {
  group_id: string
  chosen_sources: unknown
}

export type BackshopMarkenAuswahlBlockRuleRow = {
  block_id: string
  preferred_source: string
}

/**
 * Abgeleitete Listen für BackshopMarkenAuswahlPage (Stufe 4.9).
 */
export function useBackshopMarkenAuswahlDerived(
  groups: BackshopProductGroupWithMembers[],
  choices: BackshopMarkenAuswahlChoiceRow[],
  backshopBlockSourceRules: BackshopMarkenAuswahlBlockRuleRow[],
) {
  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])

  const choiceByGroup = useMemo(() => {
    const m = new Map<string, BackshopSource[]>()
    for (const c of choices) m.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
    return m
  }, [choices])

  const memberSourcesFor = useCallback(
    (groupId: string) => {
      const g = groups.find((x) => x.id === groupId)
      if (!g) return [] as BackshopSource[]
      return [...new Set(g.members.map((m) => m.source as BackshopSource))].sort((a, b) => {
        const rank = (s: BackshopSource) =>
          s === 'manual' ? 99 : BACKSHOP_SOURCES.indexOf(s as (typeof BACKSHOP_SOURCES)[number])
        return rank(a) - rank(b)
      })
    },
    [groups],
  )

  const choiceBaselineForGroup = useCallback(
    (groupId: string) => {
      const g = groups.find((x) => x.id === groupId)
      if (!g) return [] as BackshopSource[]
      const mem = memberSourcesFor(groupId)
      const memberSet = new Set(mem)
      const dbChosen = choiceByGroup.get(groupId) ?? []
      return (
        resolveEffectiveChosenSourcesForGroupFilter(
          memberSet,
          dbChosen,
          g.block_id ?? undefined,
          blockPreferredSourceByBlockId,
        ) ?? dbChosen
      )
    },
    [groups, memberSourcesFor, choiceByGroup, blockPreferredSourceByBlockId],
  )

  const withMeta = useMemo(() => {
    return groups.map((g) => {
      const mem = memberSourcesFor(g.id)
      const memberSet = new Set(mem)
      const dbChosen = choiceByGroup.get(g.id) ?? []
      const inferred = resolveEffectiveChosenSourcesForGroupFilter(
        memberSet,
        dbChosen,
        g.block_id ?? undefined,
        blockPreferredSourceByBlockId,
      )
      const chosenForUi = inferred ?? dbChosen
      return { g, mem, chosen: chosenForUi, st: getGroupListStatus(mem, chosenForUi) }
    })
  }, [groups, memberSourcesFor, choiceByGroup, blockPreferredSourceByBlockId])

  return {
    blockPreferredSourceByBlockId,
    choiceByGroup,
    memberSourcesFor,
    choiceBaselineForGroup,
    withMeta,
  }
}
