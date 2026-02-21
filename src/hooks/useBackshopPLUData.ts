// Hook: Backshop-PLU-Items für eine bestimmte Version laden

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { BackshopMasterPLUItem } from '@/types/database'

export interface UseBackshopPLUDataOptions {
  enabled?: boolean
}

/**
 * Lädt alle backshop_master_plu_items für eine gegebene Backshop-Version-ID.
 * Sortierung: alphabetisch nach system_name.
 */
export function useBackshopPLUData(
  versionId: string | undefined,
  options?: UseBackshopPLUDataOptions,
) {
  const { enabled = true } = options ?? {}
  return useQuery<BackshopMasterPLUItem[]>({
    queryKey: ['backshop-plu-items', versionId],
    enabled: !!versionId && enabled,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!versionId) return []

      const { data, error } = await supabase
        .from('backshop_master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .order('system_name', { ascending: true })

      if (error) {
        toast.error('Backshop-PLU-Items laden fehlgeschlagen: ' + (error?.message ?? 'Unbekannter Fehler'))
        throw error
      }

      return (data ?? []) as BackshopMasterPLUItem[]
    },
  })
}
