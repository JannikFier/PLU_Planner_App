// Hook: Aktive Backshop-Version laden (status = 'active')

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest } from '@/lib/supabase'
import type { BackshopVersion } from '@/types/database'

/**
 * Lädt die aktuell aktive Backshop-KW-Version.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useActiveBackshopVersion() {
  return useQuery<BackshopVersion | null>({
    queryKey: ['backshop-version', 'active'],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      try {
        const active = await queryRest<BackshopVersion[]>('backshop_versions', {
          select: '*',
          status: 'eq.active',
          limit: '1',
        }, { signal })
        if (active && active.length > 0) return active[0]

        const latest = await queryRest<BackshopVersion[]>('backshop_versions', {
          select: '*',
          order: 'jahr.desc,kw_nummer.desc',
          limit: '1',
        }, { signal })
        return latest?.[0] ?? null
      } catch (err) {
        toast.error('Keine Backshop-Version gefunden: ' + ((err as Error)?.message ?? 'Unbekannter Fehler'))
        throw err
      }
    },
  })
}
