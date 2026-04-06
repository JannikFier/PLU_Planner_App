// Marktwechsel: marktspezifische Queries leeren und neu laden.
// Nur invalidateQueries reicht nicht: alter Cache bleibt kurz sichtbar (Persist/sessionStorage),
// dadurch können Ausblendungen / eigene Produkte eines anderen Markts durchscheinen.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentStore } from '@/hooks/useCurrentStore'

/** Query-Key-Präfixe, die immer pro `currentStoreId` gelten (keine Daten eines anderen Markts im Cache behalten). */
const STORE_SCOPED_QUERY_PREFIXES = [
  'hidden-items',
  'backshop-hidden-items',
  'custom-products',
  'backshop-custom-products',
  'offer-items',
  'backshop-offer-items',
  'renamed-items',
  'backshop-renamed-items',
  'layout-settings',
  'backshop-layout-settings',
  'bezeichnungsregeln',
  'backshop-bezeichnungsregeln',
  'store-obst-block-order',
  'store-obst-name-block-override',
  'store-backshop-block-order',
  'store-backshop-name-block-override',
  'obst-offer-store-disabled',
  'backshop-offer-store-disabled',
  'obst-offer-local-prices',
  'backshop-offer-local-prices',
  'notification-count',
  'backshop-notification-count',
  'version-notification',
  'backshop-version-notification',
  'unread-notifications',
  'user-list-visibility',
  'store-list-visibility',
] as const

export function StoreChangeQuerySync() {
  const { currentStoreId } = useCurrentStore()
  const queryClient = useQueryClient()
  const prevStoreIdRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevStoreIdRef.current
    if (prev !== null && currentStoreId !== null && prev !== currentStoreId) {
      for (const prefix of STORE_SCOPED_QUERY_PREFIXES) {
        void queryClient.removeQueries({ queryKey: [prefix] })
      }
      // Aktive useQuery-Observer triggern danach einen frischen Fetch für den neuen Markt.
    }
    prevStoreIdRef.current = currentStoreId
  }, [currentStoreId, queryClient])

  return null
}
