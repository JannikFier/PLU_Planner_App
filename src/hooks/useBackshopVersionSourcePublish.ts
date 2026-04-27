// Letzte Publish-Metadaten pro Backshop-Version und Quelle (Edeka/Harry/Aryzta)

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import type { BackshopVersionSourcePublish } from '@/types/database'

function sortedIdsKey(ids: string[]): string {
  return [...ids].sort().join(',')
}

/**
 * Lädt alle `backshop_version_source_publish`-Zeilen für die angegebenen Version-IDs (ein REST-Call).
 */
export function useBackshopVersionSourcePublish(versionIds: string[]) {
  const sorted = [...versionIds].sort()
  const key = sortedIdsKey(sorted)

  return useQuery<BackshopVersionSourcePublish[]>({
    queryKey: ['backshop-version-source-publish', key],
    enabled: sorted.length > 0,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const inList = sorted.map((id) => `"${id}"`).join(',')
      const data = await queryRest<BackshopVersionSourcePublish[]>(
        'backshop_version_source_publish',
        {
          select: '*',
          version_id: `in.(${inList})`,
        },
        { signal, onMissingRelation: 'empty' },
      )
      return data ?? []
    },
  })
}

/** Map (version_id|source) -> Zeile */
export function indexBackshopSourcePublishByVersionAndSource(
  rows: BackshopVersionSourcePublish[],
): Map<string, BackshopVersionSourcePublish> {
  const m = new Map<string, BackshopVersionSourcePublish>()
  for (const r of rows) {
    m.set(`${r.version_id}|${r.source}`, r)
  }
  return m
}
