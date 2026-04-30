import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { supabase, invokeEdgeFunction } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Printer, RefreshCw, Plus, Trash2, Loader2, CircleAlert } from 'lucide-react'
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

/**
 * Admin: Kassenmodus – QR/Einstiegs-URL, Kassen anlegen, Passwort setzen, Vorschau-Link.
 */
export function AdminKassenmodusPage({ embedded = false }: { embedded?: boolean }) {
  const { currentStoreId } = useCurrentStore()
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
    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Pop-up wurde blockiert. Bitte Pop-ups erlauben oder Link kopieren.')
      return
    }
    w.document.write(
      `<!DOCTYPE html><html><head><title>Kassen-QR</title></head><body style="margin:0;padding:24px;text-align:center;font-family:sans-serif"><h1 style="font-size:18px">Kassenmodus</h1><img src="${qrDataUrl}" width="280" height="280" alt="QR" /><p style="font-size:12px;color:#666">QR scannen zum Anmelden</p></body></html>`,
    )
    w.document.close()
    w.onload = () => {
      w.print()
      w.close()
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

  const entranceUrl = useMemo(() => {
    const token = entranceQuery.data?.token
    if (!token || typeof window === 'undefined') return ''
    return `${window.location.origin}/kasse/${token}`
  }, [entranceQuery.data?.token])

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
                    onClick={() => {
                      if (entranceUrl) window.open(entranceUrl, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    Vorschau (neuer Tab)
                  </Button>
                </div>
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
            <CardDescription>Passwort ändern oder Kasse deaktivieren / löschen.</CardDescription>
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
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{register.display_label}</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onToggleActive(!register.active)}
          >
            {register.active ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!register.active && <p className="text-xs text-muted-foreground">Deaktiviert – erscheint nicht an der Kasse.</p>}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1 space-y-1">
          <Label>Neues Passwort</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving || pw.length < 4}
          onClick={() => {
            onSavePassword(pw)
            setPw('')
          }}
        >
          Passwort speichern
        </Button>
      </div>
    </div>
  )
}
