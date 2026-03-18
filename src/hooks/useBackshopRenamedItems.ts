// Backshop Renamed Items: Globale Umbenennungen (wie eigene Produkte, ausgeblendete)

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { BackshopRenamedItem } from '@/types/database'

/** Alle globalen Backshop-Umbenennungen laden (plu → display_name, image_url) */
export function useBackshopRenamedItems() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-renamed-items', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const data = await queryRest<BackshopRenamedItem[]>('backshop_renamed_items', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'plu.asc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}
