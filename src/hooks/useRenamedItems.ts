// Obst/Gemüse Renamed Items: Marktspezifische Umbenennungen

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { RenamedItem } from '@/types/database'

/** Alle marktspezifischen Obst/Gemüse-Umbenennungen laden */
export function useRenamedItems() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['renamed-items', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const data = await queryRest<RenamedItem[]>('renamed_items', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'plu.asc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}
