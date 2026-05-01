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
import type { DisplayItem } from '@/types/plu'
import type { PLUStats } from '@/lib/plu-helpers'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import { buildDisplayList } from '@/lib/layout-engine'
import { formatKwLabelWithOptionalMonSatRange } from '@/lib/date-kw-utils'

const EMPTY_PDF_STATS: PLUStats = {
  total: 0,
  unchanged: 0,
  newCount: 0,
  changedCount: 0,
  hidden: 0,
  customCount: 0,
}

export interface UseMasterListPdfDisplayListParams {
  pdfRawItems: MasterPLUItem[]
  carryoverMasterForPdf: MasterPLUItem[]
  customProducts: CustomProduct[]
  effectiveHiddenPLUs: Set<string>
  offerDisplayByPlu: Map<string, OfferDisplayInfo>
  renamedItems: RenamedItem[]
  regeln: Bezeichnungsregel[]
  blocks: Block[]
  layoutSettings: LayoutSettings | undefined
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  displayMode: 'MIXED' | 'SEPARATED'
  pdfExportVersionId: string | undefined
  versions: Version[]
  isSnapshot: boolean
  listVersion: Version | null | undefined
  activeVersion: Version | null | undefined
  calendarKw: number
  calendarJahr: number
  nameBlockOverrides: Map<string, string>
  storeObstBlockOrder: StoreObstBlockOrder[]
  obstPrevManualPluSetForLayout: Set<string> | null | undefined
  showWeekMonSat: boolean
}

/**
 * Layout-Engine für den PDF-Export-Dialog (andere Master-Zeilen / KW-Kontext möglich).
 */
export function useMasterListPdfDisplayList(params: UseMasterListPdfDisplayListParams): {
  pdfDisplayItems: DisplayItem[]
  pdfStats: PLUStats
  pdfExportKwLabel: string
} {
  const {
    pdfRawItems,
    carryoverMasterForPdf,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    pdfExportVersionId,
    versions,
    isSnapshot,
    listVersion,
    activeVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
    showWeekMonSat,
  } = params

  const pdfVersion = useMemo(
    () =>
      (pdfExportVersionId ? versions.find((v) => v.id === pdfExportVersionId) : undefined)
      ?? (isSnapshot ? listVersion : activeVersion)
      ?? undefined,
    [pdfExportVersionId, versions, isSnapshot, listVersion, activeVersion],
  )

  const { pdfDisplayItems, pdfStats } = useMemo(() => {
    if (!pdfRawItems.length && !customProducts.length) {
      return { pdfDisplayItems: [] as DisplayItem[], pdfStats: EMPTY_PDF_STATS }
    }
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({ keyword: r.keyword, position: r.position, case_sensitive: r.case_sensitive }))
    const now = new Date()
    const result = buildDisplayList({
      masterItems: pdfRawItems,
      carryoverMasterItems: carryoverMasterForPdf,
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
      versionKwNummer: pdfVersion?.kw_nummer ?? 0,
      versionJahr: pdfVersion?.jahr ?? now.getFullYear(),
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
      obstPrevManualPluSet: obstPrevManualPluSetForLayout,
    })
    return {
      pdfDisplayItems: result.items,
      pdfStats: {
        total: result.stats.total,
        unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
        newCount: result.stats.newCount,
        changedCount: result.stats.changedCount,
        hidden: result.stats.hidden,
        customCount: result.stats.customCount,
      } as PLUStats,
    }
  }, [
    pdfRawItems,
    carryoverMasterForPdf,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    pdfVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  ])

  const pdfExportKwLabel = useMemo(() => {
    if (!pdfVersion) return ''
    return formatKwLabelWithOptionalMonSatRange(
      pdfVersion.kw_label,
      pdfVersion.kw_nummer,
      pdfVersion.jahr,
      showWeekMonSat,
    )
  }, [pdfVersion, showWeekMonSat])

  return { pdfDisplayItems, pdfStats, pdfExportKwLabel }
}
