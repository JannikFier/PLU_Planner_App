import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { supabase, invokeEdgeFunction } from '@/lib/supabase'
import {
  buildKioskEntranceUrl,
  isKioskEntranceUrlMisdeployedForHostname,
  kioskUrlSharesOriginWithPage,
} from '@/lib/kiosk-entrance-url'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Printer, RefreshCw, Plus, Trash2, Loader2, CircleAlert, Info, KeyRound, FileDown } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type KioskEntrance = {
  id: string
  store_id: string
  token: string
  created_at: string
  revoked_at: string | null
}

type KioskRegister = {
  id: string
  store_id: string
  sort_order: number
  display_label: string
  auth_user_id: string
  active: boolean
  created_at: string
}

/** Lädt Kiosk-Routen-Chunks früh vor (Vorschau-Hover), damit der neue Tab schneller wird. */
function prefetchKioskRouteChunks() {
  void import('@/pages/KasseEntrancePage')
  void import('@/pages/KioskLayout')
  void import('@/pages/MasterList')
}

/**
 * Admin: Kassenmodus – QR/Einstiegs-URL, Kassen anlegen, Passwort setzen, Vorschau-Link.
 */
export function AdminKassenmodusPage({ embedded = false }: { embedded?: boolean }) {
  const { currentStoreId, subdomain } = useCurrentStore()
  const appDomain = import.meta.env.VITE_APP_DOMAIN || 'localhost'
  const { kiosk: kioskModeStoreOn, isLoading: visibilityLoading } = useEffectiveListVisibility()
  const queryClient = useQueryClient()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newRegisterSortOrder, setNewRegisterSortOrder] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<KioskRegister | null>(null)

  const printQr = useCallback(() => {
    if (!qrDataUrl) {
      toast.error('QR-Code noch nicht bereit.')
      return
    }
    // Kein window.open: Browser blockiert Pop-ups zuverlässig (z. B. eingebettete Super-Admin-Ansicht) — Druck über verstecktes Iframe.
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Kassen-QR</title></head><body style="margin:0;padding:24px;text-align:center;font-family:sans-serif"><h1 style="font-size:18px">Kassenmodus</h1><img src="${qrDataUrl}" width="280" height="280" alt="QR" /><p style="font-size:12px;color:#666">QR scannen zum Anmelden</p></body></html>`

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:none;margin:0;padding:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)

    const idoc = iframe.contentDocument
    const cw = iframe.contentWindow
    if (!idoc || !cw) {
      iframe.remove()
      toast.error('Drucken ist in diesem Browser nicht verfügbar.')
      return
    }

    idoc.open()
    idoc.write(html)
    idoc.close()

    const cleanupIframe = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    const runPrint = () => {
      requestAnimationFrame(() => {
        try {
          cw.addEventListener('afterprint', cleanupIframe, { once: true })
          cw.focus()
          cw.print()
        } catch {
          cleanupIframe()
          toast.error('Drucken fehlgeschlagen.')
        }
      })
    }

    const rs = idoc.readyState

    if (rs === 'complete') {
      runPrint()
    } else {
      iframe.addEventListener('load', runPrint, { once: true })
    }
  }, [qrDataUrl])

  const downloadQrPdf = useCallback(async () => {
    if (!qrDataUrl) {
      toast.error('QR-Code noch nicht bereit.')
      return
    }
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      doc.setFontSize(14)
      doc.text('Kassenmodus', pageW / 2, 24, { align: 'center' })
      const qrSizeMm = 70
      doc.addImage(qrDataUrl, 'PNG', (pageW - qrSizeMm) / 2, 34, qrSizeMm, qrSizeMm)
      doc.setFontSize(10)
      doc.setTextColor(80)
      doc.text('QR scannen zum Anmelden', pageW / 2, 34 + qrSizeMm + 12, { align: 'center' })
      doc.save('Kassenmodus-QR.pdf')
      toast.success('PDF wurde heruntergeladen.')
    } catch {
      toast.error('PDF konnte nicht erstellt werden.')
    }
  }, [qrDataUrl])

  const entranceQuery = useQuery({
    queryKey: ['kiosk-entrance', currentStoreId],
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      const { data, error } = await supabase
        .from('store_kiosk_entrances')
        .select('*')
        .eq('store_id', currentStoreId)
        .is('revoked_at', null)
        .maybeSingle()
      if (error) throw error
      return data as KioskEntrance | null
    },
    enabled: !!currentStoreId,
  })

  const registersQuery = useQuery({
    queryKey: ['kiosk-registers', currentStoreId],
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      const { data, error } = await supabase
        .from('store_kiosk_registers')
        .select('*')
        .eq('store_id', currentStoreId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as KioskRegister[]
    },
    enabled: !!currentStoreId,
  })

  const maxRegisterSort = useMemo(() => {
    const list = registersQuery.data ?? []
    return list.reduce((m, r) => Math.max(m, r.sort_order), 0)
  }, [registersQuery.data])

  const nextRegisterSlot = maxRegisterSort + 1
  const registerSlotChoices = useMemo(
    () => [nextRegisterSlot, nextRegisterSlot + 1, nextRegisterSlot + 2],
    [nextRegisterSlot],
  )

  useEffect(() => {
    setNewRegisterSortOrder((prev) =>
      registerSlotChoices.includes(prev) ? prev : nextRegisterSlot,
    )
  }, [nextRegisterSlot, registerSlotChoices])

  const entranceBuild = useMemo(() => {
    const token = entranceQuery.data?.token
    if (!token || typeof window === 'undefined') {
      return {
        url: '',
        usedSubdomainHost: false,
        showHostSessionHint: false,
      }
    }
    const r = buildKioskEntranceUrl({
      token,
      storeSubdomain: subdomain,
      appDomain,
      currentOrigin: window.location.origin,
    })
    const showHostSessionHint =
      Boolean(r.url) && (!r.usedSubdomainHost || kioskUrlSharesOriginWithPage(r.url, window.location.origin))
    return { url: r.url, usedSubdomainHost: r.usedSubdomainHost, showHostSessionHint }
  }, [entranceQuery.data?.token, subdomain, appDomain])

  const entranceUrl = entranceBuild.url

  useEffect(() => {
    let cancelled = false
    if (!entranceUrl) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(entranceUrl, { width: 280, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [entranceUrl])

  const rotateMutation = useMutation({
    mutationFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      return invokeEdgeFunction<{ entrance_token: string }>('rotate-kiosk-entrance', { store_id: currentStoreId })
    },
    onSuccess: () => {
      toast.success('Neuer Einstiegs-Link wurde erzeugt. Bitte neuen QR-Code ausdrucken.')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-entrance', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createRegisterMutation = useMutation({
    mutationFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      if (newPassword.length < 4) throw new Error('Passwort mindestens 4 Zeichen.')
      return invokeEdgeFunction<{ register: KioskRegister; entrance_token?: string }>('create-kiosk-register', {
        store_id: currentStoreId,
        password: newPassword,
        sort_order: newRegisterSortOrder,
      })
    },
    onSuccess: () => {
      toast.success('Kasse wurde angelegt.')
      setNewPassword('')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
      void queryClient.invalidateQueries({ queryKey: ['kiosk-entrance', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateRegisterMutation = useMutation({
    mutationFn: async (p: { register_id: string; password?: string; active?: boolean }) => {
      return invokeEdgeFunction('update-kiosk-register', p)
    },
    onSuccess: () => {
      toast.success('Gespeichert.')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (registerId: string) => {
      return invokeEdgeFunction('delete-kiosk-register', { register_id: registerId })
    },
    onSuccess: () => {
      toast.success('Kasse gelöscht.')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entranceUrl)
      toast.success('Link kopiert.')
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
    }
  }, [entranceUrl])

  if (!currentStoreId) {
    const empty = <p className="text-muted-foreground">Kein Markt ausgewählt.</p>
    return embedded ? empty : <DashboardLayout>{empty}</DashboardLayout>
  }

  const canUsePublicKiosk = kioskModeStoreOn && !visibilityLoading

  const kioskUrlMisdeployed =
    typeof window !== 'undefined' &&
    Boolean(entranceUrl) &&
    isKioskEntranceUrlMisdeployedForHostname(entranceUrl, window.location.hostname)

  const mainContent = (
    <div className="space-y-8 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kassenmodus</h2>
          <p className="text-muted-foreground">
            QR-Code für die Kasse, Kassen anlegen und Passwörter verwalten. Vorschau im neuen Tab über den Link.
          </p>
        </div>

        {!visibilityLoading && !kioskModeStoreOn && (
          <Alert className="border-amber-500/40 bg-amber-50 text-amber-950">
            <CircleAlert className="text-amber-700" />
            <AlertTitle>Kassenmodus am Markt aus</AlertTitle>
            <AlertDescription>
              Öffentlicher Login und QR-Code sind deaktiviert. Freischalten unter{' '}
              <strong>Firmen &amp; Märkte → Markt → Einstellungen → Listen-Sichtbarkeit</strong> (Super-Admin). Sie
              können Kassen hier weiter bearbeiten oder löschen; neue Kassen anlegen ist bis zur Freischaltung nicht
              möglich.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Einstiegs-Link & QR</CardTitle>
            <CardDescription>
              Diesen Link oder QR-Code am Markt bereitstellen. Nach Rotation ist der alte QR ungültig.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entranceQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : entranceQuery.data?.token ? (
              <>
                {kioskUrlMisdeployed && (
                  <Alert className="border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Kassen-Link passt nicht zur Live-Domain</AlertTitle>
                    <AlertDescription className="text-sm text-destructive/95 [&_strong]:text-destructive">
                      Der Link nutzt noch <code className="rounded bg-background/80 px-1">localhost</code> – QR und
                      Vorschau sind auf anderen Geräten nicht erreichbar. In{' '}
                      <strong>Vercel → Environment Variables</strong> für Production{' '}
                      <code className="rounded bg-background/80 px-1">VITE_APP_DOMAIN</code> auf eure Basis-Domain
                      setzen (ohne <code className="rounded bg-background/80 px-1">https://</code>) und{' '}
                      <strong>neu deployen</strong>. Wildcard-Domain und Supabase-URLs: siehe{' '}
                      <span className="font-medium">docs/DEPLOYMENT_DOMAINEN_UND_KASSE.md</span> im Repository.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={copyUrl} disabled={!canUsePublicKiosk}>
                    <Copy className="h-4 w-4 mr-1" />
                    Link kopieren
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={printQr} disabled={!canUsePublicKiosk}>
                    <Printer className="h-4 w-4 mr-1" />
                    Drucken
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadQrPdf()}
                    disabled={!canUsePublicKiosk}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF speichern
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => rotateMutation.mutate()}
                    disabled={!canUsePublicKiosk || rotateMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Neuen Link erzeugen
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canUsePublicKiosk}
                    onMouseEnter={prefetchKioskRouteChunks}
                    onFocus={prefetchKioskRouteChunks}
                    onClick={() => {
                      if (entranceUrl) window.open(entranceUrl, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    Vorschau (neuer Tab)
                  </Button>
                </div>
                {canUsePublicKiosk && entranceBuild.showHostSessionHint && (
                  <Alert className="border-amber-500/40 bg-amber-50 text-amber-950">
                    <CircleAlert className="h-4 w-4 text-amber-700" />
                    <AlertTitle className="text-sm">Kassen-Link und dieselbe Website-Adresse</AlertTitle>
                    <AlertDescription className="text-sm text-amber-950/90">
                      {!entranceBuild.usedSubdomainHost ? (
                        <>
                          Für diesen Markt wird der Einstieg über <strong>diese Adresse</strong> gebaut (keine
                          eigene Markt-Subdomain oder nicht verwendbar). Eine Kassen-Anmeldung ersetzt dann die
                          Anmeldung in <strong>allen Tabs derselben Adresse</strong>. Für getrennte Kassen-Sessions:
                          Markt-Subdomain in den Stammdaten setzen, in Production <code className="text-xs">VITE_APP_DOMAIN</code> auf die
                          Basis-Domain setzen und DNS (z. B. Wildcard <code className="text-xs">*.deine-domain.de</code>) so
                          konfigurieren, dass der QR-Link auf <code className="text-xs">https://markt-subdomain…/kasse/…</code>{' '}
                          zeigt.
                        </>
                      ) : (
                        <>
                          Der Link zeigt auf dieselbe Website-Adresse wie diese Seite – der Browser teilt die Anmeldung
                          zwischen allen Tabs dieser Adresse.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {canUsePublicKiosk && (
                  <Alert className="border-muted-foreground/25 bg-muted/40">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <AlertTitle className="text-sm">Gleicher Browser, mehrere Tabs</AlertTitle>
                    <AlertDescription className="text-sm text-muted-foreground">
                      Wenn du hier eingeloggt bist und im neuen Tab die Kasse anmeldest, gilt die Kiosk-Session für
                      <strong className="font-medium text-foreground"> alle </strong>
                      offenen Tabs dieser Website. Für eine Vorschau ohne deine Admin-Session zu verlieren: privates
                      Fenster oder zweites Browser-Profil nutzen.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm break-all font-mono bg-muted/50 rounded-md p-2">{entranceUrl}</p>
                <div className="flex justify-center rounded-lg border p-4 bg-card">
                  {qrDataUrl && canUsePublicKiosk ? (
                    <img src={qrDataUrl} alt="QR-Code Kassenmodus" className="w-56 h-56" />
                  ) : qrDataUrl && !canUsePublicKiosk ? (
                    <div className="w-56 h-56 flex items-center justify-center text-center text-sm text-muted-foreground px-2">
                      QR-Code ist am Markt deaktiviert.
                    </div>
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch kein Einstieg vorhanden. Lege unten die erste Kasse an – dann wird automatisch ein Link erzeugt.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kasse hinzufügen</CardTitle>
            <CardDescription>
              Nummer wählen (nächste freie und zwei weitere), dann Passwort setzen (mindestens 4 Zeichen). Anzeigename:
              automatisch „Kasse …“.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="new-kiosk-slot">Kassen-Nummer</Label>
              <Select
                value={String(newRegisterSortOrder)}
                onValueChange={(v) => setNewRegisterSortOrder(Number(v))}
                disabled={!canUsePublicKiosk || registersQuery.isLoading}
              >
                <SelectTrigger id="new-kiosk-slot" className="w-full min-w-[12rem]">
                  <SelectValue placeholder="Nummer wählen" />
                </SelectTrigger>
                <SelectContent>
                  {registerSlotChoices.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Kasse {n}
                      {n === nextRegisterSlot ? ' (nächste)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2 min-w-0">
                <Label htmlFor="new-kiosk-pw">Passwort</Label>
                <Input
                  id="new-kiosk-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={!canUsePublicKiosk}
                />
              </div>
              <Button
                type="button"
                onClick={() => createRegisterMutation.mutate()}
                disabled={!canUsePublicKiosk || createRegisterMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Kasse anlegen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kassen</CardTitle>
            <CardDescription>Passwort ändern über „Passwort ändern“; Kasse deaktivieren oder löschen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {registersQuery.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (registersQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Kasse angelegt.</p>
            ) : (
              registersQuery.data?.map((reg) => (
                <RegisterRowEditor
                  key={reg.id}
                  register={reg}
                  onSavePassword={(pw) =>
                    updateRegisterMutation.mutate({ register_id: reg.id, password: pw })
                  }
                  onToggleActive={(active) =>
                    updateRegisterMutation.mutate({ register_id: reg.id, active })
                  }
                  onDelete={() => setDeleteTarget(reg)}
                  saving={updateRegisterMutation.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
    </div>
  )

  const deleteDialog = (
    <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kasse löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.display_label} wird unwiderruflich entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (embedded) {
    return (
      <>
        {mainContent}
        {deleteDialog}
      </>
    )
  }

  return (
    <DashboardLayout>
      {mainContent}
      {deleteDialog}
    </DashboardLayout>
  )
}

function RegisterRowEditor({
  register,
  onSavePassword,
  onToggleActive,
  onDelete,
  saving,
}: {
  register: KioskRegister
  onSavePassword: (pw: string) => void
  onToggleActive: (active: boolean) => void
  onDelete: () => void
  saving: boolean
}) {
  const [pw, setPw] = useState('')
  const [pwOpen, setPwOpen] = useState(false)

  const cancelPasswordEdit = () => {
    setPw('')
    setPwOpen(false)
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{register.display_label}</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onToggleActive(!register.active)}
          >
            {register.active ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          {!pwOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setPwOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-1" aria-hidden />
              Passwort ändern
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!register.active && <p className="text-xs text-muted-foreground">Deaktiviert – erscheint nicht an der Kasse.</p>}
      {pwOpen && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Neues Passwort für diese Kasse setzen (mindestens 4 Zeichen).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1 min-w-0">
              <Label htmlFor={`kiosk-pw-${register.id}`}>Neues Passwort</Label>
              <Input
                id={`kiosk-pw-${register.id}`}
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                disabled={saving}
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={saving || pw.length < 4}
                onClick={() => {
                  onSavePassword(pw)
                  cancelPasswordEdit()
                }}
              >
                Passwort speichern
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={cancelPasswordEdit}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
