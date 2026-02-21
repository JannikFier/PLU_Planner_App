import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, KeyRound, Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Passwort-Ändern-Seite.
 * Wird angezeigt wenn:
 * - User sich mit Einmalpasswort einloggt (must_change_password = true)
 * - Admin/Super-Admin über "Passwort vergessen" Link kommt
 */
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword, profile, isSuperAdmin, isAdmin, isViewer } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Validierung
    if (newPassword.length < 6) {
      setLocalError('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Die Passwörter stimmen nicht überein.')
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword(newPassword)
      toast.success('Passwort erfolgreich geändert!')

      // Weiterleitung je nach Rolle
      if (isSuperAdmin) {
        navigate('/super-admin', { replace: true })
      } else if (isAdmin) {
        navigate('/admin', { replace: true })
      } else if (isViewer) {
        navigate('/viewer', { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch {
      setLocalError('Passwort konnte nicht geändert werden. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl shadow-lg">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Passwort ändern</h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.must_change_password
              ? 'Bitte vergib ein neues Passwort, um fortzufahren.'
              : 'Gib dein neues Passwort ein.'}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Neues Passwort</CardTitle>
            <CardDescription>
              Wähle ein sicheres Passwort mit mindestens 6 Zeichen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mindestens 6 Zeichen"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Passwort-Match Indikator */}
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-2 text-sm ${
                  newPassword === confirmPassword ? 'text-emerald-600' : 'text-destructive'
                }`}>
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="h-4 w-4" />
                      Passwörter stimmen überein
                    </>
                  ) : (
                    'Passwörter stimmen noch nicht überein'
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Passwort speichern'
                )}
              </Button>
            </form>

            {localError && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {localError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
