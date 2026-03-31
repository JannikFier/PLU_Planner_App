import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { getEffectiveRouteRole } from '@/lib/effective-route-prefix'

/** Rolle für Routing und UI-Vorschau (Super-Admin-Vorschau → simulierte Rolle). */
export function useEffectiveRouteRole(): string {
  const { profile } = useAuth()
  const { preview } = useUserPreview()
  return getEffectiveRouteRole(profile?.role, preview)
}
