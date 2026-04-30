// Vollseite: Produkte umbenennen (Backshop)

import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RenameProductsPickerContent } from '@/components/plu/RenameProductsPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import type { BackshopMasterPLUItem, Block } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'

export function PickRenameBackshopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/backshop-renamed-products',
    [pathname, location.state],
  )

  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: globalRenamed = [] } = useBackshopRenamedItems()
  const { data: backshopCarryoverRows = [] } = useStoreListCarryoverRows('backshop', activeVersion?.id)
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const renameDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks: blocks as Block[],
      storeBlockOrder: storeBackshopBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeBackshopBlockOrder, nameBlockOverrides],
  )

  const flowDirection = (layoutSettings?.flow_direction ?? 'ROW_BY_ROW') as 'ROW_BY_ROW' | 'COLUMN_FIRST'
  const dialogFontSizes = {
    header: layoutSettings?.font_header_px ?? 32,
    column: layoutSettings?.font_column_px ?? 18,
    product: layoutSettings?.font_product_px ?? 18,
  }

  const carryoverMastersIncluded = useMemo(() => {
    if (!activeVersion?.id) return [] as BackshopMasterPLUItem[]
    return backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, activeVersion.id))
  }, [backshopCarryoverRows, activeVersion])

  const masterByPluForRenamed = useMemo(() => {
    const m = new Map<string, BackshopMasterPLUItem>()
    for (const item of masterItems) m.set(item.plu, item)
    for (const c of carryoverMastersIncluded) {
      if (!m.has(c.plu)) m.set(c.plu, c)
    }
    return m
  }, [masterItems, carryoverMastersIncluded])

  const searchableItemsForRename = useMemo(() => Array.from(masterByPluForRenamed.values()), [masterByPluForRenamed])

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[90vw] lg:max-w-5xl xl:max-w-7xl mx-auto min-w-0">
        <RenameProductsPickerContent
          searchableItems={searchableItemsForRename}
          listType="backshop"
          displayMode={(layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'}
          renamedOverrides={globalRenamed.map((r) => ({ plu: r.plu, display_name: r.display_name }))}
          listLayout={renameDialogListLayout}
          flowDirection={flowDirection}
          fontSizes={dialogFontSizes}
          dataTour="backshop-renamed-add-dialog"
          renameDialogSubmitDataTour="backshop-renamed-add-dialog-submit"
          onCancel={() => navigate(backPath)}
        />
      </div>
    </DashboardLayout>
  )
}
