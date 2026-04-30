import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KIOSK_ENTRANCE_TOKEN_STORAGE_KEY } from '@/lib/kiosk-entrance-storage'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { APP_BRAND_NAME } from '@/lib/brand'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Schlankes Layout fuer Kassenmodus: Tabs Obst/Backshop, Abmelden (QR-Einstieg bleibt in sessionStorage).
 * Wenn der Super-Admin den Kassenmodus am Markt deaktiviert, erscheint ein Hinweis statt der Listen.
 */
export function KioskLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { obstGemuese, backshop, kiosk, isLoading } = useEffectiveListVisibility()

  const handleLogout = async () => {
    const token = sessionStorage.getItem(KIOSK_ENTRANCE_TOKEN_STORAGE_KEY)
    try {
      await logout()
    } catch {
      /* optimistisch bereits ausgeloggt */
    }
    if (token) {
      navigate(`/kasse/${token}`, { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
    )

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!kiosk) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card shrink-0">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AppBrandLogo />
              <span className="text-lg font-semibold truncate">{APP_BRAND_NAME}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
              <LogOut className="h-4 w-4 mr-1" />
              Abmelden
            </Button>
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-lg w-full px-4 py-10 sm:px-6 flex items-start justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Kassenmodus nicht verfügbar</CardTitle>
              <CardDescription>
                Für diesen Markt wurde der Kassenmodus deaktiviert. Bitte wende dich an die Zentrale oder scanne einen
                aktuellen QR-Code, sobald der Modus wieder freigeschaltet ist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Du wurdest nicht automatisch abgemeldet – mit Abmelden beendest du die Sitzung auf diesem Gerät.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AppBrandLogo />
            <span className="text-lg font-semibold truncate">{APP_BRAND_NAME}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Kassenmodus</span>
          </div>
          <nav className="flex items-center gap-1 flex-1 justify-center sm:justify-start sm:pl-4">
            {obstGemuese && (
              <NavLink to="/kiosk/obst" className={tabClass} end={false}>
                Obst und Gemüse
              </NavLink>
            )}
            {backshop && (
              <NavLink to="/kiosk/backshop" className={tabClass}>
                Backshop
              </NavLink>
            )}
          </nav>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
            <LogOut className="h-4 w-4 mr-1" />
            Abmelden
          </Button>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-4 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
