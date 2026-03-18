import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StoreListVisibility, UserListVisibility } from '@/types/database'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useAuth } from '@/hooks/useAuth'

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
