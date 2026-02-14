// Hook: Alle Versionen laden (für KW-Selector)

import { useQuery } from '@tanstack/react-query'
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
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })

        if (error) {
          console.error('Versionen laden fehlgeschlagen:', error)
          throw error
        }
        return (data ?? []) as Version[]
      }),
  })
}
