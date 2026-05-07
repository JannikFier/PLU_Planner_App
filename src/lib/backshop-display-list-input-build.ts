/**
 * Zentrale Fabrik für `BackshopDisplayListInput` – gleiche Parameter wie Masterliste / Hidden-Page,
 * damit Pick-Hide und andere Aufrufer nicht auseinanderlaufen.
 */

import type { OfferDisplayInfo } from '@/lib/offer-display'
import {
  type BackshopDisplayListInput,
  toBackshopCustomProductInput,
} from '@/lib/layout-engine'
import type { StoreBlockOrderRow } from '@/lib/block-override-utils'
import type {
  BackshopBezeichnungsregel,
  BackshopCustomProduct,
  BackshopMasterPLUItem,
  BackshopRenamedItem,
  BackshopSource,
  Block,
} from '@/types/database'

export type BuildBackshopDisplayListInputParams = {
  versionId: string | undefined
  masterItems: BackshopMasterPLUItem[]
  carryoverMasterItems: BackshopMasterPLUItem[]
  effectiveHiddenPLUs: Set<string>
  offerDisplayByPlu: Map<string, OfferDisplayInfo>
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  blocks: Block[]
  customProducts: BackshopCustomProduct[]
  bezeichnungsregeln: BackshopBezeichnungsregel[]
  renamedItems: BackshopRenamedItem[]
  markYellowKwCount: number
  currentKwNummer: number
  currentJahr: number
  nameBlockOverrides: Map<string, string>
  storeBlockOrder: StoreBlockOrderRow[]
  productGroupByPluSource: Map<string, string>
  memberSourcesByGroup: Map<string, Set<BackshopSource>>
  chosenSourcesByGroup: Map<string, BackshopSource[]>
  productGroupNames: Map<string, string>
  blockPreferredSourceByBlockId: Map<string, BackshopSource>
  groupBlockIdByGroupId: Map<string, string | null>
  backshopPrevManualPluSet: Set<string> | null | undefined
  lineForceShowKeys: Set<string>
  lineForceHideKeys: Set<string>
}

/** `null`, solange keine aktive Backshop-Version (`versionId`) vorliegt. */
export function buildBackshopDisplayListInputFromSnapshot(
  p: BuildBackshopDisplayListInputParams,
): BackshopDisplayListInput | null {
  if (!p.versionId) return null
  return {
    masterItems: p.masterItems,
    carryoverMasterItems: p.carryoverMasterItems,
    hiddenPLUs: p.effectiveHiddenPLUs,
    offerDisplayByPlu: p.offerDisplayByPlu,
    sortMode: p.sortMode,
    blocks: p.blocks,
    customProducts: p.customProducts.map(toBackshopCustomProductInput),
    bezeichnungsregeln: p.bezeichnungsregeln,
    renamedItems: p.renamedItems,
    markYellowKwCount: p.markYellowKwCount,
    currentKwNummer: p.currentKwNummer,
    currentJahr: p.currentJahr,
    nameBlockOverrides: p.nameBlockOverrides,
    storeBlockOrder: p.storeBlockOrder,
    productGroupByPluSource: p.productGroupByPluSource,
    memberSourcesByGroup: p.memberSourcesByGroup,
    chosenSourcesByGroup: p.chosenSourcesByGroup,
    productGroupNames: p.productGroupNames,
    blockPreferredSourceByBlockId: p.blockPreferredSourceByBlockId,
    groupBlockIdByGroupId: p.groupBlockIdByGroupId,
    backshopPrevManualPluSet: p.backshopPrevManualPluSet,
    lineForceShowKeys: p.lineForceShowKeys,
    lineForceHideKeys: p.lineForceHideKeys,
  }
}
