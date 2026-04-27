import { supabase } from '@/lib/supabase'

/**
 * Setzt profiles.current_store_id für RLS (get_current_store_id), bevor marktbezogene
 * Writes laufen. Ohne das kann UI-State und DB auseinanderlaufen (z. B. SessionStorage).
 */
export async function ensureProfileCurrentStoreId(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ current_store_id: storeId } as never)
    .eq('id', userId)

  if (error) throw error
}
