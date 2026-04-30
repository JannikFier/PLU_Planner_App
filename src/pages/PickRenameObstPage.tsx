// Vollseite: Produkte umbenennen (Obst)

import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RenameProductsPickerContent } from '@/components/plu/RenameProductsPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useRenamedItems } from '@/hooks/useRenamedItems'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBlocks } from '@/hooks/useBlocks'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import type { MasterPLUItem } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverObstRowToMasterItem } from '@/lib/carryover-master-snapshot'

export function PickRenameObstPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/renamed-products',
    [pathname, location.state],
  )

  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: storeRenamed = [] } = useRenamedItems()
  const { data: obstCarryoverRows = [] } = useStoreListCarryoverRows('obst', activeVersion?.id)
  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const renameDialogListLayout = useMemo(
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

  const carryoverMastersIncluded = useMemo(() => {
    if (!activeVersion?.id) return [] as MasterPLUItem[]
    return obstCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverObstRowToMasterItem(r, activeVersion.id))
  }, [obstCarryoverRows, activeVersion])

  const masterByPluForRenamed = useMemo(() => {
    const m = new Map<string, MasterPLUItem>()
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
          displayMode={displayMode}
          renamedOverrides={storeRenamed.map((r) => ({ plu: r.plu, display_name: r.display_name }))}
          listLayout={renameDialogListLayout}
          flowDirection={flowDirection}
          fontSizes={dialogFontSizes}
          dataTour="obst-renamed-add-dialog"
          renameDialogDataTour="obst-renamed-rename-dialog"
          renameDialogSubmitDataTour="obst-renamed-rename-dialog-submit"
          onCancel={() => navigate(backPath)}
        />
      </div>
    </DashboardLayout>
  )
}
