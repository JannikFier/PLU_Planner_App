import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Nur admin + super_admin haben Zugang */
  requireAdmin?: boolean
  /** Nur super_admin hat Zugang */
  requireSuperAdmin?: boolean
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

  // Laden: Spinner anzeigen
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Nicht eingeloggt → Login-Seite
  if (!user) {
    return <Navigate to="/login" replace />
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

  // Wenn User auf eine Route kommt die nicht seiner Rolle entspricht
  // (z.B. User versucht /admin zu öffnen)
  if (!requireAdmin && !requireSuperAdmin && profile?.role === 'super_admin') {
    // Super-Admin darf alles – kein Redirect nötig
  }

  return <>{children}</>
}
