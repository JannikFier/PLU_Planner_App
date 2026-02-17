// Hook: Alle Versionen laden (für KW-Selector)

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import type { Version } from '@/types/database'

/**
 * Lädt ALLE Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Wird im KWSelector verwendet.
 */
export function useVersions() {
  return useQuery<Version[]>({
    queryKey: ['versions'],
    staleTime: 2 * 60_000,
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })

        if (error) {
          toast.error('Versionen laden fehlgeschlagen: ' + (error?.message ?? 'Unbekannter Fehler'))
          throw error
        }
        return (data ?? []) as Version[]
      }),
  })
}
