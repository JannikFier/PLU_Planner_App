import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { invokeEdgeFunctionAnon } from '@/lib/supabase'
import { KIOSK_ENTRANCE_TOKEN_STORAGE_KEY } from '@/lib/kiosk-entrance-storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { APP_BRAND_NAME } from '@/lib/brand'

type RegisterRow = { id: string; display_label: string; sort_order: number }

/**
 * Oeffentliche Kassen-Anmeldung: Einstiegs-Token in der URL, Kasse waehlen, Passwort, dann Session.
 */
export function KasseEntrancePage() {
  const { entranceToken } = useParams<{ entranceToken: string }>()
  const navigate = useNavigate()
  const [registers, setRegisters] = useState<RegisterRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!entranceToken) {
        setLoadError('Kein Einstiegs-Link.')
        setLoadingList(false)
        return
      }
      setLoadingList(true)
      setLoadError(null)
      // Manuelles Database-Interface: Rpc-Args fuer SETOF-Ergebnis per Cast (siehe types/database Functions).
      const { data, error } = await supabase.rpc('kiosk_list_registers', {
        p_token: entranceToken,
      } as never)
      if (cancelled) return
      if (error) {
        setLoadError(error.message || 'Kassen konnten nicht geladen werden.')
        setRegisters([])
      } else {
        setRegisters((data as RegisterRow[]) ?? [])
        if (!data || (data as RegisterRow[]).length === 0) {
          setLoadError(
            'Keine aktiven Kassen oder der Kassenmodus ist für diesen Markt nicht freigeschaltet. Bitte die Zentrale informieren.',
          )
        }
      }
      setLoadingList(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [entranceToken])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entranceToken || !selectedId) {
      toast.error('Bitte Kasse auswählen.')
      return
    }
    setSubmitting(true)
    try {
      const res = await invokeEdgeFunctionAnon<{
        access_token: string
        refresh_token: string
      }>('kiosk-login', {
        entrance_token: entranceToken,
        register_id: selectedId,
        password,
      })
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      })
      if (error) throw error
      sessionStorage.setItem(KIOSK_ENTRANCE_TOKEN_STORAGE_KEY, entranceToken)
      toast.success('Angemeldet.')
      navigate('/kiosk/obst', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <AppBrandLogo />
            <CardTitle className="text-xl">{APP_BRAND_NAME}</CardTitle>
          </div>
          <CardDescription>Kasse wählen und Passwort eingeben.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Kasse</Label>
                <div className="grid gap-2">
                  {registers.map((r) => (
                    <Button
                      key={r.id}
                      type="button"
                      variant={selectedId === r.id ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setSelectedId(r.id)}
                    >
                      {r.display_label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kasse-pw">Passwort</Label>
                <div className="relative">
                  <Input
                    id="kasse-pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !selectedId}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anmelden'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
