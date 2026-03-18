// Backshop-Benachrichtigungen: backshop_version_notifications, neue/geänderte Backshop-Items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, queryRestCount } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { toast } from 'sonner'
import type { Database, BackshopMasterPLUItem } from '@/types/database'

/** Anzahl neuer + geänderter Produkte in der aktiven Backshop-Version (für Badge) */
export function useBackshopActiveVersionChangeCount() {
  const { data: activeVersion } = useActiveBackshopVersion()

  return useQuery({
    queryKey: ['backshop-active-version-change-count', activeVersion?.id],
    queryFn: async () => {
      if (!activeVersion?.id) return 0
      return queryRestCount('backshop_master_plu_items', {
        select: '*',
        version_id: `eq.${activeVersion.id}`,
        status: 'in.(NEW_PRODUCT_YELLOW,PLU_CHANGED_RED)',
      })
    },
    enabled: !!activeVersion?.id,
    staleTime: 30 * 1000,
  })
}

/** Anzahl ungelesener Backshop-Notifications für aktuellen User */
export function useBackshopUnreadNotificationCount() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-notification-count', currentStoreId],
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!user || !currentStoreId) return 0
        return queryRestCount('backshop_version_notifications', {
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

/** Backshop-Notification als gelesen markieren */
export function useBackshopMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { error } = await supabase
        .from('backshop_version_notifications')
        .update(
        ({
          is_read: true,
          read_at: new Date().toISOString(),
        } as Database['public']['Tables']['backshop_version_notifications']['Update']) as never
        )
        .eq('user_id', user.id)
        .eq('version_id', versionId)
        .eq('store_id', currentStoreId)
      if (error) throw error
    },
    onSuccess: (_, versionId) => {
      queryClient.invalidateQueries({ queryKey: ['backshop-notification-count', currentStoreId] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version-notification', versionId, currentStoreId] })
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}

/** Neue Produkte einer Backshop-Version (NEW_PRODUCT_YELLOW) */
export function useBackshopNewProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['backshop-new-products', versionId],
    queryFn: async () => {
      if (!versionId) return []
      const data = await queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
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

/** Geänderte PLUs einer Backshop-Version (PLU_CHANGED_RED) */
export function useBackshopChangedProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['backshop-changed-products', versionId],
    queryFn: async () => {
      if (!versionId) return []
      const data = await queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
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
