// Hilfsfunktion: Layout-Zeilen updaten; bei fehlender Spalte show_week_mon_sat_in_labels (Migration noch nicht auf Remote) einmal ohne diese Spalte wiederholen.

import { supabase } from '@/lib/supabase'

const WEEK_COL = 'show_week_mon_sat_in_labels'

/**
 * PATCH auf layout_settings / backshop_layout_settings.
 * PGRST204 „Spalte nicht im Schema“ für WEEK_COL → Retry ohne diese Keys.
 */
export async function updateLayoutSettingsTableWithWeekColumnFallback(options: {
  table: 'layout_settings' | 'backshop_layout_settings'
  updates: Record<string, unknown>
  rowId: string
  storeId: string
  abortSignal?: AbortSignal
}): Promise<{ omittedWeekColumnDueToSchema: boolean }> {
  const { table, updates, rowId, storeId, abortSignal } = options

  let q = supabase.from(table).update(updates as never).eq('id', rowId).eq('store_id', storeId)
  if (abortSignal) q = q.abortSignal(abortSignal)
  const { error } = await q
  if (!error) {
    return { omittedWeekColumnDueToSchema: false }
  }

  const code = (error as { code?: string }).code
  const msg = String(error.message ?? '')
  if (code !== 'PGRST204' || !msg.includes(WEEK_COL) || !(WEEK_COL in updates)) {
    throw error
  }

  const rest = { ...updates }
  delete rest[WEEK_COL]
  let q2 = supabase.from(table).update(rest as never).eq('id', rowId).eq('store_id', storeId)
  if (abortSignal) q2 = q2.abortSignal(abortSignal)
  const { error: err2 } = await q2
  if (err2) throw err2
  return { omittedWeekColumnDueToSchema: true }
}
