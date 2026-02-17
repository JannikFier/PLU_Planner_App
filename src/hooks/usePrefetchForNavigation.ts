/**
 * Prefetch von Daten für MasterList und LayoutSettingsPage.
 * Wird beim App-Start (AuthPrefetch) und auf den Dashboards aufgerufen,
 * damit beim Klick auf "Masterliste" oder "Layout" die Daten bereits im Cache sind.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

/** Liest aktive Version-ID aus Cache (version/active oder aus versions-Liste). */
function getActiveVersionIdFromCache(queryClient: QueryClient): string | null {
  const active = queryClient.getQueryData<{ id: string } | null>(['version', 'active'])
  if (active?.id) return active.id
  const versions = queryClient.getQueryData<Array<{ id: string; status?: string }>>(['versions'])
  const v = versions?.find((x) => x.status === 'active') ?? versions?.[0]
  return v?.id ?? null
}

/** Zentrale Prefetch-Logik – wiederverwendbar für AuthPrefetch und Dashboard.
 *  Bricht den Waterfall auf: plu-items startet sobald version/active ODER versions fertig ist (wer zuerst). */
export function runMasterListPrefetch(queryClient: QueryClient): void {
  const versionPromise = queryClient.prefetchQuery({ queryKey: ['version', 'active'] })
  const versionsPromise = queryClient.prefetchQuery({ queryKey: ['versions'] })
  void queryClient.prefetchQuery({ queryKey: ['layout-settings'] })
  void queryClient.prefetchQuery({ queryKey: ['blocks'] })
  void queryClient.prefetchQuery({ queryKey: ['custom-products'] })
  void queryClient.prefetchQuery({ queryKey: ['hidden-items'] })
  void queryClient.prefetchQuery({ queryKey: ['bezeichnungsregeln'] })

  // Sobald eine der beiden Queries fertig ist: Version-ID aus Cache holen und plu-items prefetchen (kein Waterfall).
  Promise.any([versionPromise, versionsPromise])
    .then(() => {
      const versionId = getActiveVersionIdFromCache(queryClient)
      if (versionId) {
        void queryClient.prefetchQuery({ queryKey: ['plu-items', versionId] })
      }
    })
}

export function usePrefetchForNavigation() {
  const queryClient = useQueryClient()

  useEffect(() => {
    runMasterListPrefetch(queryClient)
  }, [queryClient])
}
