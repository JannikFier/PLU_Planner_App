import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Zeile in store_kiosk_registers – Kassen-Slot am Markt mit zugehörigem Auth-User */
export type KioskRegister = {
  id: string
  store_id: string
  sort_order: number
  display_label: string
  auth_user_id: string
  active: boolean
  created_at: string
}

export function kioskRegistersQueryKey(storeId: string | undefined) {
  return ['kiosk-registers', storeId] as const
}

/**
 * Kassen-Register eines Marktes (gleicher Query-Key wie im Kassenmodus für Cache-Sharing).
 */
export function useStoreKioskRegisters(storeId: string | undefined) {
  return useQuery({
    queryKey: kioskRegistersQueryKey(storeId),
    queryFn: async () => {
      if (!storeId) throw new Error('Kein Markt')
      const { data, error } = await supabase
        .from('store_kiosk_registers')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as KioskRegister[]
    },
    enabled: !!storeId,
  })
}
