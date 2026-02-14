// Hook: PLU-Items für eine bestimmte Version laden

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MasterPLUItem } from '@/types/database'

export interface UsePLUDataOptions {
  enabled?: boolean
}

/**
 * Lädt alle master_plu_items für eine gegebene Version-ID.
 * Sortierung: alphabetisch nach system_name.
 * Nur aktiv wenn versionId vorhanden (und ggf. enabled).
 */
export function usePLUData(
  versionId: string | undefined,
  options?: UsePLUDataOptions,
) {
  const { enabled = true } = options ?? {}
  return useQuery<MasterPLUItem[]>({
    queryKey: ['plu-items', versionId],
    enabled: !!versionId && enabled,
    queryFn: async () => {
      if (!versionId) return []

      const { data, error } = await supabase
        .from('master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .order('system_name', { ascending: true })

      if (error) {
        console.error('PLU-Items laden fehlgeschlagen:', error)
        throw error
      }

      return (data ?? []) as MasterPLUItem[]
    },
  })
}
