/**
 * Tutorial-Capabilities – React-Hook
 *
 * Nutzt App-Hooks (Auth, Markt, Sichtbarkeit, Layout-Settings) um aus
 * `deriveTutorialCapabilities()` ein Live-Set zu bilden. Bewusst separiert
 * von `tutorial-capabilities.ts`, damit das Datenmodell + die reine
 * Ableitungslogik ohne `window`/Supabase-Imports getestet werden koennen.
 */

import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useStoreAccessByUser } from '@/hooks/useStoreAccess'
import {
  deriveTutorialCapabilities,
  type TutorialCapabilityInputs,
  type TutorialCapabilitySet,
} from './tutorial-capabilities'

/**
 * Liefert das aktuelle Capability-Set fuer den eingeloggten User im
 * aktuellen Markt. Live mit React-Query gekoppelt – aenderungen an
 * Markt-Sichtbarkeit oder Layout-Features aktualisieren die Menge sofort.
 */
export function useTutorialCapabilities(): TutorialCapabilitySet {
  const { profile, isViewer, isAdmin, isSuperAdmin, mustChangePassword, user } = useAuth()
  const { currentStoreId } = useCurrentStore()
  const visibility = useEffectiveListVisibility()
  const obstLayout = useLayoutSettings()
  const bsLayout = useBackshopLayoutSettings()
  const { data: storeAccess } = useStoreAccessByUser(user?.id)

  const role: TutorialCapabilityInputs['role'] = profile?.role ?? null

  // Falls Layout-Daten noch laden: Defaults sind in den Hooks bereits true,
  // deshalb behandeln wir undefined wie aktiviert.
  const obstFeatures = useMemo(
    () => ({
      customProducts: obstLayout.data?.features_custom_products ?? true,
      hiddenItems: obstLayout.data?.features_hidden_items ?? true,
      keywordRules: obstLayout.data?.features_keyword_rules ?? true,
    }),
    [obstLayout.data],
  )
  const backshopFeatures = useMemo(
    () => ({
      customProducts: bsLayout.data?.features_custom_products ?? true,
      hiddenItems: bsLayout.data?.features_hidden_items ?? true,
      keywordRules: bsLayout.data?.features_keyword_rules ?? true,
    }),
    [bsLayout.data],
  )

  return useMemo(() => {
    const effectiveRole: TutorialCapabilityInputs['role'] = isSuperAdmin
      ? 'super_admin'
      : isAdmin
        ? 'admin'
        : isViewer
          ? 'viewer'
          : role
    return deriveTutorialCapabilities({
      role: effectiveRole,
      hasStore: !!currentStoreId,
      obstVisible: visibility.obstGemuese,
      backshopVisible: visibility.backshop,
      obstFeatures,
      backshopFeatures,
      accessibleStoreCount: storeAccess?.length ?? 0,
      mustChangePassword,
    })
  }, [
    isSuperAdmin,
    isAdmin,
    isViewer,
    role,
    currentStoreId,
    visibility.obstGemuese,
    visibility.backshop,
    obstFeatures,
    backshopFeatures,
    storeAccess?.length,
    mustChangePassword,
  ])
}
