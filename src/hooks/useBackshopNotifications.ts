// Backshop-Benachrichtigungen: backshop_version_notifications, neue/geänderte Backshop-Items

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, queryRestCount, isTestModeActive } from '@/lib/supabase'
import {
  getVersionNotificationsUpsertMode,
  isLegacyOnConflictConstraintError,
  setVersionNotificationsUpsertMode,
} from '@/lib/supabase-upsert-on-conflict-fallback'
import { ensureProfileCurrentStoreId } from '@/lib/ensure-profile-current-store'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { toast } from 'sonner'
import type { Database, BackshopMasterPLUItem, BackshopVersionNotification } from '@/types/database'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { getPreviousVersionId } from '@/lib/version-plu-diff'
import {
  filterDirectManualBackshopSupplements,
  mergeBackshopNotificationNeuRows,
} from '@/lib/notification-neu-tab-merge'

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

/** Notification-Zeile für aktuellen User + Backshop-Version */
export function useBackshopVersionNotification(versionId: string | undefined) {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-version-notification', versionId, currentStoreId],
    queryFn: async () => {
      if (!user || !versionId || !currentStoreId) return null
      const data = await queryRest<BackshopVersionNotification[]>('backshop_version_notifications', {
        select: '*',
        user_id: `eq.${user.id}`,
        version_id: `eq.${versionId}`,
        store_id: `eq.${currentStoreId}`,
        limit: '1',
      })
      const arr = Array.isArray(data) ? data : []
      return (arr[0] ?? null) as BackshopVersionNotification | null
    },
    enabled: !!user && !!versionId && !!currentStoreId,
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

      if (isTestModeActive()) {
        const readAt = new Date().toISOString()
        queryClient.setQueryData<BackshopVersionNotification | null>(
          ['backshop-version-notification', versionId, currentStoreId],
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
        queryClient.setQueryData<number>(['backshop-notification-count', currentStoreId], (n) =>
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
      } as Database['public']['Tables']['backshop_version_notifications']['Insert'] as never

      const mode = getVersionNotificationsUpsertMode()
      let error: { message: string; code?: string } | null = null

      if (mode === 'legacy') {
        let r = await supabase
          .from('backshop_version_notifications')
          .upsert(row, { onConflict: 'user_id,version_id' })
        if (r.error && isLegacyOnConflictConstraintError(r.error)) {
          setVersionNotificationsUpsertMode('triple')
          r = await supabase
            .from('backshop_version_notifications')
            .upsert(row, { onConflict: 'user_id,version_id,store_id' })
        }
        error = r.error
      } else {
        let r = await supabase
          .from('backshop_version_notifications')
          .upsert(row, { onConflict: 'user_id,version_id,store_id' })
        if (r.error && isLegacyOnConflictConstraintError(r.error)) {
          setVersionNotificationsUpsertMode('legacy')
          r = await supabase
            .from('backshop_version_notifications')
            .upsert(row, { onConflict: 'user_id,version_id' })
        }
        error = r.error
      }

      if (error) throw error
    },
    onSuccess: (_, versionId) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-notification-count', currentStoreId] })
        queryClient.invalidateQueries({ queryKey: ['backshop-version-notification', versionId, currentStoreId] })
        queryClient.invalidateQueries({ queryKey: ['unread-notifications', currentStoreId] })
      }
    },
    onError: (err) => {
      const em = err as { message?: string }
      toast.error(`Fehler: ${err instanceof Error ? err.message : em.message?.trim() || 'Unbekannt'}`)
    },
  })
}

/**
 * Tab „Neu“ (Backshop): alle `NEW_PRODUCT_YELLOW` plus direkt angelegte manuelle Nachbesserungen
 * mit `UNCHANGED`, ohne Carryover (PLU war in Vorversion schon `source=manual`).
 */
export function useBackshopNewProducts(versionId: string | undefined) {
  const { data: versions = [] } = useBackshopVersions()
  const previousId = useMemo(
    () => getPreviousVersionId(versions, versionId),
    [versions, versionId],
  )

  return useQuery({
    queryKey: ['backshop-notification-neu-tab', versionId, previousId],
    queryFn: async () => {
      if (!versionId) return []

      const [yellow, manual, prevManualRows] = await Promise.all([
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${versionId}`,
          status: 'eq.NEW_PRODUCT_YELLOW',
        }),
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${versionId}`,
          source: 'eq.manual',
          status: 'eq.UNCHANGED',
        }),
        previousId
          ? queryRest<{ plu: string }[]>('backshop_master_plu_items', {
              select: 'plu',
              version_id: `eq.${previousId}`,
              source: 'eq.manual',
            })
          : Promise.resolve([] as { plu: string }[]),
      ])

      const prevSet = previousId ? new Set((prevManualRows ?? []).map((r) => r.plu)) : null
      const directManual = filterDirectManualBackshopSupplements(manual ?? [], prevSet)
      return mergeBackshopNotificationNeuRows(yellow ?? [], directManual)
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
