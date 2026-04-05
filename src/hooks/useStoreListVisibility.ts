import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StoreListVisibility, UserListVisibility } from '@/types/database'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useAuth } from '@/hooks/useAuth'

/** list_type-Werte in store_list_visibility / user_list_visibility */
export const LIST_TYPE_OBST_GEMUESE = 'obst_gemuese' as const
export const LIST_TYPE_BACKSHOP = 'backshop' as const
export type ListTypeKey = typeof LIST_TYPE_OBST_GEMUESE | typeof LIST_TYPE_BACKSHOP

function rowVisible(
  rows: StoreListVisibility[] | UserListVisibility[] | undefined,
  listType: string,
): boolean {
  return rows?.find((v) => v.list_type === listType)?.is_visible ?? true
}

export function useStoreListVisibility(storeId?: string) {
  const { currentStoreId } = useCurrentStore()
  const effectiveStoreId = storeId ?? currentStoreId

  return useQuery({
    queryKey: ['store-list-visibility', effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) throw new Error('Kein Markt ausgewählt.')
      const { data, error } = await supabase
        .from('store_list_visibility' as never)
        .select('*')
        .eq('store_id', effectiveStoreId)
      if (error) throw error
      return data as unknown as StoreListVisibility[]
    },
    enabled: !!effectiveStoreId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useIsListVisible(listType: string) {
  const { data: visibility } = useStoreListVisibility()
  const entry = visibility?.find(v => v.list_type === listType)
  return entry?.is_visible ?? true
}

export function useUpdateStoreListVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { storeId: string; listType: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('store_list_visibility' as never)
        .update({ is_visible: params.isVisible } as never)
        .eq('store_id', params.storeId)
        .eq('list_type', params.listType)
      if (error) throw error
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['store-list-visibility', params.storeId] })
      toast.success('Listen-Sichtbarkeit wurde aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Per-User Bereichs-Sichtbarkeit ───

/** Lädt die Bereichs-Sichtbarkeit für den aktuell eingeloggten User im aktuellen Store */
export function useUserListVisibility() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['user-list-visibility', user?.id, currentStoreId],
    queryFn: async () => {
      if (!user || !currentStoreId) throw new Error('Nicht eingeloggt oder kein Markt ausgewählt.')
      const { data, error } = await supabase
        .from('user_list_visibility' as never)
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', currentStoreId)
      if (error) throw error
      return data as unknown as UserListVisibility[]
    },
    enabled: !!user?.id && !!currentStoreId,
    staleTime: 5 * 60_000,
  })
}

/** Prüft ob ein bestimmter Bereich für den aktuellen User sichtbar ist (Default: true) */
export function useIsUserListVisible(listType: string) {
  const { data: visibility } = useUserListVisibility()
  const entry = visibility?.find(v => v.list_type === listType)
  return entry?.is_visible ?? true
}

/**
 * Kombiniert Markt- und User-Sichtbarkeit: sichtbar nur wenn beide true (kein Eintrag = true).
 * Ohne currentStoreId: beide Anteile als true (globale Super-Admin-Arbeit ohne Marktkontext).
 */
export function useEffectiveListVisibility() {
  const { currentStoreId } = useCurrentStore()
  const { user } = useAuth()
  const storeQ = useStoreListVisibility()
  const userQ = useUserListVisibility()

  const hasStoreContext = Boolean(currentStoreId && user?.id)
  const storeLoading = Boolean(currentStoreId && storeQ.isLoading)
  const userLoading = Boolean(currentStoreId && user?.id && userQ.isLoading)
  const isLoading = storeLoading || userLoading

  const result = useMemo(() => {
    if (!currentStoreId) {
      return { obstGemuese: true, backshop: true }
    }
    const s = storeQ.data
    const u = userQ.data
    const storeObst = rowVisible(s, LIST_TYPE_OBST_GEMUESE)
    const storeBack = rowVisible(s, LIST_TYPE_BACKSHOP)
    const userObst = u ? rowVisible(u, LIST_TYPE_OBST_GEMUESE) : true
    const userBack = u ? rowVisible(u, LIST_TYPE_BACKSHOP) : true
    return {
      obstGemuese: storeObst && userObst,
      backshop: storeBack && userBack,
    }
  }, [currentStoreId, storeQ.data, userQ.data])

  return {
    obstGemuese: result.obstGemuese,
    backshop: result.backshop,
    isLoading: hasStoreContext ? isLoading : false,
  }
}

/** Nur Markt-Ebene (Schalter in Benutzerverwaltung deaktivieren, wenn Super-Admin Bereich am Markt aus hat) */
export function useStoreListAreaEnabled(storeId: string | undefined) {
  const storeQ = useStoreListVisibility(storeId)
  const isLoading = Boolean(storeId && storeQ.isLoading)
  const result = useMemo(() => {
    if (!storeId) return { obstGemuese: true, backshop: true }
    const s = storeQ.data
    return {
      obstGemuese: rowVisible(s, LIST_TYPE_OBST_GEMUESE),
      backshop: rowVisible(s, LIST_TYPE_BACKSHOP),
    }
  }, [storeId, storeQ.data])
  return { ...result, isLoading }
}

/** Lädt die Bereichs-Sichtbarkeit für einen bestimmten User (Admin-Ansicht) */
export function useUserListVisibilityForUser(userId?: string, storeId?: string) {
  return useQuery({
    queryKey: ['user-list-visibility', userId, storeId],
    queryFn: async () => {
      if (!userId || !storeId) throw new Error('Benutzer oder Markt nicht angegeben.')
      const { data, error } = await supabase
        .from('user_list_visibility' as never)
        .select('*')
        .eq('user_id', userId)
        .eq('store_id', storeId)
      if (error) throw error
      return data as unknown as UserListVisibility[]
    },
    enabled: !!userId && !!storeId,
    staleTime: 2 * 60 * 1000,
  })
}

/** Setzt die Bereichs-Sichtbarkeit für einen User (Upsert) */
export function useUpdateUserListVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { userId: string; storeId: string; listType: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('user_list_visibility' as never)
        .upsert(
          {
            user_id: params.userId,
            store_id: params.storeId,
            list_type: params.listType,
            is_visible: params.isVisible,
          } as never,
          { onConflict: 'user_id,store_id,list_type' } as never,
        )
      if (error) throw error
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['user-list-visibility', params.userId, params.storeId] })
      toast.success('Bereichs-Sichtbarkeit aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
