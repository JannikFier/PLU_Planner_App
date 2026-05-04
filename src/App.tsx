import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthPrefetch } from '@/components/AuthPrefetch'
import { StoreChangeQuerySync } from '@/components/StoreChangeQuerySync'
import { HomeRedirect } from '@/components/HomeRedirect'
import { TestModeProvider } from '@/contexts/TestModeContext'
import { TutorialOrchestratorProvider } from '@/contexts/TutorialOrchestratorContext'
import { TestModeBanner } from '@/components/layout/TestModeBanner'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { SpeedInsights } from '@vercel/speed-insights/react'

// Layout (nicht lazy – wird überall gebraucht)
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { KioskAreaGuard } from '@/components/layout/KioskAreaGuard'
import { KioskDefaultRedirect } from '@/components/layout/KioskDefaultRedirect'
import { ListAreaGuard } from '@/components/layout/ListAreaGuard'
import { RedirectRolePrefixed } from '@/components/RedirectRolePrefixed'
import { RedirectToMarkenAuswahl } from '@/components/RedirectToMarkenAuswahl'
import { CACHE_MAX_AGE_MS, queryClient } from '@/lib/query-client'
import { shouldPersistQuery } from '@/lib/query-persist-allowlist'
import { APP_BRAND_NAME } from '@/lib/brand'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { KasseEntrancePage } from '@/pages/KasseEntrancePage'

// Seiten – lazy geladen
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })))
const UserDashboard = lazy(() => import('@/pages/UserDashboard').then((m) => ({ default: m.UserDashboard })))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminObstHubPage = lazy(() => import('@/pages/AdminObstHubPage').then((m) => ({ default: m.AdminObstHubPage })))
const AdminObstKonfigurationPage = lazy(() =>
  import('@/pages/AdminObstKonfigurationPage').then((m) => ({ default: m.AdminObstKonfigurationPage })),
)
const BackshopHubPage = lazy(() => import('@/pages/BackshopHubPage').then((m) => ({ default: m.BackshopHubPage })))
const BackshopKachelCatalogPage = lazy(() =>
  import('@/pages/BackshopKachelCatalogPage').then((m) => ({ default: m.BackshopKachelCatalogPage })),
)
const BackshopKonfigurationHubPage = lazy(() =>
  import('@/pages/BackshopKonfigurationHubPage').then((m) => ({ default: m.BackshopKonfigurationHubPage })),
)
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard })))
const SuperAdminCompaniesPage = lazy(() => import('@/pages/SuperAdminCompaniesPage').then((m) => ({ default: m.SuperAdminCompaniesPage })))
const SuperAdminCompanyDetailPage = lazy(() => import('@/pages/SuperAdminCompanyDetailPage').then((m) => ({ default: m.SuperAdminCompanyDetailPage })))
const SuperAdminStoreDetailPage = lazy(() => import('@/pages/SuperAdminStoreDetailPage').then((m) => ({ default: m.SuperAdminStoreDetailPage })))
const SuperAdminMarktObstKonfigurationPage = lazy(() =>
  import('@/pages/SuperAdminMarktObstKonfigurationPage').then((m) => ({ default: m.SuperAdminMarktObstKonfigurationPage })),
)
const SuperAdminMarktBackshopKonfigurationPage = lazy(() =>
  import('@/pages/SuperAdminMarktBackshopKonfigurationPage').then((m) => ({ default: m.SuperAdminMarktBackshopKonfigurationPage })),
)
const SuperAdminUploadPage = lazy(() => import('@/pages/SuperAdminUploadPage').then((m) => ({ default: m.SuperAdminUploadPage })))
const CentralCampaignUploadPage = lazy(() =>
  import('@/pages/CentralCampaignUploadPage').then((m) => ({ default: m.CentralCampaignUploadPage })),
)
const SuperAdminObstBereichPage = lazy(() => import('@/pages/SuperAdminObstBereichPage').then((m) => ({ default: m.SuperAdminObstBereichPage })))
const SuperAdminBackshopBereichPage = lazy(() => import('@/pages/SuperAdminBackshopBereichPage').then((m) => ({ default: m.SuperAdminBackshopBereichPage })))
const MasterList = lazy(() => import('@/pages/MasterList').then((m) => ({ default: m.MasterList })))
const HiddenItems = lazy(() => import('@/pages/HiddenItems').then((m) => ({ default: m.HiddenItems })))
const CustomProductsPage = lazy(() => import('@/pages/CustomProductsPage').then((m) => ({ default: m.CustomProductsPage })))
const HiddenProductsPage = lazy(() => import('@/pages/HiddenProductsPage').then((m) => ({ default: m.HiddenProductsPage })))
const OfferProductsPage = lazy(() => import('@/pages/OfferProductsPage').then((m) => ({ default: m.OfferProductsPage })))
const RenamedProductsPage = lazy(() => import('@/pages/RenamedProductsPage').then((m) => ({ default: m.RenamedProductsPage })))
const PickHideObstPage = lazy(() => import('@/pages/PickHideObstPage').then((m) => ({ default: m.PickHideObstPage })))
const PickRenameObstPage = lazy(() => import('@/pages/PickRenameObstPage').then((m) => ({ default: m.PickRenameObstPage })))
const UserManagement = lazy(() => import('@/pages/UserManagement').then((m) => ({ default: m.UserManagement })))
const AdminKassenmodusPage = lazy(() =>
  import('@/pages/AdminKassenmodusPage').then((m) => ({ default: m.AdminKassenmodusPage })),
)
const KioskLayout = lazy(() => import('@/pages/KioskLayout').then((m) => ({ default: m.KioskLayout })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const LayoutSettingsPage = lazy(() => import('@/pages/LayoutSettingsPage').then((m) => ({ default: m.LayoutSettingsPage })))
const RulesPage = lazy(() => import('@/pages/RulesPage').then((m) => ({ default: m.RulesPage })))
const BlockSortPage = lazy(() => import('@/pages/BlockSortPage').then((m) => ({ default: m.BlockSortPage })))
const ObstWarengruppenPage = lazy(() =>
  import('@/pages/ObstWarengruppenPage').then((m) => ({ default: m.ObstWarengruppenPage })),
)
const VersionsPage = lazy(() => import('@/pages/VersionsPage').then((m) => ({ default: m.VersionsPage })))
const SuperAdminObstCampaignEditPage = lazy(() =>
  import('@/pages/SuperAdminObstCampaignEditPage').then((m) => ({
    default: m.SuperAdminObstCampaignEditPage,
  })),
)
const PLUUploadPage = lazy(() => import('@/pages/PLUUploadPage').then((m) => ({ default: m.PLUUploadPage })))
const ViewerDashboard = lazy(() => import('@/pages/ViewerDashboard').then((m) => ({ default: m.ViewerDashboard })))
const BackshopMasterList = lazy(() => import('@/pages/BackshopMasterList').then((m) => ({ default: m.BackshopMasterList })))
const BackshopAllSourcesUploadPage = lazy(() =>
  import('@/pages/BackshopAllSourcesUploadPage').then((m) => ({ default: m.BackshopAllSourcesUploadPage })),
)
const SuperAdminBackshopProductGroupsPage = lazy(() => import('@/pages/SuperAdminBackshopProductGroupsPage').then((m) => ({ default: m.SuperAdminBackshopProductGroupsPage })))
const SuperAdminBackshopProductGroupComposePage = lazy(() =>
  import('@/pages/SuperAdminBackshopProductGroupComposePage').then((m) => ({
    default: m.SuperAdminBackshopProductGroupComposePage,
  })),
)
const BackshopMarkenTinderPage = lazy(() => import('@/pages/BackshopMarkenTinderPage').then((m) => ({ default: m.BackshopMarkenTinderPage })))
const BackshopCustomProductsPage = lazy(() => import('@/pages/BackshopCustomProductsPage').then((m) => ({ default: m.BackshopCustomProductsPage })))
const BackshopHiddenProductsPage = lazy(() => import('@/pages/BackshopHiddenProductsPage').then((m) => ({ default: m.BackshopHiddenProductsPage })))
const BackshopOfferProductsPage = lazy(() => import('@/pages/BackshopOfferProductsPage').then((m) => ({ default: m.BackshopOfferProductsPage })))
const BackshopRenamedProductsPage = lazy(() => import('@/pages/BackshopRenamedProductsPage').then((m) => ({ default: m.BackshopRenamedProductsPage })))
const PickHideBackshopPage = lazy(() => import('@/pages/PickHideBackshopPage').then((m) => ({ default: m.PickHideBackshopPage })))
const PickRenameBackshopPage = lazy(() => import('@/pages/PickRenameBackshopPage').then((m) => ({ default: m.PickRenameBackshopPage })))
const BackshopVersionsPage = lazy(() => import('@/pages/BackshopVersionsPage').then((m) => ({ default: m.BackshopVersionsPage })))
const SuperAdminBackshopCampaignEditPage = lazy(() =>
  import('@/pages/SuperAdminBackshopCampaignEditPage').then((m) => ({
    default: m.SuperAdminBackshopCampaignEditPage,
  })),
)
const BackshopLayoutSettingsPage = lazy(() => import('@/pages/BackshopLayoutSettingsPage').then((m) => ({ default: m.BackshopLayoutSettingsPage })))
const BackshopRulesPage = lazy(() => import('@/pages/BackshopRulesPage').then((m) => ({ default: m.BackshopRulesPage })))
const BackshopBlockSortPage = lazy(() => import('@/pages/BackshopBlockSortPage').then((m) => ({ default: m.BackshopBlockSortPage })))
const BackshopWarengruppenGrundregelnPage = lazy(() =>
  import('@/pages/BackshopWarengruppenGrundregelnPage').then((m) => ({ default: m.BackshopWarengruppenGrundregelnPage })),
)
const BackshopWarengruppenPage = lazy(() => import('@/pages/BackshopWarengruppenPage').then((m) => ({ default: m.BackshopWarengruppenPage })))
const BackshopWerbungKwListPage = lazy(() =>
  import('@/pages/BackshopWerbungKwListPage').then((m) => ({ default: m.BackshopWerbungKwListPage })),
)
const BackshopWerbungKwDetailPage = lazy(() =>
  import('@/pages/BackshopWerbungKwDetailPage').then((m) => ({ default: m.BackshopWerbungKwDetailPage })),
)

// Backshop-Upload-Wizard (nicht lazy – nur Super-Admin, gemeinsamer Kontext)
import { BackshopUploadWizardLayout } from '@/pages/backshop-upload/BackshopUploadWizardLayout'
import { BackshopUploadStepUpload } from '@/pages/backshop-upload/BackshopUploadStepUpload'
import { BackshopUploadStepReview } from '@/pages/backshop-upload/BackshopUploadStepReview'
import { BackshopUploadStepAssign } from '@/pages/backshop-upload/BackshopUploadStepAssign'
import { BackshopUploadStepPreview } from '@/pages/backshop-upload/BackshopUploadStepPreview'
import { BackshopUploadStepDone } from '@/pages/backshop-upload/BackshopUploadStepDone'

/** Ladeanzeige beim Wechsel zu lazy-geladenen Seiten – mit Layout-Struktur, damit der Übergang nicht abrupt wirkt */
function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-background" aria-label="Seite wird geladen">
      <header className="h-16 border-b bg-card/80 flex items-center px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2">
          <AppBrandLogo />
          <span className="text-lg font-semibold">{APP_BRAND_NAME}</span>
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
      <TestModeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <TutorialOrchestratorProvider>
          <AuthPrefetch />
          <StoreChangeQuerySync />
          <ErrorBoundary>
          <OfflineBanner />
          <TestModeBanner />
          <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* === Öffentlich === */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/kasse/:entranceToken" element={<KasseEntrancePage />} />

            {/* === Passwort ändern (Einmalpasswort-Flow) === */}
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />

            {/* Ohne Rollen-Prefix (z. B. Lesezeichen) → /user/… oder /admin/… */}
            <Route
              path="/offer-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="offer-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hidden-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="hidden-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backshop-offer-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="backshop-offer-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backshop-hidden-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="backshop-hidden-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/renamed-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="renamed-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backshop-renamed-products"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="backshop-renamed-products" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backshop-marken-tinder"
              element={
                <ProtectedRoute>
                  <RedirectRolePrefixed segment="marken-auswahl" />
                </ProtectedRoute>
              }
            />

            {/* === Kassenmodus (Rolle kiosk) === */}
            <Route
              path="/kiosk"
              element={
                <ProtectedRoute>
                  <KioskAreaGuard>
                    <KioskLayout />
                  </KioskAreaGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<KioskDefaultRedirect />} />
              <Route
                path="obst"
                element={
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="kiosk" />
                  </ListAreaGuard>
                }
              />
              <Route
                path="backshop"
                element={
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                }
              />
            </Route>

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
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="user" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/hidden-items"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenItems />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/custom-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <CustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/hidden-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/pick-hide-obst"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickHideObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/offer-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <OfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/renamed-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <RenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/pick-rename-obst"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickRenameObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/obst-warengruppen"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="obst_gemuese">
                    <ObstWarengruppenPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop/konfiguration"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopKonfigurationHubPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopHubPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-list"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-kacheln"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopKachelCatalogPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-custom-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopCustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-hidden-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopHiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/pick-hide-backshop"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <PickHideBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-offer-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopOfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-werbung/:kw/:jahr"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwDetailPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-werbung"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwListPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/marken-auswahl"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopMarkenTinderPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-marken-tinder"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <RedirectToMarkenAuswahl />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-renamed-products"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopRenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/pick-rename-backshop"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <PickRenameBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-layout"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopLayoutSettingsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-rules"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopRulesPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-block-sort"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopBlockSortPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/backshop-gruppenregeln"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopWarengruppenGrundregelnPage />
                  </ListAreaGuard>
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
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="viewer" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopHubPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop-list"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop-kacheln"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopKachelCatalogPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop-werbung/:kw/:jahr"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwDetailPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/viewer/backshop-werbung"
              element={
                <ProtectedRoute>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwListPage />
                  </ListAreaGuard>
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
              path="/admin/obst/konfiguration"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminObstKonfigurationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/obst"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminObstHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop/konfiguration"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopKonfigurationHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop"
              element={
                <ProtectedRoute requireAdmin>
                  <BackshopHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/masterlist"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="user" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hidden-items"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenItems />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/custom-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <CustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hidden-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pick-hide-obst"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickHideObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/offer-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <OfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/renamed-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <RenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pick-rename-obst"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickRenameObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-list"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-kacheln"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopKachelCatalogPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-custom-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopCustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-hidden-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopHiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pick-hide-backshop"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <PickHideBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-offer-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopOfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-werbung/:kw/:jahr"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwDetailPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-werbung"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwListPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-renamed-products"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopRenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pick-rename-backshop"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <PickRenameBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/marken-auswahl"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopMarkenTinderPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-marken-tinder"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <RedirectToMarkenAuswahl />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kassenmodus"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminKassenmodusPage />
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
            <Route
              path="/admin/layout"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <LayoutSettingsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rules"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <RulesPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/block-sort"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <BlockSortPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/obst-warengruppen"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <ObstWarengruppenPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-layout"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopLayoutSettingsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-rules"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopRulesPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-block-sort"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopBlockSortPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-gruppenregeln"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWarengruppenGrundregelnPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/backshop-warengruppen"
              element={
                <ProtectedRoute requireAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWarengruppenPage />
                  </ListAreaGuard>
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
              path="/super-admin/companies"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminCompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies/:companyId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminCompanyDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies/:companyId/stores/:storeId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminStoreDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/markt/obst/konfiguration"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <SuperAdminMarktObstKonfigurationPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/markt/backshop/konfiguration"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <SuperAdminMarktBackshopKonfigurationPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/obst"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <SuperAdminObstBereichPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <SuperAdminBackshopBereichPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/masterlist"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="admin" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/masterlist/version/:versionId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <MasterList mode="admin" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/hidden-items"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenItems />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/custom-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <CustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/hidden-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <HiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/pick-hide-obst"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickHideObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/offer-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <OfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/renamed-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <RenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/pick-rename-obst"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <PickRenameObstPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/plu-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <PLUUploadPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/central-werbung/obst"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <CentralCampaignUploadPage listType="obst" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-list"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-kacheln"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopKachelCatalogPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-list/version/:versionId"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopMasterList />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-warengruppen"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWarengruppenPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-custom-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopCustomProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-hidden-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopHiddenProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/pick-hide-backshop"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <PickHideBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-offer-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopOfferProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-werbung/:kw/:jahr"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwDetailPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-werbung"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWerbungKwListPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-renamed-products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopRenamedProductsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/pick-rename-backshop"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <PickRenameBackshopPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/marken-auswahl"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopMarkenTinderPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-marken-tinder"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <RedirectToMarkenAuswahl />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopAllSourcesUploadPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-upload/:source"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopUploadWizardLayout />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<BackshopUploadStepUpload />} />
              <Route path="review" element={<BackshopUploadStepReview />} />
              <Route path="assign" element={<BackshopUploadStepAssign />} />
              <Route path="preview" element={<BackshopUploadStepPreview />} />
              <Route path="done" element={<BackshopUploadStepDone />} />
            </Route>
            <Route
              path="/super-admin/backshop-harry-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <Navigate to="/super-admin/backshop-upload/harry" replace />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-aryzta-upload"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <Navigate to="/super-admin/backshop-upload/aryzta" replace />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-product-groups/neu"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <SuperAdminBackshopProductGroupComposePage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-product-groups"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <SuperAdminBackshopProductGroupsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/central-werbung/backshop"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <CentralCampaignUploadPage listType="backshop" />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/layout"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <LayoutSettingsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/rules"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <RulesPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/block-sort"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <BlockSortPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/obst-warengruppen"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <ObstWarengruppenPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-layout"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopLayoutSettingsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-rules"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopRulesPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-block-sort"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopBlockSortPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-gruppenregeln"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopWarengruppenGrundregelnPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/versions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <VersionsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-versions"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <BackshopVersionsPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/versions/werbung/obst/:kw/:jahr/:kind"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="obst_gemuese">
                    <SuperAdminObstCampaignEditPage />
                  </ListAreaGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/backshop-versions/werbung/:kw/:jahr"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <ListAreaGuard listType="backshop">
                    <SuperAdminBackshopCampaignEditPage />
                  </ListAreaGuard>
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
            <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          </TutorialOrchestratorProvider>
        </BrowserRouter>

        {/* Toast Notifications (global) */}
        <Toaster position="top-right" richColors closeButton />
        <SpeedInsights />
      </TooltipProvider>
      </TestModeProvider>
    </PersistQueryClientProvider>
  )
}

export default App
