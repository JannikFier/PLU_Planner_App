import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invokeEdgeFunction, queryRest, mutateRest } from '@/lib/supabase'
import { toast } from 'sonner'
import type { UserStoreAccess, Profile } from '@/types/database'

/** Fehlermeldungen von user_store_access in verstaendliche Texte uebersetzen */
function translateStoreAccessError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('gleichen firma') || lower.includes('same company')) {
    return 'Benutzer kann nur Märkten der gleichen Firma zugewiesen werden.'
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint') || lower.includes('already exists')) {
    return 'Dieser Benutzer ist diesem Markt bereits zugewiesen.'
  }
  return msg
}

export function useStoreAccessByStore(storeId: string | undefined) {
  return useQuery({
    queryKey: ['store-access', storeId],
    queryFn: async () => {
      if (!storeId) throw new Error('Kein Markt angegeben.')
      return queryRest<UserStoreAccess[]>('user_store_access', {
        select: '*',
        store_id: `eq.${storeId}`,
      })
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Profile-Daten aller Nutzer die diesem Store zugewiesen sind. */
export function useStoreUserProfiles(storeId: string | undefined) {
  return useQuery({
    queryKey: ['store-user-profiles', storeId],
    queryFn: async () => {
      if (!storeId) throw new Error('Kein Markt angegeben.')
      const rows = await queryRest<{ user_id: string; is_home_store: boolean }[]>(
        'user_store_access',
        { select: 'user_id,is_home_store', store_id: `eq.${storeId}` },
      )
      if (!rows.length) return []

      const userIds = rows.map(r => r.user_id)
      const profiles = await queryRest<Profile[]>(
        'profiles',
        { select: '*', id: `in.(${userIds.join(',')})`, order: 'display_name' },
      )

      const homeMap = new Map(rows.map(r => [r.user_id, r.is_home_store]))
      return profiles
        .filter(p => p.role !== 'super_admin')
        .map(p => ({ ...p, isHomeStore: homeMap.get(p.id) ?? false }))
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useStoreAccessByUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['store-access', 'user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Kein Benutzer angegeben.')
      return queryRest<UserStoreAccess[]>('user_store_access', {
        select: '*',
        user_id: `eq.${userId}`,
      })
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateUserStoreAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { userId: string; homeStoreId: string; additionalStoreIds: string[] }) => {
      await invokeEdgeFunction('update-user-store-access', {
        user_id: params.userId,
        home_store_id: params.homeStoreId,
        additional_store_ids: params.additionalStoreIds,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-access'] })
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['company-profiles'] })
      toast.success('Marktzuweisung wurde aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAddUserToStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { userId: string; storeId: string; isHomeStore?: boolean }) => {
      await mutateRest('POST', 'user_store_access', {
        body: {
          user_id: params.userId,
          store_id: params.storeId,
          is_home_store: params.isHomeStore ?? false,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-access'] })
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['company-profiles'] })
      toast.success('Benutzer wurde dem Markt zugewiesen.')
    },
    onError: (e: Error) => toast.error(translateStoreAccessError(e.message)),
  })
}

export function useRemoveUserFromStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { userId: string; storeId: string }) => {
      await mutateRest('DELETE', 'user_store_access', {
        params: {
          user_id: `eq.${params.userId}`,
          store_id: `eq.${params.storeId}`,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-access'] })
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['company-profiles'] })
      toast.success('Benutzer wurde vom Markt entfernt.')
    },
    onError: (e: Error) => toast.error(translateStoreAccessError(e.message)),
  })
}
