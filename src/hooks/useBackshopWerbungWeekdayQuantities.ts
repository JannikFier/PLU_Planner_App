// Marktbezogene Bestellmengen Mo–Sa zur Backshop-KW-Werbung

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { BackshopWerbungWeekdayQuantity } from '@/types/database'

/** Nach sessionStorage-Persist kein `Map` mehr (JSON) → vor Verwendung wiederherstellen. */
function toWeekdayQuantitiesMap(
  data: unknown,
): Map<string, BackshopWerbungWeekdayQuantity> {
  if (data == null) return new Map()
  if (data instanceof Map) {
    return data as Map<string, BackshopWerbungWeekdayQuantity>
  }
  if (typeof data === 'object') {
    return new Map(
      Object.entries(data as Record<string, BackshopWerbungWeekdayQuantity>),
    )
  }
  return new Map()
}

export function useBackshopWerbungWeekdayQuantitiesMap(
  kw: number | null,
  jahr: number | null,
  enabled = true,
) {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-werbung-weekday', currentStoreId, kw, jahr],
    enabled: enabled && !!currentStoreId && kw != null && jahr != null && Number.isFinite(kw) && Number.isFinite(jahr),
    staleTime: 30_000,
    queryFn: async (): Promise<Map<string, BackshopWerbungWeekdayQuantity>> => {
      if (!currentStoreId || kw == null || jahr == null) return new Map()
      const rows = await queryRest<BackshopWerbungWeekdayQuantity[]>(
        'backshop_werbung_weekday_quantities',
        {
          select: '*',
          store_id: `eq.${currentStoreId}`,
          kw_nummer: `eq.${kw}`,
          jahr: `eq.${jahr}`,
        },
      )
      return new Map((rows ?? []).map((r) => [r.plu, r]))
    },
    select: (data) => toWeekdayQuantitiesMap(data),
  })
}

export type WeekdayQtyPayload = {
  kw_nummer: number
  jahr: number
  plu: string
  qty_mo?: number | null
  qty_di?: number | null
  qty_mi?: number | null
  qty_do?: number | null
  qty_fr?: number | null
  qty_sa?: number | null
}

export function useUpsertBackshopWerbungWeekdayQuantities() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (payload: WeekdayQtyPayload) => {
      if (!currentStoreId) throw new Error('Kein Markt')
      if (!user) throw new Error('Nicht eingeloggt')
      const row = {
        store_id: currentStoreId,
        kw_nummer: payload.kw_nummer,
        jahr: payload.jahr,
        plu: payload.plu,
        qty_mo: payload.qty_mo ?? null,
        qty_di: payload.qty_di ?? null,
        qty_mi: payload.qty_mi ?? null,
        qty_do: payload.qty_do ?? null,
        qty_fr: payload.qty_fr ?? null,
        qty_sa: payload.qty_sa ?? null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('backshop_werbung_weekday_quantities')
        .upsert(row as never, {
          onConflict: 'store_id,kw_nummer,jahr,plu',
        })
      if (error) throw error
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['backshop-werbung-weekday', currentStoreId, payload.kw_nummer, payload.jahr],
      })
    },
  })
}
