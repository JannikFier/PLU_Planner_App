// Hook: Aktive Backshop-Version laden (status = 'active')

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import type { BackshopVersion } from '@/types/database'

/**
 * Lädt die aktuell aktive Backshop-KW-Version.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 */
export function useActiveBackshopVersion() {
  return useQuery<BackshopVersion | null>({
    queryKey: ['backshop-version', 'active'],
    staleTime: 60_000,
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data: active, error: activeError } = await supabase
          .from('backshop_versions')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (!activeError && active) return active as BackshopVersion

        const { data: latest, error: latestError } = await supabase
          .from('backshop_versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestError) {
          if ((latestError as { message?: string }).message?.includes?.('AbortError')) throw latestError
          toast.error('Keine Backshop-Version gefunden: ' + (latestError?.message ?? 'Unbekannter Fehler'))
          return null
        }
        return (latest ?? null) as BackshopVersion | null
      }),
  })
}
