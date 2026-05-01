import { useMemo } from 'react'
import type {
  BackshopBezeichnungsregel,
  BackshopCustomProduct,
  BackshopMasterPLUItem,
  BackshopRenamedItem,
  BackshopSource,
  BackshopVersion,
  Block,
  StoreBackshopBlockOrder,
} from '@/types/database'
import type { DisplayItem } from '@/types/plu'
import type { PLUStats } from '@/lib/plu-helpers'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import { buildBackshopDisplayList, toBackshopCustomProductInput } from '@/lib/layout-engine'
import { formatBackshopWerbungContextPlainLabel } from '@/lib/date-kw-utils'

const EMPTY_STATS = { total: 0, newCount: 0, changedCount: 0, hidden: 0, customCount: 0 }

export interface UseBackshopMasterListPdfExportListParams {
  showPdfDialog: boolean
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
  listVersion: BackshopVersion | null | undefined
  effectiveWerbungEndKw: number
  effectiveWerbungEndJahr: number
  showWeekMonSat: boolean
}

/**
 * PDF-Dialog: gefilterte DisplayItems (ohne Multi-Source-Platzhalter), Stats und KW-Label wie Toolbar.
 */
export function useBackshopMasterListPdfExportList(params: UseBackshopMasterListPdfExportListParams): {
  pdfDisplayItems: DisplayItem[]
  pdfStats: PLUStats
  pdfContextKwLabel: string
} {
  const {
    showPdfDialog,
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
    listVersion,
    effectiveWerbungEndKw,
    effectiveWerbungEndJahr,
    showWeekMonSat,
  } = params

  const pdfDisplayResult = useMemo(() => {
    if (!showPdfDialog) return { items: [] as DisplayItem[], stats: EMPTY_STATS }
    const r = buildBackshopDisplayList({
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
    return { ...r, items: r.items.filter((i) => !i.backshop_is_multi_source_placeholder) }
  }, [
    showPdfDialog,
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

  const pdfStats: PLUStats = useMemo(
    () => ({
      total: pdfDisplayResult.stats.total,
      unchanged:
        pdfDisplayResult.stats.total - pdfDisplayResult.stats.newCount - pdfDisplayResult.stats.changedCount,
      newCount: pdfDisplayResult.stats.newCount,
      changedCount: pdfDisplayResult.stats.changedCount,
      hidden: pdfDisplayResult.stats.hidden,
      customCount: pdfDisplayResult.stats.customCount,
    }),
    [pdfDisplayResult.stats],
  )

  const pdfContextKwLabel = useMemo(() => {
    if (!listVersion) return 'Backshop'
    return formatBackshopWerbungContextPlainLabel(
      listVersion.kw_nummer,
      listVersion.jahr,
      effectiveWerbungEndKw,
      effectiveWerbungEndJahr,
      showWeekMonSat,
    )
  }, [listVersion, effectiveWerbungEndKw, effectiveWerbungEndJahr, showWeekMonSat])

  return {
    pdfDisplayItems: pdfDisplayResult.items,
    pdfStats,
    pdfContextKwLabel,
  }
}
