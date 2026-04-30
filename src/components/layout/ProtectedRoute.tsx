import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Nur admin + super_admin haben Zugang */
  requireAdmin?: boolean
  /** Nur super_admin hat Zugang */
  requireSuperAdmin?: boolean
}

/** App-Shell-Skeleton statt blankem Spinner – wirkt sofort schneller. Exportiert für HomeRedirect. */
export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header-Skeleton */}
      <div className="border-b bg-card">
        <div className="flex h-14 items-center gap-4 px-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      {/* Content-Skeleton */}
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Schützt Routen vor unautorisiertem Zugriff.
 * - Nicht eingeloggt → Redirect zu /login
 * - must_change_password → Redirect zu /change-password (außer wenn bereits dort)
 * - Super-Admin-Route ohne super_admin → Redirect zum eigenen Dashboard
 * - Admin-Route ohne admin/super_admin → Redirect zu /user
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { user, profile, isAdmin, isSuperAdmin, mustChangePassword, isLoading } = useAuth()
  const isChangePasswordPage = location.pathname === '/change-password'

  // Viewer und Kasse duerfen keine Admin/Super-Admin-Routen betreten
  if ((requireAdmin || requireSuperAdmin) && (profile?.role === 'viewer' || profile?.role === 'kiosk')) {
    return <Navigate to={profile?.role === 'kiosk' ? '/kiosk' : '/viewer'} replace />
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Nicht eingeloggt → Login-Seite (ursprüngliche Route merken für Redirect nach Login)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Kassenmodus: nur /kiosk und /kasse (Anmelde-Flow), kein Zugriff auf normale App-Routen
  if (profile?.role === 'kiosk') {
    const path = location.pathname
    const allowed =
      path.startsWith('/kiosk') ||
      path.startsWith('/kasse') ||
      path === '/login'
    if (!allowed) {
      return <Navigate to="/kiosk" replace />
    }
  }

  // Einmalpasswort: Muss zuerst Passwort ändern (außer wenn bereits auf der Seite)
  if (mustChangePassword && !isChangePasswordPage) {
    return <Navigate to="/change-password" replace />
  }

  // Super-Admin-Route, aber kein Super-Admin
  if (requireSuperAdmin && !isSuperAdmin) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/user" replace />
  }

  // Admin-Route, aber kein Admin/Super-Admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/user" replace />
  }

  return <>{children}</>
}
