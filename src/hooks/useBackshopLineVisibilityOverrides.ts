// Markt: Master-Zeilen (PLU + Quelle) per force_show / force_hide in der Backshop-Liste steuern.

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { BackshopSource } from '@/types/database'
import type { Database } from '@/types/database'

export type BackshopLineVisibilityOverrideRow =
  Database['public']['Tables']['backshop_store_line_visibility_overrides']['Row']

export function useBackshopLineVisibilityOverrides() {
  const { currentStoreId } = useCurrentStore()

  const query = useQuery({
    queryKey: ['backshop-line-visibility-overrides', currentStoreId ?? '__none__'],
    enabled: !!currentStoreId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_store_line_visibility_overrides')
        .select('*')
        .eq('store_id', currentStoreId!)
      if (error) throw error
      return (data ?? []) as BackshopLineVisibilityOverrideRow[]
    },
    staleTime: 60_000,
  })

  const { lineForceShowKeys, lineForceHideKeys } = useMemo(() => {
    const show = new Set<string>()
    const hide = new Set<string>()
    for (const r of query.data ?? []) {
      const k = `${r.plu}|${r.source as BackshopSource}`
      if (r.mode === 'force_show') show.add(k)
      else hide.add(k)
    }
    return { lineForceShowKeys: show, lineForceHideKeys: hide }
  }, [query.data])

  return {
    ...query,
    lineForceShowKeys,
    lineForceHideKeys,
  }
}

export function useUpsertBackshopLineVisibilityOverride() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      plu: string
      source: BackshopSource
      mode: 'force_show' | 'force_hide'
      silentToast?: boolean
    }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { error } = await supabase.from('backshop_store_line_visibility_overrides').upsert(
        {
          store_id: currentStoreId,
          plu: input.plu,
          source: input.source,
          mode: input.mode,
          created_by: user?.id ?? null,
        } as Database['public']['Tables']['backshop_store_line_visibility_overrides']['Insert'] as never,
        { onConflict: 'store_id,plu,source' },
      )
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['backshop-line-visibility-overrides'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      if (vars.silentToast) return
      if (vars.mode === 'force_show') {
        toast.success('Zeile wird in der Hauptliste angezeigt.')
      } else {
        toast.success('Sichtbarkeit gespeichert.')
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    },
  })
}

export function useDeleteBackshopLineVisibilityOverride() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (input: { plu: string; source: BackshopSource }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { error } = await supabase
        .from('backshop_store_line_visibility_overrides')
        .delete()
        .eq('store_id', currentStoreId)
        .eq('plu', input.plu)
        .eq('source', input.source)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-line-visibility-overrides'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
    },
  })
}
