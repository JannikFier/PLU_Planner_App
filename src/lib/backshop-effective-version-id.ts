// Gleiche effektive Backshop-Version wie useActiveBackshopVersion: zuerst status=active, sonst neueste KW.

import { queryRest } from '@/lib/supabase'

export type BackshopEffectiveVersionResolution = 'active' | 'latest' | 'none'

export interface ResolveEffectiveBackshopVersionIdResult {
  versionId: string | null
  resolution: BackshopEffectiveVersionResolution
}

/**
 * Liefert die Backshop-Version-ID für Master-/Carryover-Auflösung (Listen, Produktgruppen).
 * Entspricht useActiveBackshopVersion: aktiv, sonst neueste Zeile nach Jahr + KW.
 */
export async function resolveEffectiveBackshopVersionId(
  signal?: AbortSignal,
): Promise<ResolveEffectiveBackshopVersionIdResult> {
  const active = await queryRest<Array<{ id: string }>>(
    'backshop_versions',
    {
      select: 'id',
      status: 'eq.active',
      limit: '1',
    },
    { signal },
  )
  if (active && active.length > 0) {
    return { versionId: active[0].id, resolution: 'active' }
  }

  const latest = await queryRest<Array<{ id: string }>>(
    'backshop_versions',
    {
      select: 'id',
      order: 'jahr.desc,kw_nummer.desc',
      limit: '1',
    },
    { signal },
  )
  if (latest && latest.length > 0) {
    return { versionId: latest[0].id, resolution: 'latest' }
  }
  return { versionId: null, resolution: 'none' }
}
