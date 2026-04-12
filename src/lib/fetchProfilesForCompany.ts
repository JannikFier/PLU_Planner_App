import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

/**
 * Alle Profile von Nutzern, die mindestens einem Markt dieser Firma zugewiesen sind
 * (über user_store_access). Entspricht der Firmen-Sicht in der Benutzerverwaltung.
 * Sortierung: Anzeigename (wie bisher im Markt-Detail-Dialog).
 */
export async function fetchProfilesForCompany(companyId: string): Promise<Profile[]> {
  const { data: companyStores, error: storesErr } = await supabase
    .from('stores' as never)
    .select('id')
    .eq('company_id', companyId)
  if (storesErr) throw storesErr
  const storeIds = (companyStores as unknown as { id: string }[]).map(s => s.id)
  if (storeIds.length === 0) return []

  const { data: access, error: accessErr } = await supabase
    .from('user_store_access' as never)
    .select('user_id')
    .in('store_id', storeIds)
  if (accessErr) throw accessErr
  const userIds = [...new Set((access as unknown as { user_id: string }[]).map(a => a.user_id))]
  if (userIds.length === 0) return []

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)
    .order('display_name')
  if (profilesErr) throw profilesErr
  return profiles as Profile[]
}
