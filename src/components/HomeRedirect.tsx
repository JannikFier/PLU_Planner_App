/**
 * Rollenbasierter Redirect von / (Startseite).
 * Alle Rollen landen auf ihrem Dashboard (Spot); von dort aus z.B. Masterliste.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function HomeRedirect() {
  const { user, isLoading, isSuperAdmin, isAdmin, isViewer } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isViewer) return <Navigate to="/viewer" replace />
  return <Navigate to="/user" replace />
}
