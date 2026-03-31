// Hook: Backshop-Layout-Einstellungen laden + aktualisieren (pro Markt)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { BackshopLayoutSettings } from '@/types/database'
import type { Database } from '@/types/database'

type BackshopLayoutSettingsUpdate = Database['public']['Tables']['backshop_layout_settings']['Update']

/** Standard-Werte falls keine Backshop-Layout-Einstellungen in der DB vorhanden */
const DEFAULT_BACKSHOP_LAYOUT: BackshopLayoutSettings = {
  id: '',
  store_id: '',
  sort_mode: 'ALPHABETICAL',
  display_mode: 'MIXED',
  flow_direction: 'ROW_BY_ROW',
  font_header_px: 32,
  font_column_px: 18,
  font_product_px: 18,
  mark_red_kw_count: 2,
  mark_yellow_kw_count: 3,
  features_custom_products: true,
  features_hidden_items: true,
  features_blocks: true,
  features_keyword_rules: true,
  allow_mixed_mode: true,
  allow_separated_mode: true,
  page_break_per_block: false,
  updated_at: '',
  updated_by: null,
}

/**
 * Lädt die Backshop-Layout-Einstellungen fuer den aktuellen Markt.
 * Fallback: Default-Werte wenn keine Zeile gefunden wird.
 */
export function useBackshopLayoutSettings() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<BackshopLayoutSettings>({
    queryKey: ['backshop-layout-settings', currentStoreId],
    staleTime: 5 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return DEFAULT_BACKSHOP_LAYOUT
      const data = await queryRest<BackshopLayoutSettings[]>('backshop_layout_settings', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        limit: '1',
      })
      const arr = Array.isArray(data) ? data : []
      if (arr.length === 0) return { ...DEFAULT_BACKSHOP_LAYOUT, store_id: currentStoreId }
      return arr[0] as BackshopLayoutSettings
    },
  })
}

/**
 * Mutation zum Aktualisieren der Backshop-Layout-Einstellungen.
 * Nutzt die gecachte ID statt einen extra DB-Call.
 */
export function useUpdateBackshopLayoutSettings() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (updates: BackshopLayoutSettingsUpdate) => {
      if (!currentStoreId) {
        throw new Error('Kein Markt ausgewählt.')
      }

      const cached = queryClient.getQueryData<BackshopLayoutSettings>(['backshop-layout-settings', currentStoreId])
      const settingsId = cached?.id

      if (!settingsId) {
        throw new Error('Keine Backshop-Layout-Einstellungen im Cache gefunden')
      }

      const UPDATE_TIMEOUT_MS = 12_000
      const updatePromise = supabase
        .from('backshop_layout_settings')
        .update((updates as BackshopLayoutSettingsUpdate) as never)
        .eq('id', settingsId)
        .eq('store_id', currentStoreId)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Speichern hat zu lange gedauert. Bitte Seite neu laden und erneut versuchen.')), UPDATE_TIMEOUT_MS),
      )
      const { error } = await Promise.race([updatePromise, timeoutPromise])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-layout-settings', currentStoreId] })
    },
  })
}
