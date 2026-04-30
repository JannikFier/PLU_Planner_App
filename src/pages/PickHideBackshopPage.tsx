// Vollseite: Produkte ausblenden (Backshop) – inkl. Bild und Marken-Kürzel (E/H/A)

import { useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  HideBackshopPickerContent,
  type HideBackshopPickerRow,
} from '@/components/plu/HideBackshopPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useBackshopHiddenItems } from '@/hooks/useBackshopHiddenItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import type { Block } from '@/types/database'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'

export function PickHideBackshopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/backshop-hidden-products',
    [pathname, location.state],
  )

  const { data: hiddenItems = [], isLoading: hiddenLoading } = useBackshopHiddenItems()
  const { data: activeVersion } = useActiveBackshopVersion()
  const versionId = activeVersion?.id
  const { data: masterItems = [], isLoading: masterItemsLoading } = useBackshopPLUData(versionId)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const { isSuccess: prevManualLoaded } = useBackshopPrevManualSupplementPluSet(versionId)
  const prevManualReady = !versionId || prevManualLoaded

  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
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

  const rawHiddenPluSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const renamedByPlu = useMemo(() => new Map(renamedItems.map((r) => [r.plu, r])), [renamedItems])

  const hidePickerRows = useMemo((): HideBackshopPickerRow[] => {
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
          image_url: m.image_url,
          source: m.source,
          is_market_custom: false,
        }
      })
    const custom = customProducts
      .filter((c) => !rawHiddenPluSet.has(c.plu))
      .map(
        (c): HideBackshopPickerRow => ({
          id: c.id,
          plu: c.plu,
          display_name: c.name,
          system_name: c.name,
          item_type: 'PIECE' as const,
          block_id: c.block_id,
          image_url: c.image_url,
          source: undefined,
          is_market_custom: true,
        }),
      )
    return [...master, ...custom]
  }, [masterItems, customProducts, rawHiddenPluSet, renamedByPlu])

  const isLoading = hiddenLoading || masterItemsLoading || !prevManualReady

  if (!canManageHidden) {
    return <Navigate to={backPath} replace />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-muted h-64 rounded-lg max-w-7xl mx-auto" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto min-w-0">
        <HideBackshopPickerContent
          searchableItems={hidePickerRows}
          displayMode={displayMode}
          listLayout={hideDialogListLayout}
          onCancel={() => navigate(backPath)}
          onAfterBatchSuccess={() => navigate(backPath, { replace: true })}
        />
      </div>
    </DashboardLayout>
  )
}
