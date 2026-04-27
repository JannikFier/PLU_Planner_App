/**
 * Tutorial-Step-Context (React-Hook)
 *
 * Baut den Live-`TutorialStepCtx` aus App-Hooks zusammen. Wird ab PR 3 vom
 * Orchestrator konsumiert; in PR 1 nur bereitgestellt, damit Tests ihn
 * rendern koennen sobald der Engine-Adapter das Modell verwendet.
 *
 * Bewusst getrennt von `tutorial-step-types.ts`, damit das Datenmodell
 * ohne Browser-Abhaengigkeiten testbar bleibt.
 */

import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import type { DeviceClass, TutorialStepCtx } from './tutorial-step-types'

export function useTutorialStepCtx(device: DeviceClass): TutorialStepCtx {
  const { profile, isViewer, isAdmin, isSuperAdmin } = useAuth()
  const { currentStoreId, storeName } = useCurrentStore()
  const visibility = useEffectiveListVisibility()
  const obst = useLayoutSettings()
  const bs = useBackshopLayoutSettings()

  return useMemo<TutorialStepCtx>(() => {
    const role: TutorialStepCtx['role'] = isSuperAdmin
      ? 'super_admin'
      : isAdmin
        ? 'admin'
        : isViewer
          ? 'viewer'
          : profile?.role ?? null

    return {
      store: { id: currentStoreId, name: storeName },
      role,
      device,
      obst: {
        visible: visibility.obstGemuese,
        markRedKwCount: obst.data?.mark_red_kw_count ?? 2,
        markYellowKwCount: obst.data?.mark_yellow_kw_count ?? 3,
        sortMode: obst.data?.sort_mode ?? 'ALPHABETICAL',
        displayMode: obst.data?.display_mode ?? 'MIXED',
        flowDirection: obst.data?.flow_direction ?? 'ROW_BY_ROW',
        featuresCustomProducts: obst.data?.features_custom_products ?? true,
        featuresHiddenItems: obst.data?.features_hidden_items ?? true,
        featuresKeywordRules: obst.data?.features_keyword_rules ?? true,
      },
      backshop: {
        visible: visibility.backshop,
        markRedKwCount: bs.data?.mark_red_kw_count ?? 2,
        markYellowKwCount: bs.data?.mark_yellow_kw_count ?? 3,
        sortMode: bs.data?.sort_mode ?? 'ALPHABETICAL',
        flowDirection: bs.data?.flow_direction ?? 'ROW_BY_ROW',
        featuresCustomProducts: bs.data?.features_custom_products ?? true,
        featuresHiddenItems: bs.data?.features_hidden_items ?? true,
        featuresKeywordRules: bs.data?.features_keyword_rules ?? true,
      },
    }
  }, [
    isSuperAdmin,
    isAdmin,
    isViewer,
    profile?.role,
    currentStoreId,
    storeName,
    device,
    visibility.obstGemuese,
    visibility.backshop,
    obst.data,
    bs.data,
  ])
}
