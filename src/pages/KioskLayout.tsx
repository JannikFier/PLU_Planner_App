import { useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Apple, Croissant, LogOut, Search } from 'lucide-react'
import { CashRegisterIcon } from '@/components/icons/CashRegisterIcon'
import { cn } from '@/lib/utils'
import { KIOSK_ENTRANCE_TOKEN_STORAGE_KEY } from '@/lib/kiosk-entrance-storage'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { APP_BRAND_NAME } from '@/lib/brand'
import { LoadingSkeleton } from '@/components/layout/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KioskListFindProvider, useKioskListFindControls } from '@/contexts/KioskListFindContext'

function KioskHeaderChrome({
  obstGemuese,
  backshop,
  handleLogout,
  centerContextLine,
}: {
  obstGemuese: boolean
  backshop: boolean
  handleLogout: () => void | Promise<void>
  centerContextLine: string
}) {
  const location = useLocation()
  const { triggerListFind, headerSummary } = useKioskListFindControls()
  const isBackshopRoute = location.pathname.includes('/kiosk/backshop')
  const findTourId = isBackshopRoute ? 'backshop-master-find-trigger' : 'masterlist-search'
  const listToolbarTourId = isBackshopRoute ? 'backshop-master-toolbar' : 'obst-master-toolbar'

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex flex-1 min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:min-w-[12.5rem] sm:px-6 sm:py-3',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'border border-border/80 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
    )

  const contextTitle = centerContextLine || '—'

  return (
    <header className="border-b bg-card shrink-0">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-2 sm:px-6">
        {/* Zeile 1: Marke links · Markt + Kasse mitte · Abmelden rechts */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <AppBrandLogo />
            <span className="truncate text-lg font-semibold leading-tight">{APP_BRAND_NAME}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center">
            <span className="w-full truncate text-sm font-semibold text-foreground sm:text-base" title={contextTitle}>
              {contextTitle}
            </span>
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <CashRegisterIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Kassenmodus</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleLogout()} className="shrink-0 gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>

        {/* Zeile 2: Obst / Backshop */}
        <nav className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="Kassen-Bereiche">
          {obstGemuese && (
            <NavLink to="/kiosk/obst" className={tabClass} end={false}>
              <Apple className="h-5 w-5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">Obst und Gemüse</span>
            </NavLink>
          )}
          {backshop && (
            <NavLink to="/kiosk/backshop" className={tabClass}>
              <Croissant className="h-5 w-5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">Backshop</span>
            </NavLink>
          )}
        </nav>

        {/* Zeile 3: Suche (links, breit) · KW + Status (rechts) — Liste beginnt direkt darunter */}
        <div
          className="flex flex-col gap-2 border-t border-border/60 pt-2 sm:flex-row sm:items-center sm:gap-3"
          data-tour={listToolbarTourId}
        >
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full flex-1 justify-start gap-2 text-base font-normal text-muted-foreground sm:min-w-0"
            data-tour={findTourId}
            data-plu-find-in-page-trigger
            onClick={() => triggerListFind()}
            aria-label="In Liste suchen"
            title="In Liste suchen (PLU oder Name)"
          >
            <Search className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">In Liste suchen …</span>
          </Button>
          <div
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,14rem)]"
            data-tour={!isBackshopRoute ? 'masterlist-context-line' : undefined}
          >
            {headerSummary ? (
              <>
                <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                  {headerSummary.kwLine}
                </span>
                {headerSummary.listStatus === 'active' && (
                  <Badge variant="default" className="text-xs shrink-0">
                    Aktiv
                  </Badge>
                )}
                {headerSummary.listStatus === 'frozen' && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Archiv
                  </Badge>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Schlankes Layout fuer Kassenmodus: Tabs Obst/Backshop, Abmelden (QR-Einstieg bleibt in sessionStorage).
 * Wenn der Super-Admin den Kassenmodus am Markt deaktiviert, erscheint ein Hinweis statt der Listen.
 */
export function KioskLayout() {
  const { logout, profile, isKiosk } = useAuth()
  const { companyName, storeName } = useCurrentStore()
  const navigate = useNavigate()
  const { obstGemuese, backshop, kiosk, isLoading } = useEffectiveListVisibility()

  const registerLabel = useMemo(() => {
    const d = profile?.display_name?.trim()
    return d || null
  }, [profile?.display_name])

  const centerContextLine = useMemo(() => {
    const s = storeName?.trim()
    const r = registerLabel
    if (s && r) return `${s} · ${r}`
    if (s) return s
    if (r) return r
    return ''
  }, [storeName, registerLabel])

  const storeMetaLine = useMemo(() => {
    const parts = [storeName, companyName && String(companyName).trim() ? String(companyName).trim() : '']
      .filter((x): x is string => Boolean(x))
    return parts.join(' · ')
  }, [storeName, companyName])

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

  // Kassenmodus: kein globales Skeleton auf Listen-Sichtbarkeit — sonst blockiert die UI nach
  // Store-Wechsel erneut; die Listen (MasterList) haben eigene Ladezustände.
  if (isLoading && !isKiosk) {
    return <LoadingSkeleton />
  }

  if (!kiosk) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card shrink-0">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col min-w-0 gap-0.5 max-w-full">
              <div className="flex items-center gap-2 min-w-0">
                <AppBrandLogo />
                <span className="text-lg font-semibold truncate">{APP_BRAND_NAME}</span>
              </div>
              {storeMetaLine ? (
                <p className="text-xs text-muted-foreground break-words">{storeMetaLine}</p>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()} className="shrink-0">
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
    <KioskListFindProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <KioskHeaderChrome
          obstGemuese={obstGemuese}
          backshop={backshop}
          handleLogout={handleLogout}
          centerContextLine={centerContextLine}
        />
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-2 sm:px-6">
          <Outlet />
        </main>
      </div>
    </KioskListFindProvider>
  )
}
