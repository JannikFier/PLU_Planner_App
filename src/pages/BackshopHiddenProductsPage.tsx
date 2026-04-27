// Backshop: Ausgeblendete Produkte – manuell vs. regelbasiert nicht in der Hauptliste

import { useMemo, useState, useCallback, useEffect } from 'react'
import '@/styles/backshop-hidden-variant-a.css'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CircleHelp, EyeOff, Hand, ListFilter } from 'lucide-react'
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
import { ListFindInPageToolbar } from '@/components/plu/ListFindInPageToolbar'
import type { ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import { buildNameBlockOverrideMap, effectiveBlockIdForStoreOverride } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildBackshopDisplayList, type BackshopDisplayListInput } from '@/lib/layout-engine'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { useQuery } from '@tanstack/react-query'
import { HideBackshopProductsDialog } from '@/components/plu/HideBackshopProductsDialog'
import { EditBackshopCustomProductDialog } from '@/components/plu/EditBackshopCustomProductDialog'
import {
  HiddenProductsResponsiveList,
  type HiddenProductDisplayRow,
} from '@/components/plu/HiddenProductsResponsiveList'
import {
  BackshopRuleFilteredResponsiveList,
  type BackshopRuleFilteredRow,
} from '@/components/plu/BackshopRuleFilteredResponsiveList'
import type { BackshopHiddenBlockTile } from '@/components/backshop/BackshopHiddenBlockOverview'
import type { BackshopCustomProduct, BackshopSource, BackshopMasterPLUItem } from '@/types/database'
import type { Profile, BackshopBlock, Block } from '@/types/database'
import { getBackshopRuleFilteredMasterRows } from '@/lib/backshop-visibility-diff'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { BACKSHOP_SOURCE_META, BACKSHOP_SOURCES } from '@/lib/backshop-sources'
import { matchBackshopHiddenSourceSegment, type BackshopHiddenSourceSegment } from '@/lib/backshop-hidden-source-segment'
import { cn } from '@/lib/utils'
import {
  useBackshopLineVisibilityOverrides,
  useUpsertBackshopLineVisibilityOverride,
} from '@/hooks/useBackshopLineVisibilityOverrides'
import { BackshopHiddenBlockOverview } from '@/components/backshop/BackshopHiddenBlockOverview'
import { BackshopHiddenManualDesktopTable } from '@/components/backshop/hidden-variant-a/BackshopHiddenManualDesktopTable'
import { BackshopHiddenRuleDesktopTable } from '@/components/backshop/hidden-variant-a/BackshopHiddenRuleDesktopTable'
const UNGEORDNET_BLOCK = '__unbekannt__'
/** URL-Wert: alle Warengruppen in einer flachen Liste */
const ALL_BLOCKS_PARAM = '__all__'

const BACKSHOP_HIDDEN_FIND_SCOPE_ID = 'hidden-products-backshop-page'

type BackshopHiddenFindItem =
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

function orderBlockKeys(
  keys: string[],
  storeBlockOrder: { block_id: string; order_index: number }[],
): string[] {
  const o = new Map(storeBlockOrder.map((x) => [x.block_id, x.order_index]))
  return [...keys].sort((a, b) => {
    if (a === UNGEORDNET_BLOCK) return 1
    if (b === UNGEORDNET_BLOCK) return -1
    const oa = o.get(a) ?? 10_000
    const ob = o.get(b) ?? 10_000
    if (oa !== ob) return oa - ob
    return a.localeCompare(b)
  })
}

export function BackshopHiddenProductsPage() {
  const location = useLocation()
  const { pathname } = location
  const navigate = useNavigate()
  const { user } = useAuth()
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)
  const { currentStoreId } = useCurrentStore()
  const [sourceSegment, setSourceSegment] = useState<BackshopHiddenSourceSegment>('all')
  const [showHideDialog, setShowHideDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BackshopCustomProduct | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const manualBlockParam = searchParams.get('manualBlock')
  const ruleBlockParam = searchParams.get('ruleBlock')
  const [activeTab, setActiveTab] = useState<'manual' | 'rule'>(() =>
    searchParams.get('ruleBlock') && !searchParams.get('manualBlock') ? 'rule' : 'manual',
  )
  const [showHiddenHelp, setShowHiddenHelp] = useState(false)

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
  const offerPreview = useMemo(
    () => ({ mode: 'auto' } as const),
    [],
  )
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

  const hideDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks: blocks as Block[],
      storeBlockOrder: storeBackshopBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeBackshopBlockOrder, nameBlockOverrides],
  )
  const displayMode = (layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'

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

  const rawHiddenPluSet = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign, backshopStoreDisabled),
    [rawHiddenPluSet, backshopCampaign, backshopStoreDisabled],
  )

  const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
  const sortMode = (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK'

  const displayListInput: BackshopDisplayListInput | null = useMemo(() => {
    if (!versionId) return null
    const listVersion = activeVersion!
    const carryoverMaster = backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, listVersion.id))
    return {
      masterItems,
      carryoverMasterItems: carryoverMaster,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks: blocks as Block[],
      customProducts: customProducts.map((c) => ({
        id: c.id,
        plu: c.plu,
        name: c.name,
        image_url: c.image_url,
        block_id: c.block_id,
        created_at: c.created_at,
      })),
      bezeichnungsregeln: regeln,
      renamedItems,
      markYellowKwCount: markYellow,
      currentKwNummer: offerKw,
      currentJahr: offerJahr,
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
    }
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
    offerKw,
    offerJahr,
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
        onEdit: info.customProduct
          ? () => {
              if (info.customProduct) setEditingProduct(info.customProduct)
            }
          : undefined,
      })),
    [sortedHiddenProductInfos, user, centralCampaignPluSet],
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
  }, [manualBlockParam, ruleBlockParam])

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
    [setSearchParams],
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

  const hideDialogSearchableItems = useMemo(() => {
    const master = masterItems
      .filter((m) => !rawHiddenPluSet.has(m.plu))
      .map((m) => {
        const r = renamedByPlu.get(m.plu)
        return {
          id: m.id,
          plu: m.plu,
          display_name: r?.display_name ?? m.display_name ?? m.system_name,
          system_name: m.system_name,
          item_type: 'PIECE' as const,
          block_id: m.block_id,
        }
      })
    const custom = customProducts
      .filter((c) => !rawHiddenPluSet.has(c.plu))
      .map((c) => ({
        id: c.id,
        plu: c.plu,
        display_name: c.name,
        system_name: c.name,
        item_type: 'PIECE' as const,
        block_id: c.block_id,
      }))
    return [...master, ...custom]
  }, [masterItems, customProducts, rawHiddenPluSet, renamedByPlu])

  return (
    <DashboardLayout>
      <div
        data-page="backshop-hidden"
        data-tour="backshop-hidden-page"
        className="space-y-5 max-w-[1600px] mx-auto min-w-0"
        data-testid="hidden-products-scroll-root"
      >
        <div className="space-y-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2">
            <div className="flex min-w-0 w-full items-center gap-2 sm:flex-1 sm:min-w-0">
              <div className="shrink-0 rounded-lg bg-muted p-1.5">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="min-w-0 flex-1 text-lg font-bold tracking-tight break-words sm:flex-none sm:text-xl">
                Ausgeblendete Produkte (Backshop)
              </h2>
            </div>
            <div
              className="flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-1 sm:justify-end"
              data-tour="backshop-hidden-toolbar"
            >
              {!isLoading && activeTabHasFindableList && backshopFindItems.length > 0 && (
                <ListFindInPageToolbar
                  showBar={backshopListFind.showBar}
                  onOpen={() => {
                    setBlockNav(activeTab, ALL_BLOCKS_PARAM)
                    window.setTimeout(() => {
                      backshopListFind.openSearch()
                    }, 0)
                  }}
                  barProps={backshopListFind.findInPageBarProps}
                  dataTour="backshop-hidden-search"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                aria-haspopup="dialog"
                title="Hilfe anzeigen"
                onClick={() => setShowHiddenHelp(true)}
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
                <span className="sr-only">Hilfe zu Ausblendliste und Regeln</span>
              </Button>
              {canManageHidden && (
                <Button
                  size="sm"
                  className="shrink-0 bshva-btn-primary border-0 shadow-sm"
                  data-tour="backshop-hidden-add-button"
                  onClick={() => setShowHideDialog(true)}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Produkte ausblenden
                </Button>
              )}
            </div>
          </div>

          <Dialog open={showHiddenHelp} onOpenChange={setShowHiddenHelp}>
            <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Hilfe: Ausgeblendete Produkte</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-1 text-left text-muted-foreground">
                    <p>
                      Oben: bewusst für diesen Markt ausgeblendete Artikel. Unten: Artikel aus der eingespielten Version,
                      die in der normalen Backshop-Liste wegen Marken- oder Warengruppen-Logik nicht erscheinen (ohne
                      Eintrag in der Ausblendliste).
                    </p>
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      <p className="font-medium text-foreground">Kurz erklärt: Ausblendliste, Regeln, Werbung</p>
                      <p>
                        <span className="font-medium text-foreground">Ausblendliste (Tabelle oben):</span>{' '}
                        PLUs, die jemand mit &quot;Produkte ausblenden&quot; für diesen Markt gespeichert hat.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Regeln (Tabelle unten):</span>{' '}
                        Dieselbe Berechnung wie die Backshop-Hauptliste. Master-Zeilen, die dort fehlen, obwohl die PLU
                        nicht auf der Ausblendliste steht (z. B. andere Markenwahl, Warengruppen-Regeln).
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Werbung:</span> Steht eine PLU in der zentralen
                        Werbung, kann sie in der Hauptliste trotzdem sichtbar sein – in der oberen Tabelle weist ein Badge
                        darauf hin.
                      </p>
                      {!isLoading && hasMultiSourceManual && (
                        <p className="rounded-md border border-dashed border-border/80 bg-muted/40 px-2.5 py-2">
                          <span className="font-medium text-foreground">Mehrere Marken zu einer PLU:</span> Eine
                          manuell ausgeblendete Nummer gilt pro Markt für alle Quellzeilen zu dieser PLU, auch wenn hier
                          nur eine Marke in der Zeile sichtbar ist.
                        </p>
                      )}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bshva-filter-card">
          <div
            className="bshva-tabs"
            role="tablist"
            aria-label="Ausgeblendet: Listen"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                switchMainTab(activeTab === 'manual' ? 'rule' : 'manual')
              }
            }}
          >
            <button
              type="button"
              id="backshop-hidden-tab-manual"
              role="tab"
              className="bshva-tab"
              aria-selected={activeTab === 'manual'}
              tabIndex={activeTab === 'manual' ? 0 : -1}
              onClick={() => switchMainTab('manual')}
              title="Manuell ausgeblendet"
              data-tour="backshop-hidden-mode-manual"
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <Hand className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="sm:hidden">Manuell </span>
                <span className="hidden sm:inline">Manuell ausgeblendet </span>
                <span className="bshva-tab-count">{hiddenListRows.length}</span>
              </span>
            </button>
            <button
              type="button"
              id="backshop-hidden-tab-rule"
              role="tab"
              className="bshva-tab"
              aria-selected={activeTab === 'rule'}
              tabIndex={activeTab === 'rule' ? 0 : -1}
              onClick={() => switchMainTab('rule')}
              title="Durch Regel gefiltert"
              data-tour="backshop-hidden-mode-rule"
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <ListFilter className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="sm:hidden">Regeln </span>
                <span className="hidden sm:inline">Durch Regel gefiltert </span>
                <span className="bshva-tab-count">{ruleListRows.length}</span>
              </span>
            </button>
            <div className="hidden min-w-[8px] sm:block sm:flex-1" />
          </div>
          <div className="bshva-filter-strip">
            <div className="bshva-chip-row">
              <button
                type="button"
                className="bshva-chip"
                aria-pressed={sourceSegment === 'all'}
                onClick={() => setSourceSegment('all')}
              >
                Alle <span className="bshva-chip-count">{brandChipCounts.all}</span>
              </button>
              {BACKSHOP_SOURCES.map((s) => {
                const meta = BACKSHOP_SOURCE_META[s]
                const count =
                  s === 'edeka' ? brandChipCounts.edeka : s === 'harry' ? brandChipCounts.harry : brandChipCounts.aryzta
                return (
                  <button
                    key={s}
                    type="button"
                    className="bshva-chip"
                    aria-pressed={sourceSegment === s}
                    onClick={() => setSourceSegment(s)}
                  >
                    <span
                      className={cn(
                        'bshva-bbadge shrink-0',
                        s === 'edeka' && 'bshva-bbadge--E',
                        s === 'harry' && 'bshva-bbadge--H',
                        s === 'aryzta' && 'bshva-bbadge--A',
                      )}
                    >
                      {meta.short}
                    </span>
                    {meta.label} <span className="bshva-chip-count">{count}</span>
                  </button>
                )
              })}
              <button
                type="button"
                className="bshva-chip"
                aria-pressed={sourceSegment === 'eigen'}
                onClick={() => setSourceSegment('eigen')}
              >
                <span className="bshva-bbadge bshva-bbadge--O shrink-0">O</span>
                Eigene <span className="bshva-chip-count">{brandChipCounts.eigen}</span>
              </button>
            </div>
          </div>
          {!isLoading &&
            activeTab === 'manual' &&
            hiddenListRowsFiltered.length > 0 &&
            !manualBlockParam && (
              <div className="bshva-tiles-wrap">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="bshva-section-label">
                    Warengruppen
                    <button
                      type="button"
                      className={cn(
                        'ml-1.5 cursor-pointer rounded-full border border-[var(--bshva-border)] bg-[var(--bshva-n-75)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--bshva-n-700)] underline decoration-dotted underline-offset-2 transition-colors',
                        'hover:border-[var(--bshva-blue-500)]/40 hover:bg-[var(--bshva-blue-50)] hover:text-[var(--bshva-blue-700)]',
                      )}
                      title="Alle Warengruppen in einer Liste"
                      aria-label="Alle Warengruppen in einer Liste"
                      onClick={() => setBlockNav('manual', ALL_BLOCKS_PARAM)}
                    >
                      Alle
                    </button>
                  </div>
                </div>
                <BackshopHiddenBlockOverview
                  tiles={manualBlockTiles}
                  onOpenBlock={(id) => onTileNavigate('manual', id)}
                  emptyMessage="Keine Treffer (Filter oder Suche)."
                  gridClassName="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4"
                />
              </div>
            )}
          {!isLoading &&
            activeTab === 'rule' &&
            ruleListRowsFiltered.length > 0 &&
            !ruleBlockParam && (
              <div className="bshva-tiles-wrap">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="bshva-section-label">
                    Warengruppen
                    <button
                      type="button"
                      className={cn(
                        'ml-1.5 cursor-pointer rounded-full border border-[var(--bshva-border)] bg-[var(--bshva-n-75)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--bshva-n-700)] underline decoration-dotted underline-offset-2 transition-colors',
                        'hover:border-[var(--bshva-blue-500)]/40 hover:bg-[var(--bshva-blue-50)] hover:text-[var(--bshva-blue-700)]',
                      )}
                      title="Alle Warengruppen in einer Liste"
                      aria-label="Alle Warengruppen in einer Liste"
                      onClick={() => setBlockNav('rule', ALL_BLOCKS_PARAM)}
                    >
                      Alle
                    </button>
                  </div>
                </div>
                <BackshopHiddenBlockOverview
                  tiles={ruleBlockTiles}
                  onOpenBlock={(id) => onTileNavigate('rule', id)}
                  emptyMessage="Keine Treffer (Filter oder Suche)."
                  gridClassName="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4"
                  tileSubtitle="Artikel, die in dieser Warengruppe per Regel nicht in der Liste erscheinen"
                />
              </div>
            )}
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          ((activeTab === 'manual' && manualBlockParam) || (activeTab === 'rule' && ruleBlockParam)) && (
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2 pl-2"
                onClick={clearBlockNav}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Zurück Übersicht
              </Button>
            </div>
          )}

        {!isLoading && activeTab === 'manual' && hiddenItems.length === 0 && (
          <div className="bshva-panel">
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <EyeOff className="h-10 w-10 text-[var(--bshva-n-400)] mb-2" />
              <p className="text-sm text-[var(--bshva-n-500)] max-w-md">
                Keine bewusst ausgeblendeten Produkte. „Produkte ausblenden“ legt einen dauerhaften Markt-Eintrag an.
              </p>
            </div>
          </div>
        )}

        {!isLoading &&
          activeTab === 'manual' &&
          hiddenListRows.length > 0 &&
          hiddenListRowsFiltered.length === 0 && (
            <div className="bshva-panel p-6 text-sm text-center text-[var(--bshva-n-500)]">
              Keine Treffer für den gewählten Marken-Filter.
            </div>
          )}

        {!isLoading && activeTab === 'manual' && manualBlockParam && (
          <div className="bshva-panel" data-tour="backshop-hidden-list">
            <div className="bshva-panel-head">
              <div>
                <h3>Manuell ausgeblendet</h3>
                <p className="bshva-panel-head-sub">Warengruppe gefiltert – alle Zeilen dieser Gruppe.</p>
              </div>
              <div className="text-xs text-[var(--bshva-n-500)]">
                {manualBlockParam === ALL_BLOCKS_PARAM
                  ? 'Alle Warengruppen'
                  : (blockNameById.get(manualBlockParam) ??
                    (manualBlockParam === UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : manualBlockParam))}
              </div>
            </div>
            <div className="bshva-panel-body-flush">
              <div className="min-w-0" data-find-in-scope={BACKSHOP_HIDDEN_FIND_SCOPE_ID}>
                <div className="hidden lg:block">
                  <BackshopHiddenManualDesktopTable
                    rows={manualDetailRows}
                    canManageHidden={canManageHidden}
                    unhidePending={unhideProduct.isPending}
                    onUnhide={(plu) => unhideProduct.mutate(plu)}
                    findInPage={hiddenFindInPageBinding}
                    firstItemDataTour="backshop-hidden-first-item"
                    firstShowButtonDataTour="backshop-hidden-show-button"
                  />
                </div>
                <div className="lg:hidden p-0">
                  <HiddenProductsResponsiveList
                    variant="backshop"
                    canManageHidden={canManageHidden}
                    unhidePending={unhideProduct.isPending}
                    onUnhide={(plu) => unhideProduct.mutate(plu)}
                    rows={manualDetailRows}
                    findInPage={hiddenFindInPageBinding}
                    attachFindInScope={false}
                    firstItemDataTour="backshop-hidden-first-item"
                    firstShowButtonDataTour="backshop-hidden-show-button"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && activeTab === 'rule' && ruleListRows.length === 0 && (
          <div className="bshva-panel p-6 text-sm text-center text-[var(--bshva-n-500)]">
            Keine durch Regeln zusätzlich ausgefilterten Artikel; die sichtbaren Quellzeilen in der Hauptliste
            entsprechen der aktuellen Regel-Logik.
          </div>
        )}

        {!isLoading &&
          activeTab === 'rule' &&
          ruleListRows.length > 0 &&
          ruleListRowsFiltered.length === 0 && (
            <div className="bshva-panel p-6 text-sm text-center text-[var(--bshva-n-500)]">
              Keine Treffer für den gewählten Marken-Filter.
            </div>
          )}

        {!isLoading && activeTab === 'rule' && ruleBlockParam && (
          <div className="bshva-panel" data-tour="backshop-hidden-rule-list">
            <div className="bshva-panel-head">
              <div>
                <h3>Durch Regeln nicht in der Hauptliste</h3>
                <p className="bshva-panel-head-sub">Warengruppe gefiltert – alle Zeilen dieser Ansicht.</p>
              </div>
              <div className="text-xs text-[var(--bshva-n-500)]">
                {ruleBlockParam === ALL_BLOCKS_PARAM
                  ? 'Alle Warengruppen'
                  : (blockNameById.get(ruleBlockParam) ??
                    (ruleBlockParam === UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : ruleBlockParam))}
              </div>
            </div>
            <div className="bshva-panel-body-flush">
              <div className="min-w-0" data-find-in-scope={BACKSHOP_HIDDEN_FIND_SCOPE_ID}>
                <div className="hidden lg:block">
                  <BackshopHiddenRuleDesktopTable
                    rows={ruleDetailRows}
                    canEditLineActions={canManageHidden}
                    forceShowPending={upsertLineOverride.isPending}
                    onForceShow={onRuleForceShow}
                    onRequestBrandPicker={
                      canManageHidden
                        ? (row) => {
                            if (row.productGroupId) openMarkenAuswahlForGroup(row.productGroupId)
                          }
                        : undefined
                    }
                    findInPage={hiddenFindInPageBinding}
                    firstItemDataTour="backshop-hidden-rule-first-item"
                  />
                </div>
                <div className="lg:hidden">
                  <BackshopRuleFilteredResponsiveList
                    rows={ruleDetailRows}
                    canEditLineActions={canManageHidden}
                    onForceShow={onRuleForceShow}
                    forceShowPending={upsertLineOverride.isPending}
                    onRequestBrandPicker={
                      canManageHidden
                        ? (row) => {
                            if (row.productGroupId) openMarkenAuswahlForGroup(row.productGroupId)
                          }
                        : undefined
                    }
                    findInPage={hiddenFindInPageBinding}
                    attachFindInScope={false}
                    firstItemDataTour="backshop-hidden-rule-first-item"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {canManageHidden && (
          <HideBackshopProductsDialog
            open={showHideDialog}
            onOpenChange={setShowHideDialog}
            searchableItems={hideDialogSearchableItems}
            displayMode={displayMode}
            listLayout={hideDialogListLayout}
          />
        )}

        {editingProduct && (
          <EditBackshopCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={blocks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
