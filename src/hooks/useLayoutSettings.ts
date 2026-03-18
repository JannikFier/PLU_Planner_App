// Hook: Layout-Einstellungen laden + aktualisieren (Singleton)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest } from '@/lib/supabase'
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
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const data = await queryRest<LayoutSettings[]>('layout_settings', {
        select: '*',
        limit: '1',
      }, { signal })
      const arr = Array.isArray(data) ? data : []
      if (arr.length === 0) return DEFAULT_LAYOUT
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

  return useMutation({
    mutationFn: async (updates: LayoutSettingsUpdate) => {
      const clamped = clampFontUpdates(updates)

      let settingsId = queryClient.getQueryData<LayoutSettings>(['layout-settings'])?.id

      if (!settingsId) {
        const rows = await queryRest<LayoutSettings[]>('layout_settings', {
          select: 'id',
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
        const { error } = await supabase
          .from('layout_settings')
          .update((clamped as LayoutSettingsUpdate) as never)
          .eq('id', settingsId)
          .abortSignal(controller.signal)
        if (error) throw error
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
      const previous = queryClient.getQueryData<LayoutSettings>(['layout-settings'])
      if (previous && clamped) {
        queryClient.setQueryData<LayoutSettings>(['layout-settings'], {
          ...previous,
          ...clamped,
          updated_at: new Date().toISOString(),
        })
      }
      return { previous }
    },
    onSuccess: (_data, updates) => {
      const clamped = clampFontUpdates(updates)
      const current = queryClient.getQueryData<LayoutSettings>(['layout-settings'])
      if (current && clamped) {
        queryClient.setQueryData<LayoutSettings>(['layout-settings'], {
          ...current,
          ...clamped,
          updated_at: new Date().toISOString(),
        })
      }
    },
    onError: (_err, _updates, context) => {
      // Bei Fehler: vorherigen Zustand wiederherstellen
      if (context?.previous) {
        queryClient.setQueryData(['layout-settings'], context.previous)
      }
    },
  })
}
