import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthPrefetch } from '@/components/AuthPrefetch'
import { HomeRedirect } from '@/components/HomeRedirect'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Layout (nicht lazy – wird überall gebraucht)
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { isAbortError } from '@/lib/error-utils'
import { shouldPersistQuery } from '@/lib/query-persist-allowlist'

// Seiten – lazy geladen
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })))
const UserDashboard = lazy(() => import('@/pages/UserDashboard').then((m) => ({ default: m.UserDashboard })))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard })))
const SuperAdminObstBereichPage = lazy(() => import('@/pages/SuperAdminObstBereichPage').then((m) => ({ default: m.SuperAdminObstBereichPage })))
const SuperAdminBackshopBereichPage = lazy(() => import('@/pages/SuperAdminBackshopBereichPage').then((m) => ({ default: m.SuperAdminBackshopBereichPage })))
const MasterList = lazy(() => import('@/pages/MasterList').then((m) => ({ default: m.MasterList })))
const HiddenItems = lazy(() => import('@/pages/HiddenItems').then((m) => ({ default: m.HiddenItems })))
const CustomProductsPage = lazy(() => import('@/pages/CustomProductsPage').then((m) => ({ default: m.CustomProductsPage })))
const HiddenProductsPage = lazy(() => import('@/pages/HiddenProductsPage').then((m) => ({ default: m.HiddenProductsPage })))
const RenamedProductsPage = lazy(() => import('@/pages/RenamedProductsPage').then((m) => ({ default: m.RenamedProductsPage })))
const UserManagement = lazy(() => import('@/pages/UserManagement').then((m) => ({ default: m.UserManagement })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const LayoutSettingsPage = lazy(() => import('@/pages/LayoutSettingsPage').then((m) => ({ default: m.LayoutSettingsPage })))
const RulesPage = lazy(() => import('@/pages/RulesPage').then((m) => ({ default: m.RulesPage })))
const BlockSortPage = lazy(() => import('@/pages/BlockSortPage').then((m) => ({ default: m.BlockSortPage })))
const VersionsPage = lazy(() => import('@/pages/VersionsPage').then((m) => ({ default: m.VersionsPage })))
const PLUUploadPage = lazy(() => import('@/pages/PLUUploadPage').then((m) => ({ default: m.PLUUploadPage })))
const ViewerDashboard = lazy(() => import('@/pages/ViewerDashboard').then((m) => ({ default: m.ViewerDashboard })))
const BackshopMasterList = lazy(() => import('@/pages/BackshopMasterList').then((m) => ({ default: m.BackshopMasterList })))
const BackshopUploadPage = lazy(() => import('@/pages/BackshopUploadPage').then((m) => ({ default: m.BackshopUploadPage })))
const BackshopCustomProductsPage = lazy(() => import('@/pages/BackshopCustomProductsPage').then((m) => ({ default: m.BackshopCustomProductsPage })))
const BackshopHiddenProductsPage = lazy(() => import('@/pages/BackshopHiddenProductsPage').then((m) => ({ default: m.BackshopHiddenProductsPage })))
const BackshopRenamedProductsPage = lazy(() => import('@/pages/BackshopRenamedProductsPage').then((m) => ({ default: m.BackshopRenamedProductsPage })))
const BackshopVersionsPage = lazy(() => import('@/pages/BackshopVersionsPage').then((m) => ({ default: m.BackshopVersionsPage })))
const BackshopLayoutSettingsPage = lazy(() => import('@/pages/BackshopLayoutSettingsPage').then((m) => ({ default: m.BackshopLayoutSettingsPage })))
const BackshopRulesPage = lazy(() => import('@/pages/BackshopRulesPage').then((m) => ({ default: m.BackshopRulesPage })))
const BackshopBlockSortPage = lazy(() => import('@/pages/BackshopBlockSortPage').then((m) => ({ default: m.BackshopBlockSortPage })))

/** Ladeanzeige beim Wechsel zu lazy-geladenen Seiten – mit Layout-Struktur, damit der Übergang nicht abrupt wirkt */
function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-background" aria-label="Seite wird geladen">
      <header className="h-16 border-b bg-card/80 flex items-center px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            PLU
          </div>
          <span className="text-lg font-semibold">PLU Planner</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center mx-auto max-w-7xl w-full px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Seite wird geladen...</p>
        </div>
      </main>
    </div>
  )
}

// TanStack Query Client – zentrale Konfiguration
// gcTime mindestens so hoch wie maxAge der Persistenz, damit gecachte Daten nach Reload nicht sofort verworfen werden
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 // 24 Stunden
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: CACHE_MAX_AGE_MS,
      retry: (failureCount, error) => {
        if (isAbortError(error)) return failureCount < 2
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(150 + attemptIndex * 150, 600),
      refetchOnWindowFocus: false,
    },
  },
})

// Persister: Cache in sessionStorage speichern → nach Reload sofort letzte Daten anzeigen, dann im Hintergrund aktualisieren
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  key: 'PLU_PLANNER_QUERY_CACHE',
  throttleTime: 1000,
})

/**
 * Haupt-App-Komponente mit Routing und Providers.
 *
 * Drei Rollenbereiche:
 * - /user/*         → Alle eingeloggten User
 * - /admin/*        → Admin + Super-Admin
 * - /super-admin/*  → Nur Super-Admin (Inhaber)
 */
function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: 'plu-planner-v1',
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      <AuthPrefetch />
      <TooltipProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* === Öffentlich === */}
            <Route path="/login" element={<LoginPage />} />

            {/* === Passwort ändern (Einmalpasswort-Flow) === */}
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />

            {/* === User-Bereich (alle Rollen) === */}
            <Route
              path="/user"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/masterlist"
              element={
                <ProtectedRoute>
                  <MasterList mode="user" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/hidden-items"
              element={
                <ProtectedRoute>
                  <HiddenItems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/custom-products"
              element={
                <ProtectedRoute>
                  <CustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/hidden-products"
              element={
                <ProtectedRoute>
                  <HiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-list"
              element={
                <ProtectedRoute>
                  <BackshopMasterList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-custom-products"
              element={
                <ProtectedRoute>
                  <BackshopCustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-hidden-products"
              element={
                <ProtectedRoute>
                  <BackshopHiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-renamed-products"
              element={
                <ProtectedRoute>
                  <BackshopRenamedProductsPage />
                </ProtectedRoute>
              }
            />

            {/* === Viewer-Bereich (nur viewer) === */}
            <Route
              path="/viewer"
              element={
                <ProtectedRoute>
                  <ViewerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/masterlist"
              element={
                <ProtectedRoute>
                  <MasterList mode="viewer" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop-list"
              element={
                <ProtectedRoute>
                  <BackshopMasterList />
                </ProtectedRoute>
              }
            />

            {/* === Admin-Bereich (admin + super_admin) === */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/masterlist"
              element={
                <ProtectedRoute requireAdmin>
                  <MasterList mode="user" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hidden-items"
              element={
                <ProtectedRoute requireAdmin>
                  <HiddenItems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/custom-products"
              element={
                <ProtectedRoute requireAdmin>
                  <CustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hidden-products"
              element={
                <ProtectedRoute requireAdmin>
                  <HiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/renamed-products"
              element={
                <ProtectedRoute requireAdmin>
                  <RenamedProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-list"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopMasterList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-custom-products"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopCustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-hidden-products"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopHiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-renamed-products"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopRenamedProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* === Super-Admin-Bereich (nur super_admin / Inhaber) === */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/obst"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminObstBereichPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminBackshopBereichPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/masterlist"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <MasterList mode="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/hidden-items"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <HiddenItems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/custom-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <CustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/hidden-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <HiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/renamed-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <RenamedProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/plu-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PLUUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-list"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopMasterList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-custom-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopCustomProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-hidden-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopHiddenProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-renamed-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopRenamedProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/layout"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <LayoutSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/rules"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <RulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/block-sort"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BlockSortPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-layout"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopLayoutSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-rules"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-block-sort"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopBlockSortPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/versions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <VersionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-versions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <BackshopVersionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* === Fallbacks === */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>

        {/* Toast Notifications (global) */}
        <Toaster position="top-right" richColors closeButton />
        <SpeedInsights />
      </TooltipProvider>
    </PersistQueryClientProvider>
  )
}

export default App
