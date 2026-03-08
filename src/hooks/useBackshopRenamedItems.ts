// Backshop Renamed Items: Globale Umbenennungen (wie eigene Produkte, ausgeblendete)

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BackshopRenamedItem } from '@/types/database'

/** Alle globalen Backshop-Umbenennungen laden (plu → display_name, image_url) */
export function useBackshopRenamedItems() {
  return useQuery({
    queryKey: ['backshop-renamed-items'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_renamed_items')
        .select('*')
        .order('plu', { ascending: true })

      if (error) throw error
      return (data ?? []) as BackshopRenamedItem[]
    },
  })
}
