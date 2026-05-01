/**
 * Rollenbasierter Redirect von / (Startseite).
 * Alle Rollen landen auf ihrem Dashboard (Spot); von dort aus z.B. Masterliste.
 */

import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { getHomeDashboardPath } from '@/lib/effective-route-prefix'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'
import { extractSubdomain, isAdminSubdomain, normalizeViteAppDomain } from '@/lib/subdomain'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const APP_DOMAIN = normalizeViteAppDomain(import.meta.env.VITE_APP_DOMAIN)

export function HomeRedirect() {
  const { user, profile, isLoading } = useAuth()
  const { preview } = useUserPreview()

  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const sub = host ? extractSubdomain(host, APP_DOMAIN) : null
  const isMarketSubdomain = Boolean(sub && !isAdminSubdomain(sub))

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!user) {
    if (isMarketSubdomain) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="max-w-lg shadow-sm">
            <CardHeader>
              <CardTitle>Nur Markt-Adresse in der Zeile</CardTitle>
              <CardDescription className="space-y-2 text-base">
                <p>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{host}</code> ist bewusst „kurz“: Das ist
                  nur der <strong>Markt-Host</strong> (hier: {sub}). Für den <strong>Kassenmodus</strong> brauchen Sie
                  den <strong>vollständigen Einstiegs-Link</strong> aus dem Kassenmodus in der Verwaltung – der
                  enthält immer <code className="rounded bg-muted px-1.5 text-sm">/kasse/</code> und einen langen Code.
                  Ohne diesen Teil öffnet sich die normale Startseite; die ist ohne Anmeldung zunächst leer bzw. lädt
                  kurz.
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/login">Zur Anmeldung (Personal)</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return <Navigate to="/login" replace />
  }

  // Profil muss geladen sein, sonst falscher Redirect (z.B. Admin landet in /user)
  if (!profile) {
    return <LoadingSkeleton />
  }

  const home = getHomeDashboardPath(profile?.role, preview)
  return <Navigate to={home} replace />
}
