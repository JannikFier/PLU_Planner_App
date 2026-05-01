import { useMemo } from 'react'
import type {
  BackshopBezeichnungsregel,
  BackshopCustomProduct,
  BackshopMasterPLUItem,
  BackshopRenamedItem,
  BackshopSource,
  Block,
  StoreBackshopBlockOrder,
} from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { PLUStats } from '@/lib/plu-helpers'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import { buildBackshopDisplayList, toBackshopCustomProductInput } from '@/lib/layout-engine'

export interface UseBackshopMasterListDisplayListParams {
  masterScopeItems: BackshopMasterPLUItem[]
  carryoverMasterScoped: BackshopMasterPLUItem[]
  effectiveHiddenPLUs: Set<string>
  offerDisplayByPlu: Map<string, OfferDisplayInfo>
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  blocks: Block[]
  customProducts: BackshopCustomProduct[]
  bezeichnungsregeln: BackshopBezeichnungsregel[]
  renamedItems: BackshopRenamedItem[]
  markYellowKwCount: number
  calendarKw: number
  calendarJahr: number
  nameBlockOverrides: Map<string, string>
  storeBackshopBlockOrder: StoreBackshopBlockOrder[]
  productGroupByPluSource: Map<string, string>
  memberSourcesByGroup: Map<string, Set<BackshopSource>>
  layoutChosenSourcesForList: Map<string, BackshopSource[]>
  productGroupNames: Map<string, string>
  layoutBlockPreferredForList: Map<string, BackshopSource>
  layoutGroupBlockIdByGroupIdForList: Map<string, string | null>
  backshopPrevManualPluSetForLayout: Set<string> | null | undefined
  lineForceShowKeysForList: Set<string>
  lineForceHideKeysForList: Set<string>
}

/**
 * Layout-Engine für die aktive Backshop-Masterliste (Anzeige + Footer-Stats).
 */
export function useBackshopMasterListDisplayList(
  params: UseBackshopMasterListDisplayListParams,
): { displayItems: DisplayItem[]; stats: PLUStats } {
  const {
    masterScopeItems,
    carryoverMasterScoped,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    bezeichnungsregeln,
    renamedItems,
    markYellowKwCount,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  } = params

  return useMemo(() => {
    const result = buildBackshopDisplayList({
      masterItems: masterScopeItems,
      carryoverMasterItems: carryoverMasterScoped,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks,
      customProducts: customProducts.map(toBackshopCustomProductInput),
      bezeichnungsregeln,
      renamedItems,
      markYellowKwCount,
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup: layoutChosenSourcesForList,
      productGroupNames,
      blockPreferredSourceByBlockId: layoutBlockPreferredForList,
      groupBlockIdByGroupId: layoutGroupBlockIdByGroupIdForList,
      backshopPrevManualPluSet: backshopPrevManualPluSetForLayout,
      lineForceShowKeys: lineForceShowKeysForList,
      lineForceHideKeys: lineForceHideKeysForList,
    })
    const pluStats: PLUStats = {
      total: result.stats.total,
      unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
      newCount: result.stats.newCount,
      changedCount: result.stats.changedCount,
      hidden: result.stats.hidden,
      customCount: result.stats.customCount,
    }
    return {
      displayItems: result.items,
      stats: pluStats,
    }
  }, [
    masterScopeItems,
    carryoverMasterScoped,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    bezeichnungsregeln,
    renamedItems,
    markYellowKwCount,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    backshopPrevManualPluSetForLayout,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  ])
}
