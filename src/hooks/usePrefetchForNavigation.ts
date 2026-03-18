/**
 * Prefetch von Daten für MasterList, LayoutSettingsPage und Benutzerverwaltung.
 * Wird beim App-Start (AuthPrefetch) und auf den Dashboards aufgerufen,
 * damit beim Klick auf "Masterliste", "Layout" oder "Benutzer" die Daten bereits im Cache sind.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import type {
  Profile,
  Version,
  LayoutSettings,
  Block,
  Bezeichnungsregel,
  MasterPLUItem,
  CustomProduct,
  HiddenItem,
  RenamedItem,
  OfferItem,
  BackshopVersion,
  BackshopBlock,
  BackshopLayoutSettings,
  BackshopMasterPLUItem,
  BackshopHiddenItem,
  BackshopRenamedItem,
  BackshopOfferItem,
} from '@/types/database'

/** Liest aktive Version-ID aus Cache (version/active oder aus versions-Liste). */
function getActiveVersionIdFromCache(queryClient: QueryClient): string | null {
  const active = queryClient.getQueryData<{ id: string } | null>(['version', 'active'])
  if (active?.id) return active.id
  const versions = queryClient.getQueryData<Array<{ id: string; status?: string }>>(['versions'])
  const v = versions?.find((x) => x.status === 'active') ?? versions?.[0]
  return v?.id ?? null
}

/** Zentrale Prefetch-Logik – wiederverwendbar für AuthPrefetch und Dashboard.
 *  Bricht den Waterfall auf: plu-items startet sobald version/active ODER versions fertig ist (wer zuerst). */
export function runMasterListPrefetch(queryClient: QueryClient): void {
  const versionPromise = queryClient.prefetchQuery({
    queryKey: ['version', 'active'],
    queryFn: async () => {
      const active = await queryRest<Version[]>('versions', { select: '*', status: 'eq.active', limit: '1' })
      if (active?.length) return active[0]
      const latest = await queryRest<Version[]>('versions', { select: '*', order: 'jahr.desc,kw_nummer.desc', limit: '1' })
      return latest?.[0] ?? null
    },
  })
  const versionsPromise = queryClient.prefetchQuery({
    queryKey: ['versions'],
    queryFn: () => queryRest<Version[]>('versions', { select: '*', order: 'jahr.desc,kw_nummer.desc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['layout-settings'],
    queryFn: async () => {
      const data = await queryRest<LayoutSettings[]>('layout_settings', { select: '*', limit: '1' })
      return (data && data.length > 0) ? data[0] : null
    },
  })
  void queryClient.prefetchQuery({
    queryKey: ['blocks'],
    queryFn: () => queryRest<Block[]>('blocks', { select: '*', order: 'order_index.asc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['bezeichnungsregeln'],
    queryFn: () => queryRest<Bezeichnungsregel[]>('bezeichnungsregeln', { select: '*', order: 'created_at.asc' }),
  })

  Promise.any([versionPromise, versionsPromise])
    .then(() => {
      const versionId = getActiveVersionIdFromCache(queryClient)
      if (versionId) {
        void queryClient.prefetchQuery({
          queryKey: ['plu-items', versionId],
          queryFn: () => queryRest<MasterPLUItem[]>('master_plu_items', { select: '*', version_id: `eq.${versionId}` }),
        })
      }
    })
}

/** Prefetch fuer marktspezifische Daten, sobald currentStoreId verfuegbar ist. */
export function runStorePrefetch(queryClient: QueryClient, storeId: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['custom-products', storeId],
    queryFn: () => queryRest<CustomProduct[]>('custom_products', { select: '*', store_id: `eq.${storeId}` }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['hidden-items', storeId],
    queryFn: () => queryRest<HiddenItem[]>('hidden_items', { select: '*', store_id: `eq.${storeId}`, order: 'created_at.desc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['renamed-items', storeId],
    queryFn: () => queryRest<RenamedItem[]>('renamed_items', { select: '*', store_id: `eq.${storeId}`, order: 'plu.asc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['offer-items', storeId],
    queryFn: () => queryRest<OfferItem[]>('plu_offer_items', { select: '*', store_id: `eq.${storeId}`, order: 'created_at.desc' }),
  })
}

/** Backshop-Version-ID aus Cache lesen (analog zur Obst-Version). */
function getActiveBackshopVersionIdFromCache(queryClient: QueryClient): string | null {
  const active = queryClient.getQueryData<{ id: string } | null>(['backshop-version', 'active'])
  if (active?.id) return active.id
  const versions = queryClient.getQueryData<Array<{ id: string; status?: string }>>(['backshop-versions'])
  const v = versions?.find((x) => x.status === 'active') ?? versions?.[0]
  return v?.id ?? null
}

/** Prefetch für die Backshop-Masterliste – analog zu runMasterListPrefetch. */
export function runBackshopPrefetch(queryClient: QueryClient): void {
  const versionPromise = queryClient.prefetchQuery({
    queryKey: ['backshop-version', 'active'],
    queryFn: async () => {
      const active = await queryRest<BackshopVersion[]>('backshop_versions', { select: '*', status: 'eq.active', limit: '1' })
      if (active?.length) return active[0]
      const latest = await queryRest<BackshopVersion[]>('backshop_versions', { select: '*', order: 'jahr.desc,kw_nummer.desc', limit: '1' })
      return latest?.[0] ?? null
    },
  })
  const versionsPromise = queryClient.prefetchQuery({
    queryKey: ['backshop-versions'],
    queryFn: () => queryRest<BackshopVersion[]>('backshop_versions', { select: '*', order: 'jahr.desc,kw_nummer.desc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['backshop-layout-settings'],
    queryFn: async () => {
      const data = await queryRest<BackshopLayoutSettings[]>('backshop_layout_settings', { select: '*', limit: '1' })
      return (data && data.length > 0) ? data[0] : null
    },
  })
  void queryClient.prefetchQuery({
    queryKey: ['backshop-blocks'],
    queryFn: () => queryRest<BackshopBlock[]>('backshop_blocks', { select: '*', order: 'order_index.asc' }),
  })

  Promise.any([versionPromise, versionsPromise])
    .then(() => {
      const versionId = getActiveBackshopVersionIdFromCache(queryClient)
      if (versionId) {
        void queryClient.prefetchQuery({
          queryKey: ['backshop-plu-items', versionId],
          queryFn: () => queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', { select: '*', version_id: `eq.${versionId}` }),
        })
      }
    })

  void import('@/pages/BackshopMasterList')
}

/** Prefetch für marktspezifische Backshop-Daten. */
export function runBackshopStorePrefetch(queryClient: QueryClient, storeId: string): void {
  void queryClient.prefetchQuery({
    queryKey: ['backshop-hidden-items', storeId],
    queryFn: () => queryRest<BackshopHiddenItem[]>('backshop_hidden_items', { select: '*', store_id: `eq.${storeId}`, order: 'created_at.desc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['backshop-renamed-items', storeId],
    queryFn: () => queryRest<BackshopRenamedItem[]>('backshop_renamed_items', { select: '*', store_id: `eq.${storeId}`, order: 'plu.asc' }),
  })
  void queryClient.prefetchQuery({
    queryKey: ['backshop-offer-items', storeId],
    queryFn: () => queryRest<BackshopOfferItem[]>('backshop_offer_items', { select: '*', store_id: `eq.${storeId}`, order: 'created_at.desc' }),
  })
}

/** Prefetch für Benutzerverwaltung (Admin/Super-Admin). Damit der "Alle Benutzer"-Kasten nach Reload schnell gefüllt ist. */
export function runAdminPrefetch(queryClient: QueryClient): void {
  void queryClient.prefetchQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const data = await queryRest<Profile[]>('profiles', {
        select: '*',
        order: 'created_at.desc',
      })
      return data ?? []
    },
  })
}

export function usePrefetchForNavigation() {
  const queryClient = useQueryClient()

  useEffect(() => {
    runMasterListPrefetch(queryClient)
  }, [queryClient])
}
