import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useKasseBareBootstrap } from '@/contexts/KasseBareBootstrapContext'
import { resolveAppPath } from '@/lib/kasse-bare-entry'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { runKioskPostLoginPrefetch, runMasterListPrefetch } from '@/hooks/usePrefetchForNavigation'
import { KIOSK_ENTRANCE_TOKEN_STORAGE_KEY } from '@/lib/kiosk-entrance-storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { AppBrandLogo } from '@/components/layout/AppBrandLogo'
import { APP_BRAND_NAME } from '@/lib/brand'

type RegisterRow = {
  id: string
  display_label: string
  sort_order: number
  /** Ab Migration 081; fehlt solange DB noch nicht migriert. */
  store_id?: string
  store_name?: string | null
  company_name?: string | null
}

/**
 * Oeffentliche Kassen-Anmeldung: Einstiegs-Token in der URL, Kasse waehlen, Passwort, dann Session.
 */
export function KasseEntrancePage() {
  const { entranceToken } = useParams<{ entranceToken: string }>()
  const bareBootstrap = useKasseBareBootstrap()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
        setRegisters([])
        setSelectedId(null)
        setLoadingList(false)
        return
      }
      setLoadingList(true)
      setLoadError(null)
      setSelectedId(null)
      // Manuelles Database-Interface: Rpc-Args fuer SETOF-Ergebnis per Cast (siehe types/database Functions).
      const { data, error } = await supabase.rpc('kiosk_list_registers', {
        p_token: entranceToken,
      } as never)
      if (cancelled) return
      if (error) {
        setLoadError(error.message || 'Kassen konnten nicht geladen werden.')
        setRegisters([])
        setSelectedId(null)
      } else {
        const list = (data as RegisterRow[]) ?? []
        setRegisters(list)
        if (list.length === 0) {
          setSelectedId(null)
          setLoadError(
            'Keine aktiven Kassen oder der Kassenmodus ist für diesen Markt nicht freigeschaltet. Bitte die Zentrale informieren.',
          )
        } else {
          // Eine Kasse: automatisch; mehrere: erste vorausgewählt (Dropdown änderbar)
          setSelectedId(list[0]!.id)
        }
      }
      setLoadingList(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [entranceToken])

  /** Große Chunks vor dem Passwort-Submit laden (Webpack-Parser, kein Auth). */
  useEffect(() => {
    if (!entranceToken || registers.length === 0) return
    void import('@/pages/MasterList')
    void import('@/pages/KioskLayout')
  }, [entranceToken, registers.length])

  const selectedRegister = useMemo(
    () => registers.find((r) => r.id === selectedId) ?? registers[0],
    [registers, selectedId],
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entranceToken || !selectedId) {
      toast.error('Bitte Kasse auswählen.')
      return
    }
    setSubmitting(true)
    try {
      // Direkt Supabase Auth (kein Edge „kiosk-login“) → kein Deno-Cold-Start; RPCs nur Postgres.
      const { data: authRows, error: resolveErr } = await supabase.rpc('kiosk_resolve_register_auth', {
        p_token: entranceToken,
        p_register_id: selectedId,
      } as never)
      if (resolveErr) throw resolveErr
      const email = (authRows as { email: string }[] | null)?.[0]?.email?.trim()
      if (!email) {
        toast.error('Kasse oder Einstiegs-Link ist ungültig.')
        return
      }

      const { data: sessionData, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signErr || !sessionData.session) {
        const m = (signErr?.message ?? '').toLowerCase()
        if (m.includes('invalid login') || m.includes('invalid_credentials')) {
          toast.error('Passwort falsch.')
          return
        }
        throw signErr ?? new Error('Anmeldung fehlgeschlagen.')
      }

      const { error: finErr } = await supabase.rpc('kiosk_finalize_entrance_session', {
        p_token: entranceToken,
      } as never)
      if (finErr) throw finErr

      sessionStorage.setItem(KIOSK_ENTRANCE_TOKEN_STORAGE_KEY, entranceToken)
      if (!bareBootstrap) {
        const sid = selectedRegister?.store_id
        if (sid) {
          runKioskPostLoginPrefetch(queryClient, sid)
        } else {
          runMasterListPrefetch(queryClient)
        }
      }
      toast.success('Angemeldet.')
      if (bareBootstrap) {
        window.location.replace(resolveAppPath('/kiosk/obst'))
      } else {
        navigate('/kiosk/obst', { replace: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const singleRegister = registers.length === 1 ? registers[0] : null
  const multiRegister = registers.length > 1
  /** Markt zuerst, Firma nur als Zusatz (gleiche Reihenfolge wie KioskLayout). */
  const contextLine =
    registers.length > 0
      ? [registers[0]!.store_name, registers[0]!.company_name]
          .filter((x) => Boolean(x && String(x).trim()))
          .join(' · ')
      : ''

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <AppBrandLogo />
            <CardTitle className="text-xl">{APP_BRAND_NAME}</CardTitle>
          </div>
          <CardDescription>
            {multiRegister
              ? 'Kasse wählen und Passwort eingeben.'
              : 'Passwort für die Kasse eingeben.'}
          </CardDescription>
          {contextLine ? (
            <p className="text-sm font-medium text-foreground break-words">{contextLine}</p>
          ) : null}
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
                {singleRegister ? (
                  <p className="text-sm font-medium rounded-md border bg-muted/30 px-3 py-2">
                    {singleRegister.display_label}
                  </p>
                ) : multiRegister ? (
                  <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                    <SelectTrigger id="kasse-select" className="w-full">
                      <SelectValue placeholder="Kasse wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {registers.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.display_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
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
                    autoFocus={Boolean(singleRegister || multiRegister)}
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
              <p className="text-xs text-muted-foreground text-center">
                Bei sehr schlechter Verbindung kann das Laden der Kassenliste etwas länger dauern.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
