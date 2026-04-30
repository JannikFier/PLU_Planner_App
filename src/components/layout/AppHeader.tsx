import { useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { getHomeDashboardPath } from '@/lib/effective-route-prefix'
import { SuperAdminUserPreviewDialog } from '@/components/layout/SuperAdminUserPreviewDialog'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useStoreAccessByUser } from '@/hooks/useStoreAccess'
import { useAllStores } from '@/hooks/useStores'
import { useCompanyById } from '@/hooks/useCompanies'
import { buildStoreUrl } from '@/lib/subdomain'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LogOut,
  Settings,
  User,
  Shield,
  Crown,
  ChevronLeft,
  Eye,
  Store,
  FlaskConical,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Play,
  X as XIcon,
} from 'lucide-react'
import { useTestMode } from '@/contexts/TestModeContext'
import { UnifiedNotificationBell } from '@/components/plu/UnifiedNotificationBell'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { APP_BRAND_NAME } from '@/lib/brand'
import {
  ADMIN_PATHS_WITH_OPTIONAL_BACK_TO,
  isSafeAdminBackToTarget,
  isSafeSuperAdminBackToTarget,
} from '@/lib/admin-back-navigation'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { cn } from '@/lib/utils'
import { useTutorialOrchestrator } from '@/hooks/useTutorialOrchestrator'
import { TutorialChecklistPopover } from '@/components/tutorial/TutorialChecklistPopover'
import { shouldShowNotificationBell } from '@/lib/notification-bell-visibility'

/**
 * App Header – wird auf allen geschützten Seiten angezeigt.
 * Zeigt Logo, Navigation und User-Menü.
 * Passt sich an die drei Rollen an: Super-Admin, Admin, User.
 */
export function AppHeader() {
  const { profile, isAdmin, isSuperAdmin, isViewer, logout, user } = useAuth()
  const { isUserPreviewActive, preview, exitUserPreview } = useUserPreview()
  const effectiveRole = useEffectiveRouteRole()
  const [userPreviewDialogOpen, setUserPreviewDialogOpen] = useState(false)
  const { isTestMode, enableTestMode, setShowExitConfirm } = useTestMode()
  const {
    isActive: tutorialActive,
    repeatIntroduction,
    payload: tutorialPayload,
    availableModules: tutorialModules,
    replayModule: tutorialReplayModule,
  } = useTutorialOrchestrator()
  const { storeName, isAdminDomain, currentStoreId } = useCurrentStore()
  const { data: userStoreAccess } = useStoreAccessByUser(user?.id)
  const { data: allStores } = useAllStores()
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId, storeId } = useParams<{ companyId?: string; storeId?: string }>()
  const { data: headerCompany } = useCompanyById(
    isSuperAdmin && companyId && !storeId ? companyId : undefined
  )

  // Super-Admin: Kontext für Kopfzeile – Dashboard/Global = kein Markt, Firma = Firmenname, Laden = Marktname
  const isSuperAdminStoreDetail = Boolean(
    isSuperAdmin && location.pathname.match(/^\/super-admin\/companies\/[^/]+\/stores\/[^/]+$/)
  )
  const isSuperAdminCompanyDetail = Boolean(
    isSuperAdmin && companyId && !storeId && location.pathname.startsWith(`/super-admin/companies/${companyId}`)
  )
  const isSuperAdminGlobal = isSuperAdmin && !isSuperAdminStoreDetail && !isSuperAdminCompanyDetail

  const appDomain = import.meta.env.VITE_APP_DOMAIN || 'localhost'

  // Verfuegbare Maerkte fuer den Markt-Switcher
  const accessibleStoreIds = userStoreAccess?.map(a => a.store_id) ?? []
  const accessibleStores = allStores?.filter(s => accessibleStoreIds.includes(s.id) && s.is_active) ?? []
  const showStoreSwitcher = accessibleStores.length > 1

  // Home-Pfad = Dashboard je nach Rolle (inkl. Super-Admin-Vorschau)
  const homePath = getHomeDashboardPath(profile?.role, preview)

  /** Super-Admin simuliert User/Viewer/Admin – Zurück-Navigation wie in diesem Bereich */
  const inSuperAdminPreview = isSuperAdmin && isUserPreviewActive
  const effectiveHomePath = homePath

  // Obst/Gemüse-Unter-Seiten (eigene Produkte, ausgeblendet, Werbung, umbenannt) → Zurück zur Masterliste
  const USER_OBST_SUB = ['/user/custom-products', '/user/hidden-products', '/user/offer-products', '/user/renamed-products', '/user/hidden-items', '/user/obst-warengruppen']
  const ADMIN_OBST_SUB = ['/admin/custom-products', '/admin/hidden-products', '/admin/offer-products', '/admin/renamed-products', '/admin/hidden-items', '/admin/obst-warengruppen']
  // Backshop-Unter-Seiten → Zurück zur Backshop-Liste
  const USER_BACKSHOP_SUB = ['/user/backshop-custom-products', '/user/backshop-hidden-products', '/user/backshop-offer-products', '/user/backshop-renamed-products', '/user/marken-auswahl', '/user/backshop-werbung']
  const ADMIN_BACKSHOP_SUB = ['/admin/backshop-custom-products', '/admin/backshop-hidden-products', '/admin/backshop-offer-products', '/admin/backshop-renamed-products', '/admin/marken-auswahl', '/admin/backshop-werbung']

  /** Zurück-Ziel für User-Bereich (/user) – Obst-Unter-Seiten → Masterliste, Backshop-Unter-Seiten → Backshop-Liste, Masterliste/Liste → Dashboard */
  function getUserAreaBackTarget(path: string): string | null {
    const pickerBack = resolvePickerBackTarget(path, location.state)
    if (pickerBack) return pickerBack
    if (path === '/user') return null
    if (USER_OBST_SUB.includes(path)) return '/user/masterlist'
    if (path === '/user/masterlist') return '/user'
    if (path.startsWith('/user/backshop-werbung/')) return '/user/backshop-werbung'
    if (USER_BACKSHOP_SUB.includes(path)) return '/user/backshop-list'
    if (path === '/user/backshop-list') return '/user'
    return '/user'
  }

  /** Zurück-Ziel für Viewer-Bereich (/viewer) */
  function getViewerAreaBackTarget(path: string): string | null {
    if (path === '/viewer') return null
    if (path.startsWith('/viewer/backshop-werbung/')) return '/viewer/backshop-werbung'
    if (path === '/viewer/backshop-werbung') return '/viewer/backshop-list'
    return '/viewer'
  }

  /** Zurück-Ziel für Admin-Bereich – Hierarchie wie Super-Admin Markt: /admin → /admin/obst|backshop → Liste|Konfiguration */
  function getAdminAreaBackTarget(path: string): string | null {
    const pickerBack = resolvePickerBackTarget(path, location.state)
    if (pickerBack) return pickerBack
    if (path === '/admin') return null

    const adminStateBackTo = (location.state as { backTo?: string } | null)?.backTo
    const adminQueryBackTo = new URLSearchParams(location.search).get('backTo')
    const adminBackTo = adminStateBackTo || adminQueryBackTo
    if (
      adminBackTo
      && (ADMIN_PATHS_WITH_OPTIONAL_BACK_TO as readonly string[]).includes(path)
      && isSafeAdminBackToTarget(adminBackTo)
    ) {
      return adminBackTo
    }

    if (path === '/admin/obst') return '/admin'
    if (path === '/admin/backshop') return '/admin'
    if (path === '/admin/obst/konfiguration') return '/admin/obst'
    if (path === '/admin/backshop/konfiguration') return '/admin/backshop'
    if (path === '/admin/users') return '/admin'

    if (path === '/admin/masterlist') return '/admin/obst'
    if (path === '/admin/backshop-list') return '/admin/backshop'
    if (path.startsWith('/admin/backshop-werbung/')) return '/admin/backshop-werbung'
    if (path === '/admin/backshop-werbung') return '/admin/backshop'

    if (
      path === '/admin/layout'
      || path === '/admin/rules'
      || path === '/admin/block-sort'
      || path === '/admin/obst-warengruppen'
    ) {
      return '/admin/obst/konfiguration'
    }
    if (
      path === '/admin/backshop-layout'
      || path === '/admin/backshop-rules'
      || path === '/admin/backshop-block-sort'
      || path === '/admin/backshop-warengruppen'
      || path === '/admin/backshop-gruppenregeln'
    ) {
      return '/admin/backshop/konfiguration'
    }

    if (ADMIN_OBST_SUB.includes(path)) return '/admin/masterlist'
    if (ADMIN_BACKSHOP_SUB.includes(path)) return '/admin/backshop-list'

    return '/admin'
  }

  /** Zurueck-Ziel fuer Super-Admin-Bereich – neue Hierarchie mit Upload/Firmen-Trennung */
  function getSuperAdminBackTarget(path: string): string | null {
    const pickerBack = resolvePickerBackTarget(path, location.state)
    if (pickerBack) return pickerBack
    // Backshop-Upload-Assistent (/backshop-upload/:quelle und Schritte) → Quellen-Übersicht
    // (vor backTo, sonst springt der Kopf-Pfeil z. B. zum Dashboard statt eine Ebene höher)
    if (path.startsWith('/super-admin/backshop-upload/')) {
      return '/super-admin/backshop-upload'
    }

    // Markt-nahe Backshop-Seiten (Masterliste, Konfig, Gruppenregeln, Marken-Auswahl …) → zuerst hier,
    // damit kein altes / falsches ?backTo= (z. B. Upload) den Kopf-Pfeil in die Upload-Welt schickt.
    if (path === '/super-admin/backshop-product-groups/neu') {
      return '/super-admin/backshop-product-groups'
    }

    // Archiv: KW aus Versionen (Auge) → zurück zur Versionsübersicht
    if (/^\/super-admin\/backshop-list\/version\/[^/]+$/.test(path)) {
      return '/super-admin/backshop-versions'
    }

    const saBackshopMarktUnter = [
      '/super-admin/backshop-list',
      '/super-admin/backshop-custom-products',
      '/super-admin/backshop-hidden-products',
      '/super-admin/backshop-offer-products',
      '/super-admin/backshop-renamed-products',
      '/super-admin/backshop-layout',
      '/super-admin/backshop-rules',
      '/super-admin/backshop-block-sort',
      '/super-admin/backshop-warengruppen',
      '/super-admin/backshop-gruppenregeln',
      '/super-admin/marken-auswahl',
      '/super-admin/backshop-product-groups',
      '/super-admin/backshop-werbung',
    ]
    if (path.startsWith('/super-admin/backshop-werbung/')) {
      return '/super-admin/backshop-werbung'
    }
    if (saBackshopMarktUnter.includes(path)) {
      const saStateBackTo = (location.state as { backTo?: string } | null)?.backTo
      const saQueryBackTo = new URLSearchParams(location.search).get('backTo')
      const saBackTo = saStateBackTo || saQueryBackTo
      if (saBackTo && isSafeSuperAdminBackToTarget(saBackTo)) {
        return saBackTo
      }
      if (path === '/super-admin/backshop-list') {
        return '/super-admin/backshop'
      }
      return '/super-admin/backshop'
    }

    // Markt-Konfiguration-Hubs (vor generischem backTo-Block; ohne backTo nicht ins Leere)
    if (path === '/super-admin/markt/obst/konfiguration' || path === '/super-admin/markt/backshop/konfiguration') {
      const hubBack = new URLSearchParams(location.search).get('backTo')
      if (hubBack && isSafeSuperAdminBackToTarget(hubBack)) return hubBack
      return '/super-admin'
    }

    // Wurde von einer Markt-Detailseite hierher navigiert? state oder URL (bleibt nach Reload erhalten)
    const stateBackTo = (location.state as { backTo?: string } | null)?.backTo
    const queryBackTo = new URLSearchParams(location.search).get('backTo')
    const backTo = stateBackTo || queryBackTo
    if (backTo && path.startsWith('/super-admin/') && !path.startsWith('/super-admin/companies')) {
      return backTo
    }

    // Dashboard = Startseite
    if (path === '/super-admin') return null

    // Upload-Bereich (global)
    if (path === '/super-admin/upload') return '/super-admin'
    if (path === '/super-admin/obst') return '/super-admin/upload'
    if (path === '/super-admin/backshop') return '/super-admin/upload'

    // Obst-Global-Unterseiten → Obst-Bereichsseite
    const obstGlobalSub = ['/super-admin/plu-upload', '/super-admin/versions', '/super-admin/central-werbung/obst']
    if (obstGlobalSub.includes(path)) return '/super-admin/obst'

    // Backshop-Global-Unterseiten → Backshop-Bereichsseite
    const backshopGlobalSub = [
      '/super-admin/backshop-upload',
      '/super-admin/backshop-versions',
      '/super-admin/central-werbung/backshop',
    ]
    if (backshopGlobalSub.includes(path)) return '/super-admin/backshop'

    // KW-Werbung bearbeiten (Unterseite von Backshop-Versionen)
    if (path.startsWith('/super-admin/backshop-versions/werbung/')) {
      return '/super-admin/backshop-versions'
    }

    // KW-Werbung bearbeiten (Unterseite von Obst-Versionen)
    if (path.startsWith('/super-admin/versions/werbung/obst/')) {
      return '/super-admin/versions'
    }

    // Firmen-Verwaltung
    if (path === '/super-admin/companies') return '/super-admin'
    if (path === '/super-admin/users') return '/super-admin'

    // Firma-Detail → Firmen-Uebersicht
    if (path.match(/^\/super-admin\/companies\/[^/]+$/)) return '/super-admin/companies'

    // Store-Detail: Zurueck haengt vom ?view-Parameter ab
    const storeMatch = path.match(/^\/super-admin\/companies\/([^/]+)\/stores\/[^/]+$/)
    if (storeMatch) {
      const viewParam = new URLSearchParams(location.search).get('view')
      const companyPath = `/super-admin/companies/${storeMatch[1]}`
      const storePath = path

      if (!viewParam || viewParam === 'overview') return companyPath
      if (viewParam === 'listen') return storePath
      if (viewParam === 'listen-obst' || viewParam === 'listen-backshop') return `${storePath}?view=listen`
      if (viewParam === 'benutzer' || viewParam === 'einstellungen') return storePath
      return storePath
    }

    // Marktspezifische Listen-/Konfig-Seiten (masterlist, custom-products, etc.)
    // Wurden mit state.backTo navigiert → oben schon abgefangen.
    // Fallback: Obst-Unterseiten → /super-admin/obst, Backshop → /super-admin/backshop
    const obstSub = ['/super-admin/masterlist', '/super-admin/custom-products', '/super-admin/hidden-products', '/super-admin/offer-products', '/super-admin/renamed-products', '/super-admin/hidden-items', '/super-admin/layout', '/super-admin/rules', '/super-admin/block-sort', '/super-admin/obst-warengruppen']
    if (obstSub.includes(path)) return '/super-admin/obst'

    return '/super-admin'
  }

  const backTarget = (() => {
    const path = location.pathname
    if (isSuperAdmin) {
      if (inSuperAdminPreview) {
        if (path.startsWith('/user')) return getUserAreaBackTarget(path)
        if (path.startsWith('/viewer')) return getViewerAreaBackTarget(path)
        if (path.startsWith('/admin')) return getAdminAreaBackTarget(path)
        return null
      }
      return getSuperAdminBackTarget(path)
    }
    if (path.startsWith('/user')) return getUserAreaBackTarget(path)
    if (path.startsWith('/viewer')) return getViewerAreaBackTarget(path)
    if (path.startsWith('/admin')) return getAdminAreaBackTarget(path)
    if (path === homePath) return null
    return homePath
  })()

  const showBack = backTarget != null

  // Initialen für Avatar berechnen
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? '??'

  // Rollen-Anzeige (Vorschau: simulierte Rolle kennzeichnen)
  const previewRoleLabel =
    inSuperAdminPreview && preview?.simulatedRole === 'user'
      ? 'Vorschau: User'
      : inSuperAdminPreview && preview?.simulatedRole === 'viewer'
        ? 'Vorschau: Viewer'
        : inSuperAdminPreview && preview?.simulatedRole === 'admin'
          ? 'Vorschau: Admin'
          : null
  const roleLabel =
    previewRoleLabel
    ?? (isSuperAdmin ? 'Super-Admin' : isAdmin ? 'Admin' : isViewer ? 'Viewer' : null)
  const RoleIcon = previewRoleLabel ? Eye : isSuperAdmin ? Crown : isAdmin ? Shield : Eye

  /** Untertitel unter dem App-Namen – weniger Abstand zur Titelzeile (z. B. Fier Hub / Super-Administration) */
  const brandSubtitleClass = 'text-xs text-muted-foreground leading-tight block -mt-0.5'

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // State ist trotzdem geleert, Redirect ausführen
    } finally {
      navigate('/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Links: Zurück-Button + Logo */}
        <div className="flex items-center gap-3">
          {showBack && backTarget && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backTarget)}
              className="mr-1"
              aria-label="Zurück"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => navigate(effectiveHomePath)}
          >
            <AppBrandLogo />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-none tracking-tight">{APP_BRAND_NAME}</h1>
              {/* Super-Admin: Dashboard/Global = kein Markt, Firma = Firmenname, Laden = Marktname */}
              {isSuperAdminGlobal && !inSuperAdminPreview && (
                <span className={brandSubtitleClass}>Super-Administration</span>
              )}
              {isSuperAdminStoreDetail && storeName && (
                <span className={cn(brandSubtitleClass, 'truncate max-w-[150px] sm:max-w-none')}>{storeName}</span>
              )}
              {isSuperAdminCompanyDetail && headerCompany?.name && (
                <span className={cn(brandSubtitleClass, 'truncate max-w-[150px] sm:max-w-none')}>{headerCompany.name}</span>
              )}
              {/* Marktname: auch in User-Vorschau (Super-Admin mit simuliertem Kontext) */}
              {(!isSuperAdmin || inSuperAdminPreview) && storeName && !isAdminDomain && (
                <span className={cn(brandSubtitleClass, 'truncate max-w-[150px] sm:max-w-none')}>{storeName}</span>
              )}
              {!isSuperAdmin && isAdminDomain && isAdmin && (
                <span className={brandSubtitleClass}>Administration</span>
              )}
              {inSuperAdminPreview && isAdminDomain && preview?.simulatedRole === 'admin' && (
                <span className={brandSubtitleClass}>Administration</span>
              )}
              {!isSuperAdmin && !isAdminDomain && !storeName && isAdmin && (
                <span className={brandSubtitleClass}>Administration</span>
              )}
              {!isSuperAdmin && !isAdminDomain && !storeName && isViewer && (
                <span className={brandSubtitleClass}>Nur Ansicht</span>
              )}
              {inSuperAdminPreview && !storeName && preview?.simulatedRole === 'viewer' && (
                <span className={brandSubtitleClass}>Nur Ansicht</span>
              )}
            </div>
          </div>
        </div>

        {/* Rechts: Rollen-Badge + User-Menü */}
        <div className="flex items-center gap-3">
          {/* Rollen-Badge */}
          {roleLabel && (
            <div className={cn(
              'hidden sm:flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
              previewRoleLabel ? 'bg-sky-100 text-sky-900' : isSuperAdmin ? 'bg-amber-100 text-amber-800' : isAdmin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <RoleIcon className="h-3 w-3" />
              {roleLabel}
            </div>
          )}

          {/* Eine Glocke: Obst + Backshop – nicht für Viewer/Super-Admin (Vorschau: effektive Rolle).
              Bug 3 Fix (PR 2.7): nur auf Routen sichtbar, auf denen sie Listen-/Versions-
              Notifications zeigen kann. shouldShowNotificationBell kapselt die Whitelist. */}
          {shouldShowNotificationBell(effectiveRole, location.pathname) && <UnifiedNotificationBell />}

          {/* Onboarding-Checklist-Popover: Status aller Module + Wiederholen-Buttons. */}
          {tutorialActive && (
            <TutorialChecklistPopover
              payload={tutorialPayload}
              availableModules={tutorialModules}
              onReplayModule={tutorialReplayModule}
              onRestartAll={() => void repeatIntroduction('restart')}
            />
          )}

          {/* Rundgang-Icon: immer sichtbar, wenn Tutorial-Orchestrator aktiv ist. */}
          {tutorialActive && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Rundgang starten"
                  title="Rundgang starten"
                  data-tour="header-tutorial-icon"
                  className="relative h-9 w-9"
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" data-tour="header-tutorial-content">
                <DropdownMenuItem
                  data-tour="header-tutorial-continue"
                  onClick={() => void repeatIntroduction('continue')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Weiter wo ich war
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-tour="header-tutorial-restart"
                  onClick={() => void repeatIntroduction('restart')}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Von vorn starten
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-tour="header-tutorial-cancel"
                  onClick={() => {
                    /* Schließen reicht – kein Side-Effect */
                  }}
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Abbrechen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-tour="profile-menu">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    'text-sm font-medium',
                    previewRoleLabel ? 'bg-sky-100 text-sky-900' : isSuperAdmin ? 'bg-amber-100 text-amber-800' : isAdmin ? 'bg-primary/10 text-primary' : isViewer ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-tour="header-profile-content">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">
                    {profile?.display_name || 'Benutzer'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />

              {/* Super-Admin: User-Vorschau starten / beenden */}
              {isSuperAdmin && inSuperAdminPreview && (
                <DropdownMenuItem
                  onClick={() => {
                    void (async () => {
                      await exitUserPreview()
                      navigate('/super-admin')
                    })()
                  }}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Zur Super-Admin-Ansicht
                </DropdownMenuItem>
              )}
              {isSuperAdmin && !inSuperAdminPreview && (
                <DropdownMenuItem onClick={() => setUserPreviewDialogOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  User-Vorschau (Firma &amp; Markt)
                </DropdownMenuItem>
              )}

              {/* Admin (nicht Super-Admin): nur Admin-Bereich */}
              {isAdmin && !isSuperAdmin && (
                <DropdownMenuItem
                  data-tour="header-admin-area"
                  onClick={() => navigate('/admin')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin-Bereich
                </DropdownMenuItem>
              )}

              {/* Testmodus-Toggle (Viewer und Vorschau-Viewer ausblenden) */}
              {effectiveRole !== 'viewer' && (
                <DropdownMenuItem
                  data-tour="header-testmode-menu-item"
                  onClick={() => {
                    if (isTestMode) {
                      setShowExitConfirm(true)
                    } else {
                      enableTestMode()
                    }
                  }}
                >
                  <FlaskConical className="mr-2 h-4 w-4" />
                  {isTestMode ? 'Testmodus beenden' : 'Testmodus starten'}
                </DropdownMenuItem>
              )}

              {/* Markt wechseln (nur wenn User mehrere Maerkte hat) */}
              {showStoreSwitcher && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger data-tour="header-store-switcher">
                    <Store className="mr-2 h-4 w-4" />
                    Markt wechseln
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {accessibleStores.map(store => (
                      <DropdownMenuItem
                        key={store.id}
                        disabled={store.id === currentStoreId}
                        onClick={() => {
                          const url = buildStoreUrl(store.subdomain, appDomain)
                          window.location.href = url
                        }}
                      >
                        {store.name}
                        {store.id === currentStoreId && (
                          <span className="ml-auto text-xs text-muted-foreground">Aktiv</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />
              {tutorialActive && (!isSuperAdmin || inSuperAdminPreview) && (
                <DropdownMenuItem
                  data-tour="header-replay-intro"
                  onClick={() => void repeatIntroduction()}
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Einführung wiederholen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                data-tour="header-logout"
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SuperAdminUserPreviewDialog open={userPreviewDialogOpen} onOpenChange={setUserPreviewDialogOpen} />
    </header>
  )
}
