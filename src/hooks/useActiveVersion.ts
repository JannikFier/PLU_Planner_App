// Hook: Aktive Version laden (status = 'active')

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { isAbortError } from '@/lib/error-utils'
import type { Version } from '@/types/database'

const TOAST_DELAY_MS = 1500

/**
 * Lädt die aktuell aktive KW-Version aus der Datenbank.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 * Toast erst nach Verzögerung, damit kurze Fehler (sofortiger Refetch-Erfolg) nicht aufblitzen.
 */
export function useActiveVersion() {
  const result = useQuery<Version | null>({
    queryKey: ['version', 'active'],
    staleTime: 60_000,
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
          if (isAbortError(latestError)) throw latestError
          throw latestError
        }
        return (latest ?? null) as Version | null
      }),
  })

  useEffect(() => {
    if (!result.isError || result.isRefetching || !result.error) return
    const t = setTimeout(() => {
      if (isAbortError(result.error)) return
      const msg = 'Keine Version gefunden: ' + ((result.error as { message?: string })?.message ?? 'Unbekannter Fehler')
      toast.error(msg)
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
