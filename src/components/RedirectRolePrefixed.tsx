// Leitet /offer-products etc. auf /user/… bzw. /admin/… – verhindert 404 bei fehlendem Rollen-Prefix

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { getEffectiveRouteRole } from '@/lib/effective-route-prefix'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'

export function RedirectRolePrefixed({ segment }: { segment: string }) {
  const { profile, isLoading } = useAuth()
  const { preview } = useUserPreview()

  if (isLoading || !profile) {
    return <LoadingSkeleton />
  }

  const role = getEffectiveRouteRole(profile.role, preview)

  // Viewer: nur Masterliste / Backshop-Liste – keine Konfig-URLs
  if (role === 'viewer') {
    const to = segment.startsWith('backshop-') ? '/viewer/backshop-list' : '/viewer/masterlist'
    return <Navigate to={to} replace />
  }

  const base =
    role === 'super_admin' ? '/super-admin' : role === 'admin' ? '/admin' : '/user'

  return <Navigate to={`${base}/${segment}`} replace />
}
