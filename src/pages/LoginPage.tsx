import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Login-Seite mit einem einzigen Eingabefeld für Email ODER Personalnummer.
 * System erkennt automatisch anhand von "@" welcher Login-Weg genutzt wird.
 * Passwort-Feld hat ein Auge-Icon zum Ein-/Ausblenden.
 */
export function LoginPage() {
  const {
    user,
    isLoading,
    isSuperAdmin,
    isAdmin,
    mustChangePassword,
    error,
    loginWithEmail,
    loginWithPersonalnummer,
    requestPasswordReset,
  } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Automatische Erkennung: Email (enthält @) oder Personalnummer (Hooks vor allen Returns)
  const isEmail = useMemo(() => identifier.includes('@'), [identifier])

  // Wenn eingeloggt: weiterleiten
  if (user && !isLoading) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />
    }
    if (isSuperAdmin) return <Navigate to="/super-admin/masterlist" replace />
    if (isAdmin) return <Navigate to="/admin" replace />
    return <Navigate to="/user" replace />
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
        {/* Logo + Titel */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl shadow-lg">
            PLU
          </div>
          <h1 className="text-3xl font-bold tracking-tight">PLU Planner</h1>
          <p className="mt-2 text-muted-foreground">
            Melde dich an, um auf deine PLU-Listen zuzugreifen
          </p>
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
