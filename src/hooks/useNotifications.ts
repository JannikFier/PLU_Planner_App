// Benachrichtigungen: Version-Notifications (gelesen/ungelesen)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, queryRestCount } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { toast } from 'sonner'
import type { Database, VersionNotification, MasterPLUItem } from '@/types/database'

/** Anzahl neuer + geänderter Produkte in der aktiven Version (für Badge) */
export function useActiveVersionChangeCount() {
  const { data: activeVersion } = useActiveVersion()

  return useQuery({
    queryKey: ['active-version-change-count', activeVersion?.id],
    queryFn: async () => {
      if (!activeVersion?.id) return 0
      return queryRestCount('master_plu_items', {
        select: '*',
        version_id: `eq.${activeVersion.id}`,
        status: 'in.(NEW_PRODUCT_YELLOW,PLU_CHANGED_RED)',
      })
    },
    enabled: !!activeVersion?.id,
    staleTime: 30 * 1000,
  })
}

/** Notification für aktuellen User + Version laden */
export function useVersionNotification(versionId: string | undefined) {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['version-notification', versionId, currentStoreId],
    queryFn: async () => {
      if (!user || !versionId) return null

      if (!currentStoreId) return null
      const data = await queryRest<VersionNotification[]>('version_notifications', {
        select: '*',
        user_id: `eq.${user.id}`,
        version_id: `eq.${versionId}`,
        store_id: `eq.${currentStoreId}`,
        limit: '1',
      })
      const arr = Array.isArray(data) ? data : []
      return (arr[0] ?? null) as VersionNotification | null
    },
    enabled: !!user && !!versionId && !!currentStoreId,
    staleTime: 30 * 1000,
  })
}

/** Anzahl ungelesener Notifications für aktuellen User */
export function useUnreadNotificationCount() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['notification-count', currentStoreId],
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!user || !currentStoreId) return 0
        return queryRestCount('version_notifications', {
          select: '*',
          user_id: `eq.${user.id}`,
          is_read: 'eq.false',
          store_id: `eq.${currentStoreId}`,
        })
      }),
    enabled: !!user && !!currentStoreId,
    refetchInterval: 30000,
    staleTime: 30 * 1000,
  })
}

/** Notification als gelesen markieren */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      const { error } = await supabase
        .from('version_notifications')
        .update(
        ({
          is_read: true,
          read_at: new Date().toISOString(),
        } as Database['public']['Tables']['version_notifications']['Update']) as never
      )
        .eq('user_id', user.id)
        .eq('version_id', versionId)
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onSuccess: (_, versionId) => {
      queryClient.invalidateQueries({ queryKey: ['version-notification', versionId, currentStoreId] })
      queryClient.invalidateQueries({ queryKey: ['notification-count', currentStoreId] })
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Alle ungelesenen Notifications für den aktuellen User laden */
export function useUnreadNotifications() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['unread-notifications', currentStoreId],
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!user || !currentStoreId) return []
        const data = await queryRest<unknown[]>('version_notifications', {
          select: '*,versions:version_id(id,kw_nummer,jahr,kw_label,status)',
          user_id: `eq.${user.id}`,
          is_read: 'eq.false',
          store_id: `eq.${currentStoreId}`,
          order: 'created_at.desc',
        })
        return Array.isArray(data) ? data : []
      }),
    enabled: !!user && !!currentStoreId,
    staleTime: 30 * 1000,
  })
}

/** Neue Produkte einer Version laden (status = NEW_PRODUCT_YELLOW) */
export function useNewProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['new-products', versionId],
    queryFn: async () => {
      if (!versionId) return []

      const data = await queryRest<MasterPLUItem[]>('master_plu_items', {
        select: '*',
        version_id: `eq.${versionId}`,
        status: 'eq.NEW_PRODUCT_YELLOW',
        order: 'system_name.asc',
      })
      return data ?? []
    },
    enabled: !!versionId,
    staleTime: 30 * 1000,
  })
}

/** Geänderte PLUs einer Version laden (status = PLU_CHANGED_RED) */
export function useChangedProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['changed-products', versionId],
    queryFn: async () => {
      if (!versionId) return []

      const data = await queryRest<MasterPLUItem[]>('master_plu_items', {
        select: '*',
        version_id: `eq.${versionId}`,
        status: 'eq.PLU_CHANGED_RED',
        order: 'system_name.asc',
      })
      return data ?? []
    },
    enabled: !!versionId,
    staleTime: 30 * 1000,
  })
}
