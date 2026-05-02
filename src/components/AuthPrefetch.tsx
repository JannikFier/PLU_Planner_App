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
import {
  runMasterListPrefetch,
  runAdminPrefetch,
  runStorePrefetch,
  runBackshopPrefetch,
  runBackshopStorePrefetch,
  runSuperAdminCompaniesPrefetch,
} from '@/hooks/usePrefetchForNavigation'
import { fetchProfilesForCompany } from '@/lib/fetchProfilesForCompany'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types/database'

export function AuthPrefetch() {
  const { user, isLoading: authLoading, mustChangePassword, profile } = useAuth()
  const { currentStoreId, currentCompanyId } = useCurrentStore()
  const queryClient = useQueryClient()
  const location = useLocation()

  useEffect(() => {
    if (authLoading || !user || mustChangePassword) return

    let cancelled = false
    void (async () => {
      if (cancelled) return
      runMasterListPrefetch(queryClient)
      runBackshopPrefetch(queryClient)
      if (profile?.role === 'admin') {
        runAdminPrefetch(queryClient)
      }
      if (profile?.role === 'super_admin') {
        runSuperAdminCompaniesPrefetch(queryClient)
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

  // Super-Admin: Benutzer der aktuellen Firma (gleiche Query wie Benutzerverwaltung)
  useEffect(() => {
    if (!currentCompanyId || authLoading || !user || mustChangePassword) return
    if (profile?.role !== 'super_admin') return
    void queryClient.prefetchQuery({
      queryKey: ['company-profiles', currentCompanyId],
      queryFn: () => fetchProfilesForCompany(currentCompanyId),
      staleTime: 5 * 60 * 1000,
    })
  }, [currentCompanyId, authLoading, user, mustChangePassword, queryClient, profile?.role])

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
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Markt nicht gefunden.')
        return data as unknown as Store
      },
    })
    void import('@/pages/SuperAdminStoreDetailPage')
  }, [storeIdFromPath, authLoading, user, mustChangePassword, queryClient])

  // Dashboard-Chunk der Rolle vorladen, damit Redirect/Navigation sofort den Chunk nutzen kann
  useEffect(() => {
    if (authLoading || !user || mustChangePassword || !profile?.role) return
    const role = profile.role
    if (role === 'super_admin') {
      void import('@/pages/SuperAdminDashboard')
      void import('@/pages/SuperAdminCompaniesPage')
    }
    else if (role === 'admin') void import('@/pages/AdminDashboard')
    else if (role === 'viewer') void import('@/pages/ViewerDashboard')
    else if (role === 'kiosk') void import('@/pages/KioskLayout')
    else void import('@/pages/UserDashboard')
    // Chunk der aktuellen Route vorladen (Reload auf MasterList/BackshopList schneller)
    if (location.pathname.includes('/masterlist')) void import('@/pages/MasterList')
    if (location.pathname.includes('/kiosk')) void import('@/pages/KioskLayout')
    if (location.pathname.includes('/backshop-list')) void import('@/pages/BackshopMasterList')
    if (location.pathname.includes('pick-hide-obst')) void import('@/pages/PickHideObstPage')
    if (location.pathname.includes('pick-hide-backshop')) void import('@/pages/PickHideBackshopPage')
    if (location.pathname.includes('pick-rename-obst')) void import('@/pages/PickRenameObstPage')
    if (location.pathname.includes('pick-rename-backshop')) void import('@/pages/PickRenameBackshopPage')
  }, [authLoading, user, mustChangePassword, profile?.role, location.pathname])

  return null
}
