/**
 * Startet Prefetch für MasterList/Layout/Benutzerverwaltung sofort bei authentifiziertem User.
 * Läuft beim App-Start (bevor Dashboard geladen ist) – damit die Inhalts-Kasten
 * (PLU-Liste, Layout, Alle Benutzer) nach Reload schnell gefüllt sind.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { runMasterListPrefetch, runAdminPrefetch, runStorePrefetch, runBackshopPrefetch, runBackshopStorePrefetch } from '@/hooks/usePrefetchForNavigation'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types/database'

export function AuthPrefetch() {
  const { user, isLoading: authLoading, mustChangePassword, profile } = useAuth()
  const { currentStoreId } = useCurrentStore()
  const queryClient = useQueryClient()
  const location = useLocation()

  useEffect(() => {
    if (authLoading || !user || mustChangePassword) return

    let cancelled = false
    void (async () => {
      if (cancelled) return
      runMasterListPrefetch(queryClient)
      runBackshopPrefetch(queryClient)
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        runAdminPrefetch(queryClient)
      }
    })()
    return () => { cancelled = true }
  }, [authLoading, user, mustChangePassword, queryClient, profile?.role])

  // Marktspezifische Daten prefetchen sobald currentStoreId verfuegbar
  useEffect(() => {
    if (!currentStoreId || authLoading || !user || mustChangePassword) return
    runStorePrefetch(queryClient, currentStoreId)
    runBackshopStorePrefetch(queryClient, currentStoreId)
  }, [currentStoreId, authLoading, user, mustChangePassword, queryClient])

  // Store-Detail aus URL prefetchen (Reload auf /super-admin/companies/.../stores/:storeId)
  const storeIdFromPath = location.pathname.match(/\/stores\/([a-f0-9-]+)/)?.[1]
  useEffect(() => {
    if (!storeIdFromPath || authLoading || !user || mustChangePassword) return
    void queryClient.prefetchQuery({
      queryKey: ['stores', 'detail', storeIdFromPath],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('stores' as never)
          .select('*')
          .eq('id', storeIdFromPath)
          .single()
        if (error) throw error
        return data as unknown as Store
      },
    })
    void import('@/pages/SuperAdminStoreDetailPage')
  }, [storeIdFromPath, authLoading, user, mustChangePassword, queryClient])

  // Dashboard-Chunk der Rolle vorladen, damit Redirect/Navigation sofort den Chunk nutzen kann
  useEffect(() => {
    if (authLoading || !user || mustChangePassword || !profile?.role) return
    const role = profile.role
    if (role === 'super_admin') void import('@/pages/SuperAdminDashboard')
    else if (role === 'admin') void import('@/pages/AdminDashboard')
    else if (role === 'viewer') void import('@/pages/ViewerDashboard')
    else void import('@/pages/UserDashboard')
    // Chunk der aktuellen Route vorladen (Reload auf MasterList/BackshopList schneller)
    if (location.pathname.includes('/masterlist')) void import('@/pages/MasterList')
    if (location.pathname.includes('/backshop-list')) void import('@/pages/BackshopMasterList')
  }, [authLoading, user, mustChangePassword, profile?.role, location.pathname])

  return null
}
