// Vollseite: Produkte ausblenden (Obst) – gleiche Logik wie früherer Dialog

import { useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { HideObstPickerContent } from '@/components/plu/HideObstPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useHiddenItems } from '@/hooks/useHiddenItems'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useBlocks } from '@/hooks/useBlocks'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'

export function PickHideObstPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/hidden-products',
    [pathname, location.state],
  )

  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const hideDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks,
      storeBlockOrder: storeObstBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeObstBlockOrder, nameBlockOverrides],
  )

  const displayMode = (layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'
  const flowDirection = (layoutSettings?.flow_direction ?? 'COLUMN_FIRST') as 'ROW_BY_ROW' | 'COLUMN_FIRST'
  const dialogFontSizes = {
    header: layoutSettings?.font_header_px ?? 24,
    column: layoutSettings?.font_column_px ?? 16,
    product: layoutSettings?.font_product_px ?? 12,
  }
  const hiddenPLUSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const searchableItems = useMemo(() => {
    const master = masterItems
      .filter((m) => !hiddenPLUSet.has(m.plu))
      .map((m) => ({
        id: m.id,
        plu: m.plu,
        display_name: m.display_name ?? m.system_name,
        system_name: m.system_name,
        item_type: m.item_type as 'PIECE' | 'WEIGHT',
        block_id: m.block_id,
      }))
    const custom = customProducts
      .filter((c) => !hiddenPLUSet.has(c.plu))
      .map((c) => ({
        id: c.id,
        plu: c.plu,
        display_name: c.name,
        system_name: c.name,
        item_type: c.item_type as 'PIECE' | 'WEIGHT',
        block_id: c.block_id,
      }))
    return [...master, ...custom]
  }, [masterItems, customProducts, hiddenPLUSet])

  if (!canManageHidden) {
    return <Navigate to={backPath} replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[90vw] lg:max-w-5xl xl:max-w-7xl mx-auto min-w-0">
        <HideObstPickerContent
          searchableItems={searchableItems}
          displayMode={displayMode}
          listLayout={hideDialogListLayout}
          flowDirection={flowDirection}
          fontSizes={dialogFontSizes}
          dataTour="obst-hidden-add-dialog"
          submitDataTour="obst-hidden-add-dialog-submit"
          onCancel={() => navigate(backPath)}
          onAfterBatchSuccess={() => navigate(backPath, { replace: true })}
        />
      </div>
    </DashboardLayout>
  )
}
