// Hook: Layout-Einstellungen laden + aktualisieren (pro Markt)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import { updateLayoutSettingsTableWithWeekColumnFallback } from '@/lib/supabase-layout-settings-update'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { LayoutSettings } from '@/types/database'
import type { Database } from '@/types/database'

type LayoutSettingsUpdate = Database['public']['Tables']['layout_settings']['Update']

/** Begrenzt Schriftgrößen auf gültige Bereiche (Header 10–50, Spalte 8–48, Produkt 6–24). 0 = leer → Standard. */
function clampFontUpdates(updates: LayoutSettingsUpdate): LayoutSettingsUpdate {
  const result = { ...updates }
  if (typeof updates.font_header_px === 'number') {
    result.font_header_px = updates.font_header_px < 10
      ? (updates.font_header_px === 0 ? 24 : 10)
      : Math.min(50, updates.font_header_px)
  }
  if (typeof updates.font_column_px === 'number') {
    result.font_column_px = updates.font_column_px < 8
      ? (updates.font_column_px === 0 ? 16 : 8)
      : Math.min(48, updates.font_column_px)
  }
  if (typeof updates.font_product_px === 'number') {
    result.font_product_px = updates.font_product_px < 6
      ? (updates.font_product_px === 0 ? 12 : 6)
      : Math.min(24, updates.font_product_px)
  }
  return result
}

/** Standard-Werte falls keine Einstellungen in der DB vorhanden */
const DEFAULT_LAYOUT: LayoutSettings = {
  id: '',
  store_id: '',
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
  show_week_mon_sat_in_labels: false,
  updated_at: '',
  updated_by: null,
}

/**
 * Lädt die Layout-Einstellungen fuer den aktuellen Markt.
 * Fallback: Default-Werte wenn keine Zeile gefunden wird.
 */
export function useLayoutSettings() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<LayoutSettings>({
    queryKey: ['layout-settings', currentStoreId],
    staleTime: 5 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async ({ signal }) => {
      if (!currentStoreId) return DEFAULT_LAYOUT
      const data = await queryRest<LayoutSettings[]>('layout_settings', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        limit: '1',
      }, { signal })
      const arr = Array.isArray(data) ? data : []
      if (arr.length === 0) return { ...DEFAULT_LAYOUT, store_id: currentStoreId }
      return arr[0] as LayoutSettings
    },
  })
}

/**
 * Mutation zum Aktualisieren der Layout-Einstellungen.
 * Nutzt die gecachte ID statt einen extra DB-Call.
 */
export function useUpdateLayoutSettings() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (updates: LayoutSettingsUpdate): Promise<{ omittedWeekColumnDueToSchema: boolean }> => {
      const clamped = clampFontUpdates(updates)

      if (!currentStoreId) {
        throw new Error('Kein Markt ausgewählt.')
      }

      let settingsId = queryClient.getQueryData<LayoutSettings>(['layout-settings', currentStoreId])?.id

      if (!settingsId) {
        const rows = await queryRest<LayoutSettings[]>('layout_settings', {
          select: 'id',
          store_id: `eq.${currentStoreId}`,
          limit: '1',
        })
        settingsId = rows?.[0]?.id
      }

      if (!settingsId) {
        throw new Error('Keine Layout-Einstellungen gefunden – bitte Seite neu laden.')
      }

      const UPDATE_TIMEOUT_MS = 12_000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS)

      try {
        const { omittedWeekColumnDueToSchema } = await updateLayoutSettingsTableWithWeekColumnFallback({
          table: 'layout_settings',
          updates: clamped as Record<string, unknown>,
          rowId: settingsId,
          storeId: currentStoreId,
          abortSignal: controller.signal,
        })
        return { omittedWeekColumnDueToSchema }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          throw new Error('Speichern hat zu lange gedauert. Bitte Seite neu laden und erneut versuchen.')
        }
        throw err
      } finally {
        clearTimeout(timeoutId)
      }
    },
    onMutate: async (updates) => {
      // Optimistisch: Cache sofort mit begrenzten Werten aktualisieren
      const clamped = clampFontUpdates(updates)
      const previous = queryClient.getQueryData<LayoutSettings>(['layout-settings', currentStoreId])
      if (previous && clamped && currentStoreId) {
        queryClient.setQueryData<LayoutSettings>(['layout-settings', currentStoreId], {
          ...previous,
          ...clamped,
          updated_at: new Date().toISOString(),
        })
      }
      return { previous }
    },
    onSuccess: (result, updates) => {
      const clamped = clampFontUpdates(updates)
      const current = queryClient.getQueryData<LayoutSettings>(['layout-settings', currentStoreId])
      if (current && clamped && currentStoreId) {
        let next: LayoutSettings = {
          ...current,
          ...clamped,
          updated_at: new Date().toISOString(),
        }
        if (result.omittedWeekColumnDueToSchema) {
          next = { ...next, show_week_mon_sat_in_labels: false }
        }
        queryClient.setQueryData<LayoutSettings>(['layout-settings', currentStoreId], next)
      }
    },
    onError: (_err, _updates, context) => {
      // Bei Fehler: vorherigen Zustand wiederherstellen
      if (context?.previous && currentStoreId) {
        queryClient.setQueryData(['layout-settings', currentStoreId], context.previous)
      }
    },
  })
}
