// Hook: Aktive Version laden (status = 'active')

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import type { Version } from '@/types/database'

/**
 * Lädt die aktuell aktive KW-Version aus der Datenbank.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 */
export function useActiveVersion() {
  return useQuery<Version | null>({
    queryKey: ['version', 'active'],
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data: active, error: activeError } = await supabase
          .from('versions')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (!activeError && active) return active as Version

        const { data: latest, error: latestError } = await supabase
          .from('versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestError) {
          if ((latestError as { message?: string }).message?.includes?.('AbortError')) throw latestError
          console.error('Keine Version gefunden:', latestError)
          return null
        }
        return (latest ?? null) as Version | null
      }),
  })
}
