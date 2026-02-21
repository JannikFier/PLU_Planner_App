import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, Settings, User, Shield, Crown, ChevronLeft, Eye } from 'lucide-react'
import { NotificationBell } from '@/components/plu/NotificationBell'
import { BackshopNotificationBell } from '@/components/plu/BackshopNotificationBell'
import { cn } from '@/lib/utils'

/**
 * App Header – wird auf allen geschützten Seiten angezeigt.
 * Zeigt Logo, Navigation und User-Menü.
 * Passt sich an die drei Rollen an: Super-Admin, Admin, User.
 */
export function AppHeader() {
  const { profile, isAdmin, isSuperAdmin, isViewer, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Home-Pfad = Dashboard je nach Rolle
  const homePath = isSuperAdmin ? '/super-admin' : isAdmin ? '/admin' : isViewer ? '/viewer' : '/user'

  // Super-Admin in User-/Viewer-Ansicht: gleicher Zurück-Flow wie echter User, Wechsel nur über Avatar-Menü
  const viewingAsUser = isSuperAdmin && (location.pathname.startsWith('/user') || location.pathname.startsWith('/viewer'))
  // Logo-Klick: in User-Ansicht zum User-/Viewer-Dashboard, sonst normales homePath
  const effectiveHomePath = viewingAsUser
    ? (location.pathname.startsWith('/user') ? '/user' : '/viewer')
    : homePath

  // Backshop-Unter-Seiten (eigene Produkte, ausgeblendet, umbenannt) → Zurück zur Backshop-Liste
  const USER_BACKSHOP_SUB = ['/user/backshop-custom-products', '/user/backshop-hidden-products', '/user/backshop-renamed-products']
  const ADMIN_BACKSHOP_SUB = ['/admin/backshop-custom-products', '/admin/backshop-hidden-products', '/admin/backshop-renamed-products']

  /** Zurück-Ziel für User-Bereich (/user) – inkl. zweite Stufe Backshop (Unter-Seite → Liste → Dashboard) */
  function getUserAreaBackTarget(path: string): string | null {
    if (path === '/user') return null
    if (USER_BACKSHOP_SUB.includes(path)) return '/user/backshop-list'
    if (path === '/user/backshop-list') return '/user'
    return '/user'
  }

  /** Zurück-Ziel für Viewer-Bereich (/viewer) */
  function getViewerAreaBackTarget(path: string): string | null {
    if (path === '/viewer') return null
    return '/viewer'
  }

  /** Zurück-Ziel für Admin-Bereich (/admin) – inkl. zweite Stufe Backshop */
  function getAdminAreaBackTarget(path: string): string | null {
    if (path === '/admin') return null
    if (ADMIN_BACKSHOP_SUB.includes(path)) return '/admin/backshop-list'
    if (path === '/admin/backshop-list') return '/admin'
    return '/admin'
  }

  const backTarget = (() => {
    const path = location.pathname
    if (isSuperAdmin) {
      if (viewingAsUser) {
        if (path.startsWith('/user')) return getUserAreaBackTarget(path)
        return getViewerAreaBackTarget(path)
      }
      if (path === '/super-admin') return null
      if (path.startsWith('/super-admin/backshop-')) return '/super-admin/backshop'
      if (path === '/super-admin/backshop') return '/super-admin'
      const obstSubPaths = ['/super-admin/layout', '/super-admin/rules', '/super-admin/block-sort', '/super-admin/versions', '/super-admin/masterlist', '/super-admin/custom-products', '/super-admin/hidden-products', '/super-admin/renamed-products', '/super-admin/plu-upload', '/super-admin/hidden-items']
      if (obstSubPaths.some((p) => path === p)) return '/super-admin/obst'
      if (path === '/super-admin/obst') return '/super-admin'
      if (path === '/super-admin/users') return '/super-admin'
      return homePath
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

  // Rollen-Anzeige
  const roleLabel = isSuperAdmin ? 'Super-Admin' : isAdmin ? 'Admin' : isViewer ? 'Viewer' : null
  const RoleIcon = isSuperAdmin ? Crown : isAdmin ? Shield : Eye

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              PLU
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">PLU Planner</h1>
              {isSuperAdmin && (
                <span className="text-xs text-muted-foreground">Super-Administration</span>
              )}
              {isAdmin && !isSuperAdmin && (
                <span className="text-xs text-muted-foreground">Administration</span>
              )}
              {isViewer && (
                <span className="text-xs text-muted-foreground">Nur Ansicht</span>
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
              isSuperAdmin ? 'bg-amber-100 text-amber-800' : isAdmin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <RoleIcon className="h-3 w-3" />
              {roleLabel}
            </div>
          )}

          {/* Benachrichtigungs-Glocke nur für Admin/User (nicht Super-Admin, nicht Viewer) */}
          {!isSuperAdmin && !isViewer && <NotificationBell />}
          {/* Backshop-Glocke nur auf Backshop-Seiten, nie für Super-Admin */}
          {!isSuperAdmin && !isViewer && location.pathname.includes('backshop') && <BackshopNotificationBell />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    'text-sm font-medium',
                    isSuperAdmin ? 'bg-amber-100 text-amber-800' : isAdmin ? 'bg-primary/10 text-primary' : isViewer ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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

              {/* Super-Admin: Wechsel User-Ansicht ↔ Super-Admin-Ansicht nur über dieses Menü */}
              {isSuperAdmin && viewingAsUser && (
                <DropdownMenuItem onClick={() => navigate('/super-admin')}>
                  <Crown className="mr-2 h-4 w-4" />
                  Zur Super-Admin-Ansicht
                </DropdownMenuItem>
              )}
              {isSuperAdmin && !viewingAsUser && (
                <DropdownMenuItem onClick={() => navigate('/user')}>
                  <User className="mr-2 h-4 w-4" />
                  User-Ansicht (wie Mitarbeiter)
                </DropdownMenuItem>
              )}

              {/* Admin (nicht Super-Admin): nur Admin-Bereich */}
              {isAdmin && !isSuperAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin-Bereich
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
