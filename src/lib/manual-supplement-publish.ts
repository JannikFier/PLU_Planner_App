// Hilfsfunktionen beim Excel-Publish: manuelle Supplemente der Vorgänger-Version entfernen,
// wenn dieselbe PLU in der neu veröffentlichten Masterliste vorkommt.

import type { SupabaseClient } from '@supabase/supabase-js'

const PLU_CHUNK = 200

async function deleteInChunks(
  supabase: SupabaseClient,
  table: 'master_plu_items' | 'backshop_master_plu_items',
  versionId: string,
  plus: string[],
): Promise<void> {
  if (!versionId || plus.length === 0) return
  const unique = [...new Set(plus)]
  for (let i = 0; i < unique.length; i += PLU_CHUNK) {
    const slice = unique.slice(i, i + PLU_CHUNK)
    const q = supabase.from(table).delete().eq('version_id', versionId).eq('is_manual_supplement', true).in('plu', slice)
    const { error } = await q
    if (error) throw new Error(`${table}: Supplemente bereinigen fehlgeschlagen: ${error.message}`)
  }
}

/** Obst: Frozen-Vorgänger – manuelle Supplemente löschen, wenn PLU in der neuen Liste ist. */
export async function reconcileObstManualSupplementsAfterPublish(
  supabase: SupabaseClient,
  previousActiveVersionId: string | null,
  newMasterPluList: string[],
): Promise<void> {
  if (!previousActiveVersionId) return
  await deleteInChunks(supabase, 'master_plu_items', previousActiveVersionId, newMasterPluList)
}

/** Backshop: analog über alle Quellen der neuen Version. */
export async function reconcileBackshopManualSupplementsAfterPublish(
  supabase: SupabaseClient,
  previousActiveVersionId: string | null,
  newMasterPluList: string[],
): Promise<void> {
  if (!previousActiveVersionId) return
  await deleteInChunks(supabase, 'backshop_master_plu_items', previousActiveVersionId, newMasterPluList)
}
