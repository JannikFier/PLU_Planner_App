/**
 * Rollenbasierter Redirect von / (Startseite).
 * Alle Rollen landen auf ihrem Dashboard (Spot); von dort aus z.B. Masterliste.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { getHomeDashboardPath } from '@/lib/effective-route-prefix'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'

export function HomeRedirect() {
  const { user, profile, isLoading } = useAuth()
  const { preview } = useUserPreview()

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

  const home = getHomeDashboardPath(profile?.role, preview)
  return <Navigate to={home} replace />
}
