// Hook: Alle Backshop-Versionen laden (für KW-Selector)

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import type { BackshopVersion } from '@/types/database'

/**
 * Lädt alle Backshop-Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 */
export function useBackshopVersions() {
  return useQuery<BackshopVersion[]>({
    queryKey: ['backshop-versions'],
    staleTime: 2 * 60_000,
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data, error } = await supabase
          .from('backshop_versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })

        if (error) {
          toast.error('Backshop-Versionen laden fehlgeschlagen: ' + (error?.message ?? 'Unbekannter Fehler'))
          throw error
        }
        return (data ?? []) as BackshopVersion[]
      }),
  })
}
