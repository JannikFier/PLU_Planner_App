// User-IDs für version_notifications / backshop_version_notifications:
// Marktzugang, ohne Uploader, ohne Viewer (Viewer sieht keine Glocke).

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lädt alle `user_id` mit Zugang zum Markt, die Benachrichtigungen erhalten sollen.
 * Schließt `excludeUserId` und Rollen `viewer` / `super_admin` aus (Super-Admin nutzt Vorschau-Rolle).
 */
export async function fetchStoreNotificationRecipientUserIds(
  supabase: SupabaseClient,
  storeId: string,
  excludeUserId: string,
): Promise<string[]> {
  const { data: accessRows, error: accessError } = await supabase
    .from('user_store_access')
    .select('user_id')
    .eq('store_id', storeId)
    .neq('user_id', excludeUserId)

  if (accessError || !accessRows?.length) {
    if (accessError && import.meta.env.DEV) {
      console.warn('user_store_access für Benachrichtigungen:', accessError.message)
    }
    return []
  }

  const candidateIds = [...new Set((accessRows as { user_id: string }[]).map((r) => r.user_id))]
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, role')
    .in('id', candidateIds)

  if (profError || !profiles) {
    if (profError && import.meta.env.DEV) console.warn('profiles für Benachrichtigungen:', profError.message)
    return []
  }

  return (profiles as { id: string; role: string }[])
    .filter((p) => p.role === 'admin' || p.role === 'user')
    .map((p) => p.id)
}
