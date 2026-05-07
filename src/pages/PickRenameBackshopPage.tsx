// Vollseite: Produkte umbenennen (Backshop)

import { useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RenameProductsPickerContent } from '@/components/plu/RenameProductsPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useBackshopMasterListDisplayBundle } from '@/hooks/useBackshopMasterListDisplayBundle'
import type { BackshopMasterPLUItem, Block } from '@/types/database'
import { backshopRenamePickerMastersFromDisplayOrder } from '@/lib/backshop-rename-picker-scope'

const RENAME_LIST_SCOPE_STORAGE_KEY = 'backshop-rename-picker-scope'

type BackshopRenameListScope = 'my_list' | 'all_products'

function readStoredRenameListScope(): BackshopRenameListScope {
  try {
    const v = localStorage.getItem(RENAME_LIST_SCOPE_STORAGE_KEY)
    if (v === 'my_list' || v === 'all_products') return v
  } catch {
    /* ignore */
  }
  return 'my_list'
}

export function PickRenameBackshopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/backshop-renamed-products',
    [pathname, location.state],
  )

  const bundle = useBackshopMasterListDisplayBundle()

  const [renameListScope, setRenameListScope] = useState<BackshopRenameListScope>(readStoredRenameListScope)

  const persistRenameListScope = useCallback((scope: BackshopRenameListScope) => {
    setRenameListScope(scope)
    try {
      localStorage.setItem(RENAME_LIST_SCOPE_STORAGE_KEY, scope)
    } catch {
      /* ignore */
    }
  }, [])

  const renameDialogListLayout = useMemo(
    () => ({
      sortMode: bundle.sortMode,
      blocks: bundle.blocks as Block[],
      storeBlockOrder: bundle.storeBackshopBlockOrder,
      nameBlockOverrides: bundle.nameBlockOverrides,
    }),
    [bundle.sortMode, bundle.blocks, bundle.storeBackshopBlockOrder, bundle.nameBlockOverrides],
  )

  const masterByPluForRenamed = useMemo(() => {
    const m = new Map<string, BackshopMasterPLUItem>()
    for (const item of bundle.masterScopeItems) m.set(item.plu, item)
    for (const c of bundle.carryoverMasterScoped) {
      if (!m.has(c.plu)) m.set(c.plu, c)
    }
    return m
  }, [bundle.masterScopeItems, bundle.carryoverMasterScoped])

  const fullSearchableList = useMemo(() => Array.from(masterByPluForRenamed.values()), [masterByPluForRenamed])

  const searchableItemsForRename = useMemo(() => {
    if (renameListScope !== 'my_list' || bundle.isLoading) return fullSearchableList
    return backshopRenamePickerMastersFromDisplayOrder(
      bundle.displayItems,
      bundle.masterScopeItems,
      bundle.carryoverMasterScoped,
    )
  }, [fullSearchableList, renameListScope, bundle.isLoading, bundle.displayItems, bundle.masterScopeItems, bundle.carryoverMasterScoped])

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[90vw] lg:max-w-5xl xl:max-w-7xl mx-auto min-w-0">
        <RenameProductsPickerContent
          searchableItems={searchableItemsForRename}
          listType="backshop"
          displayMode={bundle.displayMode}
          renamedOverrides={bundle.renamedItems.map((r) => ({ plu: r.plu, display_name: r.display_name }))}
          listLayout={renameDialogListLayout}
          flowDirection={bundle.flowDirection}
          fontSizes={bundle.fontSizes}
          renameListScope={renameListScope}
          onRenameListScopeChange={persistRenameListScope}
          dataTour="backshop-renamed-add-dialog"
          renameDialogSubmitDataTour="backshop-renamed-add-dialog-submit"
          onCancel={() => navigate(backPath)}
        />
      </div>
    </DashboardLayout>
  )
}
