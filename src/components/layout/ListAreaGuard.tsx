import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useEffectiveListVisibility, type ListTypeKey } from '@/hooks/useStoreListVisibility'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

interface ListAreaGuardProps {
  listType: ListTypeKey
  children: ReactNode
}

/** Home je nach erstem URL-Segment (Deep-Link-Schutz bei ausgeschaltetem Markt/User-Bereich) */
function homeForPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0]
  if (seg === 'viewer') return '/viewer'
  if (seg === 'admin') return '/admin'
  if (seg === 'super-admin') return '/super-admin'
  return '/user'
}

/**
 * Leitet weg, wenn Obst/Gemüse oder Backshop für den aktuellen Markt + User effektiv nicht sichtbar ist.
 * Ohne Marktkontext bleibt Zugriff erlaubt (Super-Admin global).
 */
export function ListAreaGuard({ listType, children }: ListAreaGuardProps) {
  const location = useLocation()
  const { obstGemuese, backshop, isLoading } = useEffectiveListVisibility()

  const visible = listType === 'obst_gemuese' ? obstGemuese : backshop

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-muted h-32 rounded-lg mx-auto max-w-7xl" />
      </DashboardLayout>
    )
  }

  if (!visible) {
    return <Navigate to={homeForPath(location.pathname)} replace />
  }

  return <>{children}</>
}
