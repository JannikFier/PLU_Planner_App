import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Copy,
  Printer,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  CircleAlert,
  Info,
  KeyRound,
  FileDown,
  Menu,
  QrCode,
  ListOrdered,
  Eye,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { useAdminKassenmodusPage, type KioskRegister } from '@/hooks/useAdminKassenmodusPage'

/**
 * Admin: Kassenmodus – QR/Einstiegs-URL, Kassen anlegen, Passwort setzen, Vorschau-Link.
 */
export function AdminKassenmodusPage({ embedded = false }: { embedded?: boolean }) {
  const {
    currentStoreId,
    kioskModeStoreOn,
    visibilityLoading,
    entranceQuery,
    registersQuery,
    qrDataUrl,
    newPassword,
    setNewPassword,
    newRegisterSortOrder,
    setNewRegisterSortOrder,
    registerSlotChoices,
    nextRegisterSlot,
    deleteTarget,
    setDeleteTarget,
    entranceBuild,
    entranceUrl,
    rotateMutation,
    createRegisterMutation,
    updateRegisterMutation,
    deleteMutation,
    printQr,
    downloadQrPdf,
    copyUrl,
    scrollToKassenmodusSection,
    canUsePublicKiosk,
    kioskUrlMisdeployed,
    prefetchKioskRouteChunks,
  } = useAdminKassenmodusPage()

  if (!currentStoreId) {
    const empty = <p className="text-muted-foreground">Kein Markt ausgewählt.</p>
    return embedded ? empty : <DashboardLayout>{empty}</DashboardLayout>
  }

  const mainContent = (
    <div className="w-full max-w-full space-y-8">
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
            <strong>Firmen &amp; Märkte → Markt → Einstellungen → Listen-Sichtbarkeit</strong> (Super-Admin). Sie können
            Kassen hier weiter bearbeiten oder löschen; neue Kassen anlegen ist bis zur Freischaltung nicht möglich.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle>Einstiegs-Link &amp; QR</CardTitle>
              <CardDescription>
                Diesen Link oder QR-Code am Markt bereitstellen. Nach Rotation ist der alte QR ungültig.
              </CardDescription>
            </div>
            {entranceQuery.data?.token ? (
              <div className="flex shrink-0 justify-end md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Kassenmodus-Aktionen">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled={!canUsePublicKiosk} onClick={() => void copyUrl()}>
                      <Copy className="mr-2 h-4 w-4" />
                      Link kopieren
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canUsePublicKiosk} onClick={printQr}>
                      <Printer className="mr-2 h-4 w-4" />
                      Drucken
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canUsePublicKiosk} onClick={() => void downloadQrPdf()}>
                      <FileDown className="mr-2 h-4 w-4" />
                      PDF speichern
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canUsePublicKiosk || rotateMutation.isPending}
                      onClick={() => rotateMutation.mutate()}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Neuen Link erzeugen
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canUsePublicKiosk || !entranceUrl}
                      onMouseEnter={prefetchKioskRouteChunks}
                      onFocus={prefetchKioskRouteChunks}
                      onClick={() => {
                        if (entranceUrl) window.open(entranceUrl, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Vorschau (neuer Tab)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => scrollToKassenmodusSection('kassenmodus-qr')}>
                      <QrCode className="mr-2 h-4 w-4" />
                      QR-Code anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => scrollToKassenmodusSection('kassenmodus-add-register')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Kasse hinzufügen
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => scrollToKassenmodusSection('kassenmodus-registers-list')}>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      Kassen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>
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
                    <code className="rounded bg-background/80 px-1">VITE_APP_DOMAIN</code> auf eure Basis-Domain setzen
                    (ohne <code className="rounded bg-background/80 px-1">https://</code>) und <strong>neu deployen</strong>.
                    Wildcard-Domain und Supabase-URLs: siehe{' '}
                    <span className="font-medium">docs/DEPLOYMENT_DOMAINEN_UND_KASSE.md</span> im Repository.
                  </AlertDescription>
                </Alert>
              )}
              <div className="hidden flex-wrap gap-2 md:flex">
                <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl()} disabled={!canUsePublicKiosk}>
                  <Copy className="mr-1 h-4 w-4" />
                  Link kopieren
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={printQr} disabled={!canUsePublicKiosk}>
                  <Printer className="mr-1 h-4 w-4" />
                  Drucken
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void downloadQrPdf()}
                  disabled={!canUsePublicKiosk}
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  PDF speichern
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => rotateMutation.mutate()}
                  disabled={!canUsePublicKiosk || rotateMutation.isPending}
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
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
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="order-2 min-w-0 space-y-4 lg:order-1">
                  {canUsePublicKiosk && entranceBuild.showHostSessionHint && (
                    <Alert className="border-amber-500/40 bg-amber-50 text-amber-950">
                      <CircleAlert className="h-4 w-4 text-amber-700" />
                      <AlertTitle className="text-sm">Kassen-Link und dieselbe Website-Adresse</AlertTitle>
                      <AlertDescription className="text-sm text-amber-950/90">
                        {!entranceBuild.usedSubdomainHost ? (
                          <>
                            Für diesen Markt wird der Einstieg über <strong>diese Adresse</strong> gebaut (keine eigene
                            Markt-Subdomain oder nicht verwendbar). Eine Kassen-Anmeldung ersetzt dann die Anmeldung in{' '}
                            <strong>allen Tabs derselben Adresse</strong>. Für getrennte Kassen-Sessions: Markt-Subdomain
                            in den Stammdaten setzen, in Production <code className="text-xs">VITE_APP_DOMAIN</code> auf die
                            Basis-Domain setzen und DNS (z. B. Wildcard <code className="text-xs">*.deine-domain.de</code>)
                            so konfigurieren, dass der QR-Link auf{' '}
                            <code className="text-xs">https://markt-subdomain…/kasse/…</code> zeigt.
                          </>
                        ) : (
                          <>
                            Der Link zeigt auf dieselbe Website-Adresse wie diese Seite – der Browser teilt die
                            Anmeldung zwischen allen Tabs dieser Adresse.
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
                  <p className="rounded-md bg-muted/50 p-2 font-mono text-sm break-all">{entranceUrl}</p>
                </div>
                <div
                  id="kassenmodus-qr"
                  className="order-1 flex justify-center rounded-lg border bg-card p-4 lg:order-2 lg:justify-end lg:self-start"
                >
                  {qrDataUrl && canUsePublicKiosk ? (
                    <img
                      src={qrDataUrl}
                      alt="QR-Code Kassenmodus"
                      className="h-56 w-56 lg:h-64 lg:w-64"
                    />
                  ) : qrDataUrl && !canUsePublicKiosk ? (
                    <div className="flex h-56 w-56 items-center justify-center px-2 text-center text-sm text-muted-foreground lg:h-64 lg:w-64">
                      QR-Code ist am Markt deaktiviert.
                    </div>
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch kein Einstieg vorhanden. Lege unten die erste Kasse an – dann wird automatisch ein Link erzeugt.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-8 xl:grid xl:grid-cols-2 xl:items-start xl:gap-6 xl:space-y-0">
        <Card id="kassenmodus-add-register">
          <CardHeader>
            <CardTitle>Kasse hinzufügen</CardTitle>
            <CardDescription>
              Nummer wählen (nächste freie und zwei weitere), dann Passwort setzen (mindestens 4 Zeichen). Anzeigename:
              automatisch „Kasse …“.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2 sm:max-w-xs xl:max-w-none">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
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
                <Plus className="mr-1 h-4 w-4" />
                Kasse anlegen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="kassenmodus-registers-list">
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
                  onSavePassword={(pw) => updateRegisterMutation.mutate({ register_id: reg.id, password: pw })}
                  onToggleActive={(active) => updateRegisterMutation.mutate({ register_id: reg.id, active })}
                  onDelete={() => setDeleteTarget(reg)}
                  saving={updateRegisterMutation.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
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
