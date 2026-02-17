// Sicherstellen, dass genau eine Version status = 'active' hat (die neueste)

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface VersionLike {
  id: string
  status: string
  jahr?: number
  kw_nummer?: number
}

/**
 * Wenn unter den Versionen keine mit status 'active' ist, wird die neueste
 * (erste nach Sortierung jahr/kw_nummer absteigend) auf 'active' gesetzt.
 * Sollte nur aufgerufen werden, wenn versions bereits so sortiert sind.
 */
export async function ensureActiveVersion(versions: VersionLike[]): Promise<boolean> {
  if (versions.length === 0) return false
  const hasActive = versions.some((v) => v.status === 'active')
  if (hasActive) return false

  const newest = versions[0]
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('versions')
    .update({
      status: 'active',
      published_at: now,
    } as Database['public']['Tables']['versions']['Update'] as never)
    .eq('id', newest.id)

  if (updateError) {
    throw new Error(`Aktive Version setzen fehlgeschlagen: ${updateError.message}`)
  }
  return true
}
