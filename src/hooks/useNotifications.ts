// Benachrichtigungen: Version-Notifications (gelesen/ungelesen)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { useAuth } from '@/hooks/useAuth'
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
      const { count, error } = await supabase
        .from('master_plu_items')
        .select('*', { count: 'exact', head: true })
        .eq('version_id', activeVersion.id)
        .in('status', ['NEW_PRODUCT_YELLOW', 'PLU_CHANGED_RED'])
      if (error) throw error
      return count ?? 0
    },
    enabled: !!activeVersion?.id,
  })
}

/** Notification für aktuellen User + Version laden */
export function useVersionNotification(versionId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['version-notification', versionId],
    queryFn: async () => {
      if (!user || !versionId) return null

      const { data, error } = await supabase
        .from('version_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('version_id', versionId)
        .maybeSingle()

      if (error) throw error
      return (data ?? null) as VersionNotification | null
    },
    enabled: !!user && !!versionId,
  })
}

/** Anzahl ungelesener Notifications für aktuellen User */
export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notification-count'],
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!user) return 0
        const { count, error } = await supabase
          .from('version_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        if (error) throw error
        return count ?? 0
      }),
    enabled: !!user,
    // Alle 30 Sekunden automatisch prüfen
    refetchInterval: 30000,
  })
}

/** Notification als gelesen markieren */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('Nicht eingeloggt')

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

      if (error) throw error
    },
    onSuccess: (_, versionId) => {
      queryClient.invalidateQueries({ queryKey: ['version-notification', versionId] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Alle ungelesenen Notifications für den aktuellen User laden */
export function useUnreadNotifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!user) return []
        const { data, error } = await supabase
          .from('version_notifications')
          .select(`
            *,
            versions:version_id (
              id,
              kw_nummer,
              jahr,
              kw_label,
              status
            )
          `)
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
        if (error) throw error
        return data ?? []
      }),
    enabled: !!user,
  })
}

/** Neue Produkte einer Version laden (status = NEW_PRODUCT_YELLOW) */
export function useNewProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['new-products', versionId],
    queryFn: async () => {
      if (!versionId) return []

      const { data, error } = await supabase
        .from('master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .eq('status', 'NEW_PRODUCT_YELLOW')
        .order('system_name')

      if (error) throw error
      return (data ?? []) as MasterPLUItem[]
    },
    enabled: !!versionId,
  })
}

/** Geänderte PLUs einer Version laden (status = PLU_CHANGED_RED) */
export function useChangedProducts(versionId: string | undefined) {
  return useQuery({
    queryKey: ['changed-products', versionId],
    queryFn: async () => {
      if (!versionId) return []

      const { data, error } = await supabase
        .from('master_plu_items')
        .select('*')
        .eq('version_id', versionId)
        .eq('status', 'PLU_CHANGED_RED')
        .order('system_name')

      if (error) throw error
      return (data ?? []) as MasterPLUItem[]
    },
    enabled: !!versionId,
  })
}
