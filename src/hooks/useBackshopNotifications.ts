// Backshop-Benachrichtigungen: backshop_version_notifications, neue/geänderte Backshop-Items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { count, error } = await supabase
        .from('backshop_master_plu_items')
        .select('*', { count: 'exact', head: true })
        .eq('version_id', activeVersion.id)
        .in('status', ['NEW_PRODUCT_YELLOW', 'PLU_CHANGED_RED'])
      if (error) throw error
      return count ?? 0
    },
    enabled: !!activeVersion?.id,
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
        if (!user) return 0
        const { count, error } = await supabase
          .from('backshop_version_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('store_id', currentStoreId!)
        if (error) throw error
        return count ?? 0
      }),
    enabled: !!user && !!currentStoreId,
    refetchInterval: 30000,
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
        .eq('store_id', currentStoreId!)
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
      const { data, error } = await supabase
        .from('backshop_master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .eq('status', 'NEW_PRODUCT_YELLOW')
        .order('system_name')
      if (error) throw error
      return (data ?? []) as BackshopMasterPLUItem[]
    },
    enabled: !!versionId,
  })
}

/** Geänderte PLUs einer Backshop-Version (PLU_CHANGED_RED) */
export function useBackshopChangedProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['backshop-changed-products', versionId],
    queryFn: async () => {
      if (!versionId) return []
      const { data, error } = await supabase
        .from('backshop_master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .eq('status', 'PLU_CHANGED_RED')
        .order('system_name')
      if (error) throw error
      return (data ?? []) as BackshopMasterPLUItem[]
    },
    enabled: !!versionId,
  })
}
