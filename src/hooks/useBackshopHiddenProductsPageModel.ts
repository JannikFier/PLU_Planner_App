/**
 * Ableitungslogik für BackshopHiddenProductsPage – Queries, Listen, Find-in-Page, Navigation.
 * UI-State (Segment, Tab, Dialoge) bleibt in der Page und wird hier eingespeist.
 */

import { useMemo, useCallback, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import type { HiddenProductDisplayRow } from '@/components/plu/HiddenProductsResponsiveList'
import type { BackshopRuleFilteredRow } from '@/components/plu/BackshopRuleFilteredResponsiveList'
import type { BackshopHiddenBlockTile } from '@/components/backshop/BackshopHiddenBlockOverview'
import { useBackshopHiddenItems, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import {
  useBackshopOfferCampaignWithPreview,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useAuth } from '@/hooks/useAuth'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { getDisplayPlu, itemMatchesSearch } from '@/lib/plu-helpers'
import { useListFindInPageSection } from '@/hooks/useListFindInPageSection'
import { buildNameBlockOverrideMap, effectiveBlockIdForStoreOverride } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildBackshopDisplayList, type BackshopDisplayListInput } from '@/lib/layout-engine'
import { buildBackshopDisplayListInputFromSnapshot } from '@/lib/backshop-display-list-input-build'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { getBackshopRuleFilteredMasterRows } from '@/lib/backshop-visibility-diff'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { BACKSHOP_SOURCES, BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import { matchBackshopHiddenSourceSegment, type BackshopHiddenSourceSegment } from '@/lib/backshop-hidden-source-segment'
import {
  useBackshopLineVisibilityOverrides,
  useUpsertBackshopLineVisibilityOverride,
} from '@/hooks/useBackshopLineVisibilityOverrides'
import {
  ALL_BLOCKS_PARAM,
  BACKSHOP_HIDDEN_FIND_SCOPE_ID,
  orderBlockKeys,
  UNGEORDNET_BLOCK,
} from '@/lib/backshop-hidden-products-page-utils'
import type { BackshopCustomProduct, BackshopSource, BackshopMasterPLUItem } from '@/types/database'
import type { Profile, BackshopBlock, Block } from '@/types/database'

export type BackshopHiddenFindItem =
  | { kind: 'manual'; row: HiddenProductDisplayRow }
  | { kind: 'rule'; row: BackshopRuleFilteredRow }

interface HiddenProductInfo {
  plu: string
  name: string
  source: 'master' | 'custom' | 'unknown'
  customProduct: BackshopCustomProduct | null
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
  thumbUrl: string | null
  backshopSources: BackshopSource[]
  blockId: string
  blockLabel: string
}

export interface UseBackshopHiddenProductsPageModelParams {
  sourceSegment: BackshopHiddenSourceSegment
  activeTab: 'manual' | 'rule'
  setActiveTab: Dispatch<SetStateAction<'manual' | 'rule'>>
  onEditCustomProduct: (product: BackshopCustomProduct) => void
}

export function useBackshopHiddenProductsPageModel({
  sourceSegment,
  activeTab,
  setActiveTab,
  onEditCustomProduct,
}: UseBackshopHiddenProductsPageModelParams) {
  const location = useLocation()
  const { pathname } = location
  const navigate = useNavigate()
  const { user } = useAuth()
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)
  const { currentStoreId } = useCurrentStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const manualBlockParam = searchParams.get('manualBlock')
  const ruleBlockParam = searchParams.get('ruleBlock')

  const { lineForceShowKeys, lineForceHideKeys } = useBackshopLineVisibilityOverrides()
  const upsertLineOverride = useUpsertBackshopLineVisibilityOverride()

  const { data: hiddenItems = [], isLoading: hiddenLoading } = useBackshopHiddenItems()
  const { data: activeVersion } = useActiveBackshopVersion()
  const versionId = activeVersion?.id
  const { data: masterItems = [], isLoading: masterItemsLoading } = useBackshopPLUData(versionId)
  const { data: backshopCarryoverRows = [] } = useStoreListCarryoverRows('backshop', versionId)

  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const offerPreview = useMemo(() => ({ mode: 'auto' } as const), [])
  const { data: backshopCampaign } = useBackshopOfferCampaignWithPreview(offerPreview)
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const unhideProduct = useBackshopUnhideProduct()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const { data: productGroups = [] } = useBackshopProductGroups()
  const { data: sourceChoices = [] } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)

  const { data: backshopPrevManualPluSetData, isSuccess: backshopPrevManualLoaded } =
    useBackshopPrevManualSupplementPluSet(versionId)
  const backshopPrevManualPluSetForLayout = backshopPrevManualLoaded
    ? (backshopPrevManualPluSetData ?? null)
    : undefined

  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const productGroupsForStore = useMemo(
    () => scopeProductGroupsByEffectiveBlock(productGroups, nameBlockOverrides),
    [productGroups, nameBlockOverrides],
  )

  const rolePrefix =
    pathname.startsWith('/super-admin') ? '/super-admin'
    : pathname.startsWith('/admin') ? '/admin'
    : pathname.startsWith('/viewer') ? '/viewer'
    : '/user'

  const openMarkenAuswahlForGroup = useCallback(
    (groupId: string) => {
      const backTo = location.pathname + location.search
      navigate(
        `${rolePrefix}/marken-auswahl?backTo=${encodeURIComponent(backTo)}&focusGroup=${encodeURIComponent(groupId)}`,
      )
    },
    [rolePrefix, location.pathname, location.search, navigate],
  )

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const offerKw = activeVersion ? activeVersion.kw_nummer : calendarKw
  const offerJahr = activeVersion ? activeVersion.jahr : calendarJahr

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        offerKw,
        offerJahr,
        backshopCampaign ?? null,
        backshopStoreDisabled,
        offerItems,
        backshopLocalOverrides,
      ),
    [offerKw, offerJahr, backshopCampaign, backshopStoreDisabled, offerItems, backshopLocalOverrides],
  )

  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])

  const { productGroupByPluSource, chosenSourcesByGroup, productGroupNames, memberSourcesByGroup } = useMemo(() => {
    const byPluSource = new Map<string, string>()
    const names = new Map<string, string>()
    for (const g of productGroupsForStore) {
      names.set(g.id, g.display_name)
      for (const m of g.members) {
        byPluSource.set(`${m.plu}|${m.source}`, g.id)
      }
    }
    const chosen = new Map<string, BackshopSource[]>()
    for (const c of sourceChoices) {
      chosen.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
    }
    const memberSourcesByG = new Map<string, Set<BackshopSource>>()
    for (const g of productGroupsForStore) {
      const s = new Set<BackshopSource>()
      for (const mem of g.members) s.add(mem.source as BackshopSource)
      memberSourcesByG.set(g.id, s)
    }
    return {
      productGroupByPluSource: byPluSource,
      chosenSourcesByGroup: chosen,
      productGroupNames: names,
      memberSourcesByGroup: memberSourcesByG,
    }
  }, [productGroupsForStore, sourceChoices])

  const groupBlockIdByGroupId = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const g of productGroupsForStore) m.set(g.id, g.block_id ?? null)
    return m
  }, [productGroupsForStore])

  const rawHiddenPluSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign, backshopStoreDisabled),
    [rawHiddenPluSet, backshopCampaign, backshopStoreDisabled],
  )

  const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
  const sortMode = (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK'

  const displayListInput: BackshopDisplayListInput | null = useMemo(() => {
    if (!versionId || !activeVersion) return null
    const carryoverMaster = backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, activeVersion.id))
    return buildBackshopDisplayListInputFromSnapshot({
      versionId,
      masterItems,
      carryoverMasterItems: carryoverMaster,
      effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks: blocks as Block[],
      customProducts,
      bezeichnungsregeln: regeln,
      renamedItems,
      markYellowKwCount: markYellow,
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup,
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
      backshopPrevManualPluSet: backshopPrevManualPluSetForLayout,
      lineForceShowKeys,
      lineForceHideKeys,
    })
  }, [
    versionId,
    activeVersion,
    backshopCarryoverRows,
    masterItems,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    regeln,
    renamedItems,
    markYellow,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    chosenSourcesByGroup,
    productGroupNames,
    blockPreferredSourceByBlockId,
    groupBlockIdByGroupId,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeys,
    lineForceHideKeys,
  ])

  const ruleFilteredRows: BackshopMasterPLUItem[] = useMemo(() => {
    if (!displayListInput) return []
    return getBackshopRuleFilteredMasterRows(displayListInput, rawHiddenPluSet).ruleFilteredRows
  }, [displayListInput, rawHiddenPluSet])

  const blockNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of blocks as BackshopBlock[]) {
      m.set(b.id, b.name)
    }
    return m
  }, [blocks])

  const renamedByPlu = useMemo(() => new Map(renamedItems.map((r) => [r.plu, r])), [renamedItems])
  const centralCampaignPluSet = useMemo(
    () => new Set((backshopCampaign?.lines ?? []).map((l) => l.plu)),
    [backshopCampaign],
  )

  const hiddenByIds = useMemo(() => [...new Set(hiddenItems.map((h) => h.hidden_by))], [hiddenItems])
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-hidden-by', hiddenByIds],
    queryFn: async () => {
      if (hiddenByIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, personalnummer')
        .in('id', hiddenByIds)
      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'display_name' | 'personalnummer'>[]
    },
    enabled: hiddenByIds.length > 0,
  })

  const profileMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) {
      map.set(p.id, p.display_name ?? p.personalnummer)
    }
    return map
  }, [profiles])

  const hiddenProductInfos: HiddenProductInfo[] = useMemo(() => {
    return hiddenItems.map((hidden) => {
      const masterRows = masterItems.filter((m) => m.plu === hidden.plu)
      const backshopSources = [...new Set(masterRows.map((m) => (m.source ?? 'edeka') as BackshopSource))]
      const masterItem = masterRows[0]
      if (masterItem) {
        const r = renamedByPlu.get(hidden.plu)
        const thumbUrl = (r?.image_url ?? masterItem.image_url) || null
        const name = (r?.display_name ?? masterItem.display_name) ?? masterItem.system_name
        const effBlock = effectiveBlockIdForStoreOverride(
          masterItem.system_name,
          masterItem.block_id,
          nameBlockOverrides,
        )
        const blockId = effBlock ?? UNGEORDNET_BLOCK
        return {
          plu: hidden.plu,
          name,
          source: 'master' as const,
          customProduct: null,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
          thumbUrl,
          backshopSources: backshopSources.length > 0 ? backshopSources : (['edeka' as const] as BackshopSource[]),
          blockId,
          blockLabel: effBlock ? (blockNameById.get(effBlock) ?? '—') : '—',
        }
      }
      const customItem = customProducts.find((c) => c.plu === hidden.plu)
      if (customItem) {
        return {
          plu: hidden.plu,
          name: customItem.name,
          source: 'custom' as const,
          customProduct: customItem,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
          thumbUrl: customItem.image_url || null,
          backshopSources: [],
          blockId: customItem.block_id ?? UNGEORDNET_BLOCK,
          blockLabel: (customItem.block_id && blockNameById.get(customItem.block_id)) || '—',
        }
      }
      return {
        plu: hidden.plu,
        name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
        source: 'unknown' as const,
        customProduct: null,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
        thumbUrl: null,
        backshopSources: [],
        blockId: UNGEORDNET_BLOCK,
        blockLabel: '—',
      }
    })
  }, [hiddenItems, masterItems, customProducts, profileMap, renamedByPlu, blockNameById, nameBlockOverrides])

  const canonicalListOrderPlu = useMemo(() => {
    if (!displayListInput) return [] as string[]
    const { items } = buildBackshopDisplayList(displayListInput)
    return items.map((i) => i.plu)
  }, [displayListInput])

  const sortedHiddenProductInfos = useMemo(
    () => orderByPluDisplayOrder(hiddenProductInfos, (x) => x.plu, canonicalListOrderPlu),
    [hiddenProductInfos, canonicalListOrderPlu],
  )

  const hiddenListRows: HiddenProductDisplayRow[] = useMemo(
    () =>
      sortedHiddenProductInfos.map((info) => ({
        plu: info.plu,
        name: info.name,
        hiddenByName: info.hiddenByName,
        hidden_by: info.hidden_by,
        showVonMirBadge: Boolean(user && info.hidden_by === user.id),
        source: info.source,
        showCentralCampaignBadge: centralCampaignPluSet.has(info.plu),
        typLabel: null,
        thumbUrl: info.thumbUrl,
        backshopSources: info.backshopSources.length > 0 ? info.backshopSources : undefined,
        blockLabel: info.blockLabel,
        hiddenAt: info.hiddenAt,
        onEdit: info.customProduct ? () => onEditCustomProduct(info.customProduct!) : undefined,
      })),
    [sortedHiddenProductInfos, user, centralCampaignPluSet, onEditCustomProduct],
  )

  const ruleListRows: BackshopRuleFilteredRow[] = useMemo(() => {
    return ruleFilteredRows.map((m) => {
      const r = renamedByPlu.get(m.plu)
      const name = (r?.display_name ?? m.display_name) ?? m.system_name
      const src = (m.source ?? 'edeka') as BackshopSource
      const thumb = (r?.image_url ?? m.image_url) || null
      const effBlock = effectiveBlockIdForStoreOverride(m.system_name, m.block_id, nameBlockOverrides)
      const bId = effBlock ?? UNGEORDNET_BLOCK
      const groupId = productGroupByPluSource.get(`${m.plu}|${src}`) ?? null
      const grp = groupId ? productGroupsForStore.find((g) => g.id === groupId) : undefined
      const memberCount = grp?.members?.length ?? 0
      return {
        id: `${m.plu}|${src}`,
        plu: m.plu,
        name,
        backshopSource: src,
        blockLabel: bId === UNGEORDNET_BLOCK ? '—' : (blockNameById.get(bId) ?? '—'),
        blockId: bId,
        thumbUrl: thumb,
        productGroupId: groupId,
        productGroupMemberCount: memberCount,
        productGroupDisplayName: groupId ? (productGroupNames.get(groupId) ?? null) : null,
      }
    })
  }, [
    ruleFilteredRows,
    renamedByPlu,
    blockNameById,
    nameBlockOverrides,
    productGroupByPluSource,
    productGroupsForStore,
    productGroupNames,
  ])

  const filterManual = useCallback(
    (r: HiddenProductDisplayRow) =>
      matchBackshopHiddenSourceSegment(sourceSegment, {
        listKind: 'manual',
        rowSource: r.source,
        backshopSources: r.backshopSources,
      }),
    [sourceSegment],
  )
  const filterRule = useCallback(
    (r: BackshopRuleFilteredRow) =>
      matchBackshopHiddenSourceSegment(sourceSegment, {
        listKind: 'rule',
        rowSource: 'master',
        ruleLineSource: r.backshopSource,
      }),
    [sourceSegment],
  )

  const hiddenListRowsFiltered = useMemo(() => hiddenListRows.filter(filterManual), [hiddenListRows, filterManual])
  const ruleListRowsFiltered = useMemo(() => ruleListRows.filter(filterRule), [ruleListRows, filterRule])

  const hiddenInfoByPlu = useMemo(
    () => new Map(hiddenProductInfos.map((h) => [h.plu, h])),
    [hiddenProductInfos],
  )

  const hiddenOrderedFlat: HiddenProductDisplayRow[] = useMemo(() => {
    const withBlock = hiddenListRowsFiltered.map((row) => {
      const h = hiddenInfoByPlu.get(row.plu)
      return { row, blockId: h?.blockId ?? UNGEORDNET_BLOCK }
    })
    const keySet = new Set(withBlock.map((x) => x.blockId))
    const keys = orderBlockKeys([...keySet], storeBackshopBlockOrder)
    const out: HiddenProductDisplayRow[] = []
    for (const k of keys) {
      for (const { row, blockId } of withBlock) {
        if (blockId === k) out.push(row)
      }
    }
    return out
  }, [hiddenListRowsFiltered, hiddenInfoByPlu, storeBackshopBlockOrder])

  const manualBlockTiles = useMemo((): BackshopHiddenBlockTile[] => {
    const m = new Map<string, HiddenProductDisplayRow[]>()
    for (const row of hiddenListRowsFiltered) {
      const bid = hiddenInfoByPlu.get(row.plu)?.blockId ?? UNGEORDNET_BLOCK
      m.set(bid, [...(m.get(bid) ?? []), row])
    }
    const keys = orderBlockKeys([...m.keys()], storeBackshopBlockOrder)
    return keys
      .map((blockId) => {
        const rows = m.get(blockId) ?? []
        if (rows.length === 0) return null
        const label =
          blockId === UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : (blockNameById.get(blockId) ?? '—')
        return {
          blockId,
          label,
          count: rows.length,
          previewThumbUrl: rows[0]?.thumbUrl ?? null,
        }
      })
      .filter((x): x is BackshopHiddenBlockTile => x != null)
  }, [hiddenListRowsFiltered, hiddenInfoByPlu, storeBackshopBlockOrder, blockNameById])

  const ruleBlockTiles = useMemo((): BackshopHiddenBlockTile[] => {
    const m = new Map<string, BackshopRuleFilteredRow[]>()
    for (const row of ruleListRowsFiltered) {
      const bid = row.blockId
      m.set(bid, [...(m.get(bid) ?? []), row])
    }
    const keys = orderBlockKeys([...m.keys()], storeBackshopBlockOrder)
    return keys
      .map((blockId) => {
        const rows = m.get(blockId) ?? []
        if (rows.length === 0) return null
        const label =
          blockId === UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : (blockNameById.get(blockId) ?? '—')
        return {
          blockId,
          label,
          count: rows.length,
          previewThumbUrl: rows[0]?.thumbUrl ?? null,
        }
      })
      .filter((x): x is BackshopHiddenBlockTile => x != null)
  }, [ruleListRowsFiltered, storeBackshopBlockOrder, blockNameById])

  const manualDetailRows = useMemo(() => {
    if (!manualBlockParam) return [] as HiddenProductDisplayRow[]
    if (manualBlockParam === ALL_BLOCKS_PARAM) return hiddenOrderedFlat
    return hiddenOrderedFlat.filter(
      (row) => (hiddenInfoByPlu.get(row.plu)?.blockId ?? UNGEORDNET_BLOCK) === manualBlockParam,
    )
  }, [manualBlockParam, hiddenOrderedFlat, hiddenInfoByPlu])

  const ruleRowsOrderedFlat = useMemo(() => {
    const m = new Map<string, BackshopRuleFilteredRow[]>()
    for (const row of ruleListRowsFiltered) {
      m.set(row.blockId, [...(m.get(row.blockId) ?? []), row])
    }
    const keys = orderBlockKeys([...m.keys()], storeBackshopBlockOrder)
    const out: BackshopRuleFilteredRow[] = []
    for (const k of keys) {
      for (const r of m.get(k) ?? []) out.push(r)
    }
    return out
  }, [ruleListRowsFiltered, storeBackshopBlockOrder])

  const ruleDetailRows = useMemo(() => {
    if (!ruleBlockParam) return [] as BackshopRuleFilteredRow[]
    if (ruleBlockParam === ALL_BLOCKS_PARAM) return ruleRowsOrderedFlat
    return ruleListRowsFiltered.filter((row) => row.blockId === ruleBlockParam)
  }, [ruleBlockParam, ruleListRowsFiltered, ruleRowsOrderedFlat])

  useEffect(() => {
    if (manualBlockParam) setActiveTab('manual')
    else if (ruleBlockParam) setActiveTab('rule')
  }, [manualBlockParam, ruleBlockParam, setActiveTab])

  const manualBrandChipCounts = useMemo(() => {
    const countFor = (seg: BackshopHiddenSourceSegment) =>
      hiddenListRows.filter((r) =>
        matchBackshopHiddenSourceSegment(seg, {
          listKind: 'manual',
          rowSource: r.source,
          backshopSources: r.backshopSources,
        }),
      ).length
    return {
      all: hiddenListRows.length,
      edeka: countFor('edeka'),
      harry: countFor('harry'),
      aryzta: countFor('aryzta'),
      eigen: countFor('eigen'),
    }
  }, [hiddenListRows])

  const ruleBrandChipCounts = useMemo(() => {
    const countFor = (seg: BackshopHiddenSourceSegment) =>
      ruleListRows.filter((r) =>
        matchBackshopHiddenSourceSegment(seg, {
          listKind: 'rule',
          rowSource: 'master',
          ruleLineSource: r.backshopSource,
        }),
      ).length
    return {
      all: ruleListRows.length,
      edeka: countFor('edeka'),
      harry: countFor('harry'),
      aryzta: countFor('aryzta'),
      eigen: countFor('eigen'),
    }
  }, [ruleListRows])

  const brandChipCounts = activeTab === 'manual' ? manualBrandChipCounts : ruleBrandChipCounts

  const switchMainTab = useCallback(
    (t: 'manual' | 'rule') => {
      setActiveTab(t)
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev)
        n.delete('manualBlock')
        n.delete('ruleBlock')
        return n
      })
    },
    [setActiveTab, setSearchParams],
  )

  const hasMultiSourceManual = useMemo(
    () => hiddenListRows.some((r) => (r.backshopSources?.length ?? 0) > 1),
    [hiddenListRows],
  )

  const setBlockNav = useCallback(
    (kind: 'manual' | 'rule', blockId: string) => {
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev)
        if (kind === 'manual') {
          n.set('manualBlock', blockId)
          n.delete('ruleBlock')
        } else {
          n.set('ruleBlock', blockId)
          n.delete('manualBlock')
        }
        return n
      })
    },
    [setSearchParams],
  )

  const clearBlockNav = useCallback(() => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev)
      n.delete('manualBlock')
      n.delete('ruleBlock')
      return n
    })
  }, [setSearchParams])

  const matchHiddenRowForFind = useCallback((row: HiddenProductDisplayRow, q: string) => {
    const s = q.trim().toLowerCase()
    if (!s) return false
    return (
      itemMatchesSearch({ plu: row.plu, display_name: row.name, system_name: row.name }, q) ||
      row.hiddenByName.toLowerCase().includes(s)
    )
  }, [])

  const matchRuleRowForFind = useCallback((row: BackshopRuleFilteredRow, q: string) => {
    const s = q.trim().toLowerCase()
    if (!s) return false
    return (
      itemMatchesSearch({ plu: row.plu, display_name: row.name, system_name: row.name }, q) ||
      row.blockLabel.toLowerCase().includes(s)
    )
  }, [])

  const backshopFindItems = useMemo((): BackshopHiddenFindItem[] => {
    if (activeTab === 'manual') {
      const rows = !manualBlockParam ? hiddenOrderedFlat : manualDetailRows
      return rows.map((row) => ({ kind: 'manual' as const, row }))
    }
    const rows = !ruleBlockParam ? ruleRowsOrderedFlat : ruleDetailRows
    return rows.map((row) => ({ kind: 'rule' as const, row }))
  }, [
    activeTab,
    manualBlockParam,
    ruleBlockParam,
    hiddenOrderedFlat,
    manualDetailRows,
    ruleRowsOrderedFlat,
    ruleDetailRows,
  ])

  const matchBackshopFindItem = useCallback(
    (item: BackshopHiddenFindItem, q: string) =>
      item.kind === 'manual' ? matchHiddenRowForFind(item.row, q) : matchRuleRowForFind(item.row, q),
    [matchHiddenRowForFind, matchRuleRowForFind],
  )

  const backshopListFind = useListFindInPageSection({
    items: backshopFindItems,
    scopeId: BACKSHOP_HIDDEN_FIND_SCOPE_ID,
    isMatch: matchBackshopFindItem,
  })

  const hiddenFindInPageBinding = useMemo((): ListFindInPageBinding | undefined => {
    if (backshopFindItems.length === 0) return undefined
    return {
      scopeId: BACKSHOP_HIDDEN_FIND_SCOPE_ID,
      activeRowIndex: backshopListFind.activeRowIndex,
      matchIndices: backshopListFind.matchIndices,
    }
  }, [backshopFindItems.length, backshopListFind.activeRowIndex, backshopListFind.matchIndices])

  const activeTabHasFindableList = useMemo(
    () => (activeTab === 'manual' ? hiddenListRowsFiltered.length > 0 : ruleListRowsFiltered.length > 0),
    [activeTab, hiddenListRowsFiltered.length, ruleListRowsFiltered.length],
  )

  const onTileNavigate = useCallback(
    (kind: 'manual' | 'rule', blockId: string) => {
      if (kind === 'manual' && manualBlockParam === blockId) clearBlockNav()
      else if (kind === 'rule' && ruleBlockParam === blockId) clearBlockNav()
      else setBlockNav(kind, blockId)
    },
    [manualBlockParam, ruleBlockParam, clearBlockNav, setBlockNav],
  )

  const onRuleForceShow = useCallback(
    (plu: string, source: BackshopSource) => {
      upsertLineOverride.mutate({ plu, source, mode: 'force_show' })
    },
    [upsertLineOverride],
  )

  const prevManualReady = !versionId || backshopPrevManualLoaded
  const isLoading = hiddenLoading || masterItemsLoading || !prevManualReady

  return {
    location,
    pathname,
    navigate,
    rolePrefix,
    canManageHidden,
    blocks,
    hiddenItems,
    hiddenLoading,
    masterItemsLoading,
    unhideProduct,
    upsertLineOverride,
    blockNameById,
    manualBlockParam,
    ruleBlockParam,
    hiddenListRows,
    ruleListRows,
    hiddenListRowsFiltered,
    ruleListRowsFiltered,
    manualBlockTiles,
    ruleBlockTiles,
    manualDetailRows,
    ruleDetailRows,
    brandChipCounts,
    BACKSHOP_SOURCES,
    BACKSHOP_SOURCE_META,
    switchMainTab,
    hasMultiSourceManual,
    setBlockNav,
    clearBlockNav,
    backshopListFind,
    backshopFindItems,
    activeTabHasFindableList,
    hiddenFindInPageBinding,
    onTileNavigate,
    onRuleForceShow,
    openMarkenAuswahlForGroup,
    isLoading,
    ALL_BLOCKS_PARAM,
    UNGEORDNET_BLOCK,
    BACKSHOP_HIDDEN_FIND_SCOPE_ID,
  }
}
