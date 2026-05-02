import { useState, useMemo, useEffect, useLayoutEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { getHomeDashboardPath } from '@/lib/effective-route-prefix'
import { pickSafePostLoginPath, getPostLoginCanonicalRedirectUrl } from '@/lib/canonical-host-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { APP_BRAND_NAME } from '@/lib/brand'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'

/**
 * Login-Seite mit einem einzigen Eingabefeld für Email ODER Personalnummer.
 * System erkennt automatisch anhand von "@" welcher Login-Weg genutzt wird.
 * Passwort-Feld hat ein Auge-Icon zum Ein-/Ausblenden.
 */
export function LoginPage() {
  const {
    user,
    isLoading,
    isKiosk,
    mustChangePassword,
    error,
    loginWithEmail,
    loginWithPersonalnummer,
    requestPasswordReset,
    clearError,
  } = useAuth()

  const { storeName, storeLogo, companyLogo, isAdminDomain, error: storeError } = useCurrentStore()
  const brandLogo = storeLogo ?? companyLogo
  const brandName = storeName ?? APP_BRAND_NAME

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Veraltete Fehlermeldungen beim Betreten der Login-Seite loeschen
  useEffect(() => {
    clearError()
  }, [clearError])

  // Automatische Erkennung: Email (enthält @) oder Personalnummer (Hooks vor allen Returns)
  const isEmail = useMemo(() => identifier.includes('@'), [identifier])

  // Wenn eingeloggt: kanonischer Host (www / Markt-Subdomain) oder SPA-Navigate zum Dashboard
  if (user && !isLoading) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />
    }
    if (isKiosk) {
      return <Navigate to="/kiosk" replace />
    }
    return <LoginPostLoginRedirect />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)

    try {
      if (isEmail) {
        await loginWithEmail(identifier, password)
      } else {
        await loginWithPersonalnummer(identifier, password)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : null
      setLocalError(msg?.trim() ? msg : 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)

    try {
      await requestPasswordReset(resetEmail)
      toast.success('Eine E-Mail mit dem Reset-Link wurde gesendet.')
      setShowResetForm(false)
      setResetEmail('')
    } catch {
      setLocalError('Reset-E-Mail konnte nicht gesendet werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = (localError || error || '').trim() || 'Ein unbekannter Fehler ist aufgetreten.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
      <div className="w-full max-w-md">
        {/* Logo + Titel mit Markt-Branding */}
        <div className="mb-8 text-center">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-lg ring-1 ring-primary/15">
              <AppBrandLogo className="h-16 w-16 rounded-2xl" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdminDomain ? APP_BRAND_NAME : brandName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Melde dich an, um auf deine PLU-Listen zuzugreifen
          </p>
          {storeError && !user && (
            <p className="mt-2 text-sm text-destructive">{storeError}</p>
          )}
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {showResetForm ? 'Passwort zurücksetzen' : 'Anmelden'}
            </CardTitle>
            <CardDescription>
              {showResetForm
                ? 'Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.'
                : 'Gib deine E-Mail-Adresse oder Personalnummer ein.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showResetForm ? (
              /* Passwort-Reset Formular */
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-Mail-Adresse</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@firma.de"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Reset-Link senden'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowResetForm(false)
                    setLocalError(null)
                  }}
                >
                  Zurück zur Anmeldung
                </Button>
              </form>
            ) : (
              /* Login Formular – ein Feld für Email ODER Personalnummer */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">E-Mail-Adresse / Personalnummer</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="E-Mail-Adresse / Personalnummer"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird angemeldet...
                    </>
                  ) : (
                    'Anmelden'
                  )}
                </Button>

                {/* Passwort vergessen */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                    onClick={() => {
                      setShowResetForm(true)
                      setLocalError(null)
                    }}
                  >
                    Passwort vergessen?
                  </button>
                </div>
              </form>
            )}

            {/* Fehlermeldung – immer anzeigen wenn es einen Fehler gibt, Fallback damit nie leer */}
            {(localError || error) && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {displayError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Kein Zugang? Wende dich an deinen Administrator.
        </p>
      </div>
    </div>
  )
}

/** Warten auf Profil nach Session: danach Hilfe statt endlos Spinner (ms). */
const POST_LOGIN_PROFILE_WAIT_MS = 14_000

/** Nach erfolgreichem Login: ggf. voller Host-Wechsel (Cookies), sonst <Navigate>. */
function LoginPostLoginRedirect() {
  const location = useLocation()
  const { user, profile, logout } = useAuth()
  const { preview } = useUserPreview()
  const { subdomain, isLoading: storeLoading, isAdminDomain } = useCurrentStore()
  const [profileWaitTimedOut, setProfileWaitTimedOut] = useState(false)

  useEffect(() => {
    if (profile) {
      setProfileWaitTimedOut(false)
      return
    }
    const id = window.setTimeout(() => setProfileWaitTimedOut(true), POST_LOGIN_PROFILE_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [profile])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    if (profileWaitTimedOut) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
          <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
                <CardTitle className="text-lg">Profil konnte nicht geladen werden</CardTitle>
              </div>
              <CardDescription className="text-base text-foreground/90">
                Die Anmeldung war technisch möglich, aber dein Profil fehlt oder ist nicht lesbar
                (Netzwerk, Rechte oder fehlende Datenbank-Zeile). Bitte Administrator informieren oder
                erneut versuchen.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => void logout()}>
                Abmelden
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Wird geladen…</span>
      </div>
    )
  }

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname
  const homePath = getHomeDashboardPath(profile.role, preview)

  const canonicalUrl =
    typeof window !== 'undefined'
      ? getPostLoginCanonicalRedirectUrl({
          appDomain: import.meta.env.VITE_APP_DOMAIN ?? '',
          hostname: window.location.hostname,
          profileRole: profile.role,
          storeSubdomain: subdomain,
          storeLoading,
          isAdminDomain,
          preview,
          fromPathname: from,
        })
      : null

  useLayoutEffect(() => {
    if (canonicalUrl) window.location.assign(canonicalUrl)
  }, [canonicalUrl])

  if (canonicalUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Weiterleitung…</span>
      </div>
    )
  }

  const path = pickSafePostLoginPath(profile.role, from, homePath)
  return <Navigate to={path} replace />
}
