import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'

/** Nur Rolle kiosk darf /kiosk/* oeffnen. */
export function KioskAreaGuard({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useAuth()
  if (isLoading) {
    return <LoadingSkeleton />
  }
  if (profile?.role !== 'kiosk') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
