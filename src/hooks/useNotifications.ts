// Benachrichtigungen: Version-Notifications (gelesen/ungelesen)

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, queryRestCount, isTestModeActive } from '@/lib/supabase'
import { ensureProfileCurrentStoreId } from '@/lib/ensure-profile-current-store'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { toast } from 'sonner'
import type { Database, VersionNotification, MasterPLUItem } from '@/types/database'
import { useVersions } from '@/hooks/useVersions'
import { getPreviousVersionId } from '@/lib/version-plu-diff'
import {
  filterDirectManualObstSupplements,
  mergeObstNotificationNeuRows,
} from '@/lib/notification-neu-tab-merge'
import {
  getVersionNotificationsUpsertMode,
  isLegacyOnConflictConstraintError,
  setVersionNotificationsUpsertMode,
} from '@/lib/supabase-upsert-on-conflict-fallback'

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

      if (isTestModeActive()) {
        const readAt = new Date().toISOString()
        queryClient.setQueryData<VersionNotification | null>(
          ['version-notification', versionId, currentStoreId],
          (old) => {
            if (old) return { ...old, is_read: true, read_at: readAt }
            return {
              id: crypto.randomUUID(),
              user_id: user.id,
              version_id: versionId,
              is_read: true,
              read_at: readAt,
              created_at: readAt,
              store_id: currentStoreId,
            }
          },
        )
        queryClient.setQueryData<number>(['notification-count', currentStoreId], (n) =>
          typeof n === 'number' ? Math.max(0, n - 1) : 0,
        )
        return
      }

      await ensureProfileCurrentStoreId(user.id, currentStoreId)

      const readAt = new Date().toISOString()
      const row = {
        user_id: user.id,
        version_id: versionId,
        store_id: currentStoreId,
        is_read: true,
        read_at: readAt,
      } as Database['public']['Tables']['version_notifications']['Insert'] as never

      const mode = getVersionNotificationsUpsertMode()
      let error: { message: string; code?: string } | null = null

      if (mode === 'legacy') {
        let r = await supabase
          .from('version_notifications')
          .upsert(row, { onConflict: 'user_id,version_id' })
        if (r.error && isLegacyOnConflictConstraintError(r.error)) {
          setVersionNotificationsUpsertMode('triple')
          r = await supabase
            .from('version_notifications')
            .upsert(row, { onConflict: 'user_id,version_id,store_id' })
        }
        error = r.error
      } else {
        let r = await supabase
          .from('version_notifications')
          .upsert(row, { onConflict: 'user_id,version_id,store_id' })
        if (r.error && isLegacyOnConflictConstraintError(r.error)) {
          setVersionNotificationsUpsertMode('legacy')
          r = await supabase
            .from('version_notifications')
            .upsert(row, { onConflict: 'user_id,version_id' })
        }
        error = r.error
      }

      if (error) throw error
    },
    onSuccess: (_, versionId) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['version-notification', versionId, currentStoreId] })
        queryClient.invalidateQueries({ queryKey: ['notification-count', currentStoreId] })
        queryClient.invalidateQueries({ queryKey: ['unread-notifications', currentStoreId] })
      }
    },
    onError: (error) => {
      const em = error as { message?: string }
      toast.error(`Fehler: ${error instanceof Error ? error.message : em.message?.trim() || 'Unbekannt'}`)
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

/**
 * Tab „Neu“ in der Glocke: alle `NEW_PRODUCT_YELLOW` plus direkt angelegte manuelle Nachbesserungen
 * mit `UNCHANGED` (ältere DB), ohne Carryover (PLU existierte in Vorversion schon als manuelles Supplement).
 */
export function useNewProducts(versionId: string | undefined) {
  const { data: versions = [] } = useVersions()
  const previousId = useMemo(
    () => getPreviousVersionId(versions, versionId),
    [versions, versionId],
  )

  return useQuery({
    queryKey: ['obst-notification-neu-tab', versionId, previousId],
    queryFn: async () => {
      if (!versionId) return []

      const [yellow, manual, prevManualRows] = await Promise.all([
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${versionId}`,
          status: 'eq.NEW_PRODUCT_YELLOW',
        }),
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${versionId}`,
          is_manual_supplement: 'eq.true',
          status: 'eq.UNCHANGED',
        }),
        previousId
          ? queryRest<{ plu: string }[]>('master_plu_items', {
              select: 'plu',
              version_id: `eq.${previousId}`,
              is_manual_supplement: 'eq.true',
            })
          : Promise.resolve([] as { plu: string }[]),
      ])

      const prevSet = previousId ? new Set((prevManualRows ?? []).map((r) => r.plu)) : null
      const directManual = filterDirectManualObstSupplements(manual ?? [], prevSet)
      return mergeObstNotificationNeuRows(yellow ?? [], directManual)
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
