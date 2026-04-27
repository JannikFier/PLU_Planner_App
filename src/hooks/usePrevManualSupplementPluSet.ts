import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVersions } from '@/hooks/useVersions'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { getPreviousVersionId } from '@/lib/version-plu-diff'
import { queryRest } from '@/lib/supabase'

/**
 * PLUs mit manueller Nachbesserung in der **Vorversion** (Carryover-Quelle).
 * `null` = es gibt keine Vorversion → Overlay behandelt alle manuellen UNCHANGED wie „neu“.
 */
export function useObstPrevManualSupplementPluSet(versionId: string | undefined) {
  const { data: versions = [] } = useVersions()
  const previousId = useMemo(() => getPreviousVersionId(versions, versionId), [versions, versionId])

  return useQuery({
    queryKey: ['obst-prev-manual-plu-set', previousId],
    queryFn: async (): Promise<Set<string> | null> => {
      if (!previousId) return null
      const rows = await queryRest<{ plu: string }[]>('master_plu_items', {
        select: 'plu',
        version_id: `eq.${previousId}`,
        is_manual_supplement: 'eq.true',
      })
      return new Set((rows ?? []).map((r) => r.plu))
    },
    enabled: !!versionId,
    staleTime: 60_000,
  })
}

/** Backshop: PLUs mit `source = manual` in der Vorversion. */
export function useBackshopPrevManualSupplementPluSet(versionId: string | undefined) {
  const { data: versions = [] } = useBackshopVersions()
  const previousId = useMemo(() => getPreviousVersionId(versions, versionId), [versions, versionId])

  return useQuery({
    queryKey: ['backshop-prev-manual-plu-set', previousId],
    queryFn: async (): Promise<Set<string> | null> => {
      if (!previousId) return null
      const rows = await queryRest<{ plu: string }[]>('backshop_master_plu_items', {
        select: 'plu',
        version_id: `eq.${previousId}`,
        source: 'eq.manual',
      })
      return new Set((rows ?? []).map((r) => r.plu))
    },
    enabled: !!versionId,
    staleTime: 60_000,
  })
}
