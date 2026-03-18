/**
 * Rollenbasierter Redirect von / (Startseite).
 * Alle Rollen landen auf ihrem Dashboard (Spot); von dort aus z.B. Masterliste.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'

export function HomeRedirect() {
  const { user, profile, isLoading, isSuperAdmin, isAdmin, isViewer } = useAuth()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Profil muss geladen sein, sonst falscher Redirect (z.B. Admin landet in /user)
  if (!profile) {
    return <LoadingSkeleton />
  }

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isViewer) return <Navigate to="/viewer" replace />
  return <Navigate to="/user" replace />
}
