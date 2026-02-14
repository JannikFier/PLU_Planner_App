// Hook: Layout-Einstellungen laden + aktualisieren (Singleton)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LayoutSettings } from '@/types/database'
import type { Database } from '@/types/database'

type LayoutSettingsUpdate = Database['public']['Tables']['layout_settings']['Update']

/** Standard-Werte falls keine Einstellungen in der DB vorhanden */
const DEFAULT_LAYOUT: LayoutSettings = {
  id: '',
  sort_mode: 'ALPHABETICAL',
  display_mode: 'MIXED',
  flow_direction: 'ROW_BY_ROW',
  font_header_px: 24,
  font_column_px: 16,
  font_product_px: 12,
  mark_red_kw_count: 2,
  mark_yellow_kw_count: 3,
  features_custom_products: true,
  features_hidden_items: true,
  features_blocks: true,
  features_keyword_rules: true,
  allow_mixed_mode: true,
  allow_separated_mode: true,
  updated_at: '',
  updated_by: null,
}

/**
 * Lädt die Layout-Einstellungen (Singleton-Tabelle, nur 1 Zeile).
 * Fallback: Default-Werte wenn keine Zeile gefunden wird.
 */
export function useLayoutSettings() {
  return useQuery<LayoutSettings>({
    queryKey: ['layout-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layout_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        return DEFAULT_LAYOUT
      }

      return data as LayoutSettings
    },
  })
}

/**
 * Mutation zum Aktualisieren der Layout-Einstellungen.
 * Nutzt die gecachte ID statt einen extra DB-Call.
 */
export function useUpdateLayoutSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: LayoutSettingsUpdate) => {
      // ID aus dem Query-Cache nehmen statt extra DB-Call
      const cached = queryClient.getQueryData<LayoutSettings>(['layout-settings'])
      const settingsId = cached?.id

      if (!settingsId) {
        throw new Error('Keine Layout-Einstellungen im Cache gefunden')
      }

      const UPDATE_TIMEOUT_MS = 12_000
      const updatePromise = supabase
        .from('layout_settings')
        .update(updates as never)
        .eq('id', settingsId)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Speichern hat zu lange gedauert. Bitte Seite neu laden und erneut versuchen.')), UPDATE_TIMEOUT_MS)
      )
      const { error } = await Promise.race([updatePromise, timeoutPromise])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-settings'] })
    },
  })
}
