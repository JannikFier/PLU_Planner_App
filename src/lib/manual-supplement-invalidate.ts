import type { QueryClient } from '@tanstack/react-query'

/** Nach Insert/Update/Löschen von zentralen Nachbesserungen (Obst + Backshop). */
export function invalidateManualSupplementQueries(
  queryClient: QueryClient,
  opts: { obstVersionId?: string | null; backshopVersionId?: string | null },
) {
  const { obstVersionId, backshopVersionId } = opts
  if (obstVersionId) {
    queryClient.invalidateQueries({ queryKey: ['plu-items', obstVersionId] })
    queryClient.invalidateQueries({ queryKey: ['obst-manual-supplements', obstVersionId] })
    queryClient.invalidateQueries({ queryKey: ['obst-notification-neu-tab', obstVersionId] })
    queryClient.invalidateQueries({ queryKey: ['obst-prev-manual-plu-set'] })
    queryClient.invalidateQueries({ queryKey: ['changed-products', obstVersionId] })
    queryClient.invalidateQueries({ queryKey: ['active-version-change-count'] })
    queryClient.invalidateQueries({ queryKey: ['version-notification', obstVersionId] })
  }
  if (backshopVersionId) {
    queryClient.invalidateQueries({ queryKey: ['backshop-plu-items', backshopVersionId] })
    queryClient.invalidateQueries({ queryKey: ['backshop-manual-supplements', backshopVersionId] })
    queryClient.invalidateQueries({ queryKey: ['backshop-notification-neu-tab', backshopVersionId] })
    queryClient.invalidateQueries({ queryKey: ['backshop-prev-manual-plu-set'] })
    queryClient.invalidateQueries({ queryKey: ['backshop-changed-products', backshopVersionId] })
    queryClient.invalidateQueries({ queryKey: ['backshop-active-version-change-count'] })
    queryClient.invalidateQueries({ queryKey: ['backshop-version-notification', backshopVersionId] })
  }
  queryClient.invalidateQueries({ queryKey: ['notification-count'] })
  queryClient.invalidateQueries({ queryKey: ['backshop-notification-count'] })
  queryClient.invalidateQueries({ queryKey: ['unread-notifications'] })
  queryClient.invalidateQueries({ queryKey: ['version', 'active'] })
  queryClient.invalidateQueries({ queryKey: ['versions'] })
  queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
  queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
  queryClient.invalidateQueries({ queryKey: ['manual-supplement-carryover-pending'] })
}
