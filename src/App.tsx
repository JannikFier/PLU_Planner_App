import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

// Seiten
import { LoginPage } from '@/pages/LoginPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { UserDashboard } from '@/pages/UserDashboard'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { SuperAdminDashboard } from '@/pages/SuperAdminDashboard'
import { MasterList } from '@/pages/MasterList'
import { HiddenItems } from '@/pages/HiddenItems'
import { CustomProductsPage } from '@/pages/CustomProductsPage'
import { HiddenProductsPage } from '@/pages/HiddenProductsPage'
import { UserManagement } from '@/pages/UserManagement'
import { NotFound } from '@/pages/NotFound'
import { LayoutSettingsPage } from '@/pages/LayoutSettingsPage'
import { RulesPage } from '@/pages/RulesPage'
import { BlockSortPage } from '@/pages/BlockSortPage'
import { VersionsPage } from '@/pages/VersionsPage'
import { PLUUploadPage } from '@/pages/PLUUploadPage'

// Layout
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// TanStack Query Client – zentrale Konfiguration
const isAbortError = (err: unknown) =>
  err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR') ||
  (err != null && typeof (err as { message?: string }).message === 'string' && (err as { message: string }).message.includes('AbortError'))

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

// #region agent log – Query-/Mutation-Fehler für proaktives Monitoring
const DEBUG_INGEST = 'http://127.0.0.1:7244/ingest/d1646c8f-788c-4220-8020-ca825d2ef16e'
function logToMonitor(location: string, message: string, data: Record<string, unknown>) {
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, message, data, timestamp: Date.now() }),
  }).catch(() => {})
}
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' && event.query.state.status === 'error' && event.query.state.error) {
    const err = event.query.state.error
    logToMonitor('QueryCache.error', err instanceof Error ? err.message : String(err), {
      queryKey: event.query.queryKey,
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
})
queryClient.getMutationCache().subscribe((event) => {
  if (event?.type === 'updated' && event.mutation.state.status === 'error' && event.mutation.state.error) {
    const err = event.mutation.state.error
    logToMonitor('MutationCache.error', err instanceof Error ? err.message : String(err), {
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
})
// #endregion

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
      <TooltipProvider>
        <BrowserRouter>
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
            <Route path="/" element={<Navigate to="/user" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        {/* Toast Notifications (global) */}
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
