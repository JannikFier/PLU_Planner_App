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
import { LogOut, Settings, User, Shield, Crown, ChevronLeft } from 'lucide-react'
import { NotificationBell } from '@/components/plu/NotificationBell'
import { cn } from '@/lib/utils'

/**
 * App Header – wird auf allen geschützten Seiten angezeigt.
 * Zeigt Logo, Navigation und User-Menü.
 * Passt sich an die drei Rollen an: Super-Admin, Admin, User.
 */
export function AppHeader() {
  const { profile, isAdmin, isSuperAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Home-Pfad = Dashboard je nach Rolle (einheitlich: Pfeil führt zurück zum Dashboard)
  const homePath = isSuperAdmin ? '/super-admin' : isAdmin ? '/admin' : '/user'

  // Zurück-Button zeigen, wenn nicht auf dem eigenen Dashboard
  const showBack = location.pathname !== homePath

  // Initialen für Avatar berechnen
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? '??'

  // Rollen-Anzeige
  const roleLabel = isSuperAdmin ? 'Super-Admin' : isAdmin ? 'Admin' : null
  const RoleIcon = isSuperAdmin ? Crown : Shield

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Links: Zurück-Button + Logo */}
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(homePath)}
              className="mr-1"
              aria-label="Zurück"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => navigate(homePath)}
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
            </div>
          </div>
        </div>

        {/* Rechts: Rollen-Badge + User-Menü */}
        <div className="flex items-center gap-3">
          {/* Rollen-Badge */}
          {roleLabel && (
            <div className={cn(
              'hidden sm:flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
              isSuperAdmin ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary'
            )}>
              <RoleIcon className="h-3 w-3" />
              {roleLabel}
            </div>
          )}

          {/* Benachrichtigungs-Glocke nur für Admin/User (Super-Admin nutzt Karte „Benachrichtigungen“ auf dem Dashboard) */}
          {!isSuperAdmin && <NotificationBell />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    'text-sm font-medium',
                    isSuperAdmin ? 'bg-amber-100 text-amber-800' : isAdmin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
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

              {/* Super-Admin: nur User-Ansicht (Dashboard/Masterliste über Logo und Pfeil) */}
              {isSuperAdmin && (
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
