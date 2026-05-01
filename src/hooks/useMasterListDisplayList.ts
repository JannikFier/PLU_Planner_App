import { useMemo } from 'react'
import type {
  Bezeichnungsregel,
  Block,
  CustomProduct,
  LayoutSettings,
  MasterPLUItem,
  RenamedItem,
  StoreObstBlockOrder,
  Version,
} from '@/types/database'
import { buildDisplayList } from '@/lib/layout-engine'
import type { DisplayItem } from '@/types/plu'
import type { PLUStats } from '@/lib/plu-helpers'
import type { OfferDisplayInfo } from '@/lib/offer-display'

export interface UseMasterListDisplayListParams {
  rawItems: MasterPLUItem[]
  carryoverMasterForActive: MasterPLUItem[]
  customProducts: CustomProduct[]
  effectiveHiddenPLUs: Set<string>
  offerDisplayByPlu: Map<string, OfferDisplayInfo>
  renamedItems: RenamedItem[]
  regeln: Bezeichnungsregel[]
  blocks: Block[]
  layoutSettings: LayoutSettings | undefined
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  displayMode: 'MIXED' | 'SEPARATED'
  listVersion: Version | null | undefined
  calendarKw: number
  calendarJahr: number
  nameBlockOverrides: Map<string, string>
  storeObstBlockOrder: StoreObstBlockOrder[]
  obstPrevManualPluSetForLayout: Set<string> | null | undefined
}

/**
 * Layout-Engine für die aktive Obst-Masterliste (Anzeige + Footer-Stats).
 */
export function useMasterListDisplayList(params: UseMasterListDisplayListParams): {
  displayItems: DisplayItem[]
  stats: PLUStats
} {
  const {
    rawItems,
    carryoverMasterForActive,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    listVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  } = params

  return useMemo(() => {
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({
        keyword: r.keyword,
        position: r.position,
        case_sensitive: r.case_sensitive,
      }))

    const version = listVersion
    const now = new Date()
    const result = buildDisplayList({
      masterItems: rawItems,
      carryoverMasterItems: carryoverMasterForActive,
      customProducts,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      renamedItems: renamedItems.map((r) => ({
        plu: r.plu,
        display_name: r.display_name,
        is_manually_renamed: r.is_manually_renamed,
      })),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: version?.kw_nummer ?? 0,
      versionJahr: version?.jahr ?? now.getFullYear(),
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
      obstPrevManualPluSet: obstPrevManualPluSetForLayout,
    })

    const pluStats: PLUStats = {
      total: result.stats.total,
      unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
      newCount: result.stats.newCount,
      changedCount: result.stats.changedCount,
      hidden: result.stats.hidden,
      customCount: result.stats.customCount,
    }

    return { displayItems: result.items, stats: pluStats }
  }, [
    rawItems,
    carryoverMasterForActive,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    listVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  ])
}
