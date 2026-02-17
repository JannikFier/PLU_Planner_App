import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthPrefetch } from '@/components/AuthPrefetch'
import { HomeRedirect } from '@/components/HomeRedirect'

// Layout (nicht lazy – wird überall gebraucht)
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { isAbortError } from '@/lib/error-utils'

// Seiten – lazy geladen
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })))
const UserDashboard = lazy(() => import('@/pages/UserDashboard').then((m) => ({ default: m.UserDashboard })))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard })))
const MasterList = lazy(() => import('@/pages/MasterList').then((m) => ({ default: m.MasterList })))
const HiddenItems = lazy(() => import('@/pages/HiddenItems').then((m) => ({ default: m.HiddenItems })))
const CustomProductsPage = lazy(() => import('@/pages/CustomProductsPage').then((m) => ({ default: m.CustomProductsPage })))
const HiddenProductsPage = lazy(() => import('@/pages/HiddenProductsPage').then((m) => ({ default: m.HiddenProductsPage })))
const UserManagement = lazy(() => import('@/pages/UserManagement').then((m) => ({ default: m.UserManagement })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const LayoutSettingsPage = lazy(() => import('@/pages/LayoutSettingsPage').then((m) => ({ default: m.LayoutSettingsPage })))
const RulesPage = lazy(() => import('@/pages/RulesPage').then((m) => ({ default: m.RulesPage })))
const BlockSortPage = lazy(() => import('@/pages/BlockSortPage').then((m) => ({ default: m.BlockSortPage })))
const VersionsPage = lazy(() => import('@/pages/VersionsPage').then((m) => ({ default: m.VersionsPage })))
const PLUUploadPage = lazy(() => import('@/pages/PLUUploadPage').then((m) => ({ default: m.PLUUploadPage })))

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
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isAbortError(error)) return failureCount < 2
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(150 + attemptIndex * 150, 600),
      refetchOnWindowFocus: false,
    },
  },
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
    <QueryClientProvider client={queryClient}>
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
              path="/super-admin/plu-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <PLUUploadPage />
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
              path="/super-admin/versions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <VersionsPage />
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
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
