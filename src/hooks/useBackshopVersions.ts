// Hook: Alle Backshop-Versionen laden (für KW-Selector)

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest } from '@/lib/supabase'
import type { BackshopVersion } from '@/types/database'

/**
 * Lädt alle Backshop-Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useBackshopVersions() {
  return useQuery<BackshopVersion[]>({
    queryKey: ['backshop-versions'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      try {
        const data = await queryRest<BackshopVersion[]>('backshop_versions', {
          select: '*',
          order: 'jahr.desc,kw_nummer.desc',
        })
        return data ?? []
      } catch (err) {
        toast.error('Backshop-Versionen laden fehlgeschlagen: ' + ((err as Error)?.message ?? 'Unbekannter Fehler'))
        throw err
      }
    },
  })
}
