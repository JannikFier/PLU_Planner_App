// Marktwechsel: ausgeblendete PLUs neu laden, damit kein veralteter Cache eines anderen Markts angezeigt wird.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentStore } from '@/hooks/useCurrentStore'

export function StoreChangeQuerySync() {
  const { currentStoreId } = useCurrentStore()
  const queryClient = useQueryClient()
  const prevStoreIdRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevStoreIdRef.current
    if (prev !== null && currentStoreId !== null && prev !== currentStoreId) {
      void queryClient.invalidateQueries({ queryKey: ['hidden-items'] })
      void queryClient.invalidateQueries({ queryKey: ['backshop-hidden-items'] })
      void queryClient.invalidateQueries({ queryKey: ['layout-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['backshop-layout-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
      void queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln'] })
      void queryClient.invalidateQueries({ queryKey: ['store-obst-block-order'] })
      void queryClient.invalidateQueries({ queryKey: ['store-obst-name-block-override'] })
      void queryClient.invalidateQueries({ queryKey: ['store-backshop-block-order'] })
      void queryClient.invalidateQueries({ queryKey: ['store-backshop-name-block-override'] })
    }
    prevStoreIdRef.current = currentStoreId
  }, [currentStoreId, queryClient])

  return null
}
