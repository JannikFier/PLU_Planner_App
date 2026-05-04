import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { useStoreById, useUpdateStore, useDeleteStore } from '@/hooks/useStores'
import {
  useStoreListVisibility,
  useUpdateStoreListVisibility,
  useUserListVisibilityForUser,
  useUpdateUserListVisibility,
  useStoreListAreaEnabled,
} from '@/hooks/useStoreListVisibility'
import { useStoreUserProfiles, useAddUserToStore, useRemoveUserFromStore } from '@/hooks/useStoreAccess'
import { useCompanyProfiles } from '@/hooks/useCompanyProfiles'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ClipboardList, LayoutGrid, LayoutTemplate, Megaphone, Users, Settings, Trash2, Loader2,
  Apple, Croissant, Eye, Globe, Home, UserPlus, KeyRound, Copy, Check, UserMinus,
  ScanLine,
} from 'lucide-react'
import { buildMarketLoginUrl, normalizeViteAppDomain, validateSubdomain } from '@/lib/subdomain'
import { toast } from 'sonner'
import type { Profile, UserListVisibility } from '@/types/database'
import { formatProfileDisplayEmail, formatProfileDisplayPersonalnummer, roleBadgeLabel } from '@/lib/profile-helpers'
import { useSuperAdminStoreDetailUserMutations } from '@/hooks/useSuperAdminStoreDetailUserMutations'
import { AdminKassenmodusPage } from '@/pages/AdminKassenmodusPage'

type Section =
  | 'overview'
  | 'listen'
  | 'listen-obst'
  | 'listen-backshop'
  | 'listen-backshop-inhalt'
  | 'benutzer'
  | 'einstellungen'
  | 'kassenmodus'

export function SuperAdminStoreDetailPage() {
  const { companyId, storeId } = useParams<{ companyId: string; storeId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isSuperAdmin, user: currentUser } = useAuth()
  const { setActiveStore } = useCurrentStore()

  const view = (searchParams.get('view') ?? 'overview') as Section
  const setView = (s: Section) => {
    if (s === 'overview') setSearchParams({}, { replace: true })
    else setSearchParams({ view: s }, { replace: true })
  }

  const { data: store, isLoading, isError } = useStoreById(storeId)
  const { data: visibility } = useStoreListVisibility(storeId)
  const updateStore = useUpdateStore()
  const deleteStore = useDeleteStore()
  const updateVisibility = useUpdateStoreListVisibility()

  // Beim Öffnen eines Marktes den StoreContext auf diesen Markt setzen
  useEffect(() => {
    if (storeId) setActiveStore(storeId)
  }, [storeId, setActiveStore])

  // Benutzer-Daten fuer diesen Markt
  const { data: storeUsers, isLoading: usersLoading } = useStoreUserProfiles(storeId)
  const addUserToStore = useAddUserToStore()
  const removeUserFromStore = useRemoveUserFromStore()

  // Firmeninterne Profile laden (für "Benutzer hinzufügen" Dialog; gleicher Cache wie Benutzerverwaltung)
  const { data: companyProfiles } = useCompanyProfiles(companyId)

  // Settings-Dialoge
  const [showEditName, setShowEditName] = useState(false)
  const [showEditSubdomain, setShowEditSubdomain] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // Benutzer-Dialoge
  const [showAddUser, setShowAddUser] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [detailUser, setDetailUser] = useState<(Profile & { isHomeStore: boolean }) | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  // Create-User Formular
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPersonalnummer, setNewPersonalnummer] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'viewer'>('user')

  const obstVisible = visibility?.find(v => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const backshopVisible = visibility?.find(v => v.list_type === 'backshop')?.is_visible ?? true
  const kioskVisible = visibility?.find(v => v.list_type === 'kiosk')?.is_visible ?? true

  const storeBasePath = `/super-admin/companies/${companyId}/stores/${storeId}`
  const marktListenBackObst = `${storeBasePath}?view=listen-obst`
  const marktListenBackBackshop = `${storeBasePath}?view=listen-backshop`
  const marktListenBackBackshopInhalt = `${storeBasePath}?view=listen-backshop-inhalt`

  const { createUserMutation, resetPasswordMutation, deleteUserMutation, updateRoleMutation } =
    useSuperAdminStoreDetailUserMutations({
      companyId,
      homeStoreId: store?.id,
      isSuperAdmin: !!isSuperAdmin,
      onCreateSuccess: (pw) => {
        setGeneratedPassword(pw)
        setShowCreateUser(false)
        setShowPasswordDialog(true)
        setNewDisplayName('')
        setNewEmail('')
        setNewPersonalnummer('')
        setNewRole('user')
      },
      onResetSuccess: (pw) => {
        setShowResetConfirm(false)
        setGeneratedPassword(pw)
        setShowPasswordDialog(true)
      },
      onDeleteUserSuccess: () => {
        setShowDeleteUserConfirm(false)
        setSelectedUser(null)
      },
    })

  const copyPassword = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(generatedPassword)
      else {
        const ta = document.createElement('textarea')
        ta.value = generatedPassword; ta.style.position = 'absolute'; ta.style.left = '-9999px'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Kopieren fehlgeschlagen.') }
  }

  const appDomain = normalizeViteAppDomain(import.meta.env.VITE_APP_DOMAIN)

  const copyMarketLoginUrl = async () => {
    if (!store?.subdomain) return
    const url = buildMarketLoginUrl(store.subdomain, appDomain)
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'absolute'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success('Markt-Login-Link kopiert')
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
    }
  }

  // Firmeninterne Benutzer die noch NICHT diesem Markt zugewiesen sind
  const assignedUserIds = new Set(storeUsers?.map(u => u.id) ?? [])
  const availableUsers = companyProfiles?.filter(
    p => p.role !== 'super_admin' && !assignedUserIds.has(p.id),
  ) ?? []

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Fehler beim Laden der Daten</p>
            <p className="text-sm mt-1">Bitte lade die Seite neu oder versuche es später erneut.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!store) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Eintrag nicht gefunden.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Zurück</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{store.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">{store.subdomain}</span>
            </div>
          </div>
          <Badge variant={store.is_active ? 'default' : 'secondary'} className="shrink-0">
            {store.is_active ? 'Aktiv' : 'Pausiert'}
          </Badge>
        </div>

        {/* === OVERVIEW: 3 Kacheln === */}
        {view === 'overview' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <BereichsauswahlCard
              title="Listen"
              description={`Obst/Gemüse & Backshop für ${store.name}`}
              icon={ClipboardList}
              onClick={() => setView('listen')}
              variant="obst"
            />
            <BereichsauswahlCard
              title="Benutzer"
              description="Benutzer anlegen, Rollen und Passwörter verwalten"
              icon={Users}
              onClick={() => setView('benutzer')}
              variant="benutzer"
            />
            <BereichsauswahlCard
              title="Einstellungen"
              description="Name, Subdomain, Sichtbarkeit"
              icon={Settings}
              onClick={() => setView('einstellungen')}
              variant="backshop"
            />
            <BereichsauswahlCard
              title="Kassenmodus"
              description="QR-Code, Kassen anlegen, Vorschau"
              icon={ScanLine}
              onClick={() => setView('kassenmodus')}
              variant="obst"
            />
          </div>
        )}

        {/* === LISTEN: Obst/Backshop-Auswahl === */}
        {view === 'listen' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {obstVisible && (
              <BereichsauswahlCard
                title="Obst & Gemüse"
                description="PLU-Listen und Konfiguration für diesen Markt"
                icon={Apple}
                onClick={() => setView('listen-obst')}
                variant="obst"
              />
            )}
            {backshopVisible && (
              <BereichsauswahlCard
                title="Backshop"
                description="Backshop-Listen und Konfiguration für diesen Markt"
                icon={Croissant}
                onClick={() => setView('listen-backshop')}
                variant="backshop"
              />
            )}
            {!obstVisible && !backshopVisible && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                Keine Listen sichtbar. Unter Einstellungen können Listen aktiviert werden.
              </p>
            )}
          </div>
        )}

        {/* === LISTEN-OBST: wie Admin-Hub – PLU-Liste direkt, Konfiguration als eigener Hub === */}
        {view === 'listen-obst' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-800">Obst und Gemüse</h3>
              <p className="text-muted-foreground">
                PLU-Liste öffnen oder Darstellung und Regeln für diesen Markt anpassen.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <BereichsauswahlCard
                title="PLU-Liste"
                description="Masterliste, eigene Produkte, Ausgeblendete, Werbung, Umbenennungen – Aktionen in der Toolbar"
                icon={ClipboardList}
                onClick={() => navigate(`/super-admin/masterlist?backTo=${encodeURIComponent(marktListenBackObst)}`)}
                variant="obst"
              />
              <BereichsauswahlCard
                title="Konfiguration der Liste"
                description="Layout, Bezeichnungsregeln und Warengruppen (Workbench)"
                icon={LayoutGrid}
                onClick={() => navigate(`/super-admin/markt/obst/konfiguration?backTo=${encodeURIComponent(marktListenBackObst)}`)}
                variant="obst"
              />
            </div>
          </div>
        )}

        {/* === LISTEN-BACKSHOP: wie Admin-Hub === */}
        {view === 'listen-backshop' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h3>
              <p className="text-muted-foreground">
                PLU-Tabelle und Konfiguration direkt; unter „Backshop“ zusätzlich Werbung nach Kalenderwoche oder
                Kachel-Übersicht mit PDF.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <BereichsauswahlCard
                title="PLU-Liste"
                description="Backshop-Liste, eigene Produkte, Ausgeblendete, Werbung, Umbenennungen – Aktionen in der Toolbar"
                icon={ClipboardList}
                onClick={() => navigate(`/super-admin/backshop-list?backTo=${encodeURIComponent(marktListenBackBackshop)}`)}
                variant="backshop"
              />
              <BereichsauswahlCard
                title="Konfiguration der Liste"
                description="Layout, Bezeichnungsregeln, Gruppenregeln und Warengruppen-Sortierung"
                icon={LayoutGrid}
                onClick={() => navigate(`/super-admin/markt/backshop/konfiguration?backTo=${encodeURIComponent(marktListenBackBackshop)}`)}
                variant="backshop"
              />
              <BereichsauswahlCard
                title="Backshop"
                description="Werbung nach Kalenderwoche oder Kachel-Übersicht (Warengruppen, PDF) – gleiche Daten wie die PLU-Tabelle"
                icon={Croissant}
                onClick={() => setView('listen-backshop-inhalt')}
                variant="backshop"
              />
            </div>
          </div>
        )}

        {view === 'listen-backshop-inhalt' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h3>
              <p className="text-muted-foreground">
                Wähle Werbung (KW-Übersicht) oder die kompakte Backshop-Liste mit Kacheln und PDF-Export.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <BereichsauswahlCard
                title="Werbung"
                description="Kalenderwoche wählen: zentrale Werbung bestellen, Strichcodes, Mengen Mo–Sa"
                icon={Megaphone}
                onClick={() =>
                  navigate(
                    `/super-admin/backshop-werbung?backTo=${encodeURIComponent(marktListenBackBackshopInhalt)}`,
                  )
                }
                variant="backshop"
              />
              <BereichsauswahlCard
                title="Backshop-Liste"
                description="Kacheln nach Warengruppe ohne Werbungs-Artikel, PDF mit Stand – gleiche Sortierung wie die PLU-Tabelle"
                icon={LayoutTemplate}
                onClick={() =>
                  navigate(
                    `/super-admin/backshop-kacheln?backTo=${encodeURIComponent(marktListenBackBackshopInhalt)}`,
                  )
                }
                variant="backshop"
              />
            </div>
          </div>
        )}

        {view === 'kassenmodus' && (
          <div className="space-y-4">
            <AdminKassenmodusPage embedded />
          </div>
        )}

        {/* === BENUTZER: Vollständige Verwaltung für diesen Markt === */}
        {view === 'benutzer' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Benutzer ({storeUsers?.length ?? 0})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddUser(true)}>
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Bestehenden</span> zuweisen
                  </Button>
                  <Button size="sm" className="gap-1" onClick={() => setShowCreateUser(true)}>
                    <UserPlus className="h-4 w-4" />
                    Neuer Benutzer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !storeUsers?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Noch keine Benutzer zugewiesen.
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Personalnr.</TableHead>
                        <TableHead>Rolle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeUsers.map(u => (
                        <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailUser(u)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {u.display_name || '–'}
                              {u.isHomeStore && (
                                <Home className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono hidden sm:table-cell">{formatProfileDisplayPersonalnummer(u.personalnummer)}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'secondary' : 'outline'}>
                              {roleBadgeLabel(u.role)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* === USER-DETAIL-DIALOG === */}
        <UserDetailDialog
          user={detailUser}
          open={!!detailUser}
          onOpenChange={(open) => { if (!open) setDetailUser(null) }}
          storeId={store.id}
          isSuperAdmin={isSuperAdmin}
          isSelf={detailUser?.id === currentUser?.id}
          roleMutationPending={updateRoleMutation.isPending}
          onResetPassword={(u) => { setSelectedUser(u); setShowResetConfirm(true) }}
          onRemove={(u) => { setSelectedUser(u); setShowRemoveConfirm(true) }}
          onDelete={(u) => { setSelectedUser(u); setShowDeleteUserConfirm(true) }}
          onRoleChange={(userId, role) => updateRoleMutation.mutate({ userId, newRole: role })}
        />

        {/* === EINSTELLUNGEN === */}
        {view === 'einstellungen' && (
          <div className="space-y-6">
            {/* Markt aktiv/pausiert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Markt-Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Markt {store.is_active ? 'aktiv' : 'pausiert'}</p>
                    <p className="text-xs text-muted-foreground">Pausierte Märkte sind für Benutzer nicht sichtbar</p>
                  </div>
                  <Switch
                    checked={store.is_active}
                    disabled={updateStore.isPending}
                    onCheckedChange={async (checked) => {
                      await updateStore.mutateAsync({ id: store.id, isActive: checked })
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Listen-Sichtbarkeit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Listen-Sichtbarkeit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Obst & Gemüse</p>
                    <p className="text-xs text-muted-foreground">PLU-Liste Obst & Gemüse für diesen Markt anzeigen</p>
                  </div>
                  <Switch
                    checked={obstVisible}
                    disabled={updateVisibility.isPending}
                    onCheckedChange={async (checked) => {
                      await updateVisibility.mutateAsync({ storeId: store.id, listType: 'obst_gemuese', isVisible: checked })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Backshop</p>
                    <p className="text-xs text-muted-foreground">Backshop-Liste für diesen Markt anzeigen</p>
                  </div>
                  <Switch
                    checked={backshopVisible}
                    disabled={updateVisibility.isPending}
                    onCheckedChange={async (checked) => {
                      await updateVisibility.mutateAsync({ storeId: store.id, listType: 'backshop', isVisible: checked })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Kassenmodus</p>
                    <p className="text-xs text-muted-foreground">
                      QR-Link und Kassen-Anmeldung für diesen Markt. Ausgeschaltet: kein Login, auch nicht mit gespeichertem
                      QR-Code.
                    </p>
                  </div>
                  <Switch
                    checked={kioskVisible}
                    disabled={updateVisibility.isPending}
                    onCheckedChange={async (checked) => {
                      await updateVisibility.mutateAsync({ storeId: store.id, listType: 'kiosk', isVisible: checked })
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Markt-Einstellungen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Markt-Einstellungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Marktname</p>
                    <p className="text-sm text-muted-foreground">{store.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditValue(store.name); setShowEditName(true) }}>
                    Ändern
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Subdomain</p>
                    <p className="text-sm text-muted-foreground break-words">{store.subdomain}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void copyMarketLoginUrl()}>
                      <Copy className="h-3.5 w-3.5" />
                      Kopieren
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditValue(store.subdomain); setShowEditSubdomain(true) }}>
                      Ändern
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowDelete(true)}>
                    <Trash2 className="h-3 w-3" /> Markt löschen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============================== */}
        {/* ========== DIALOGE =========== */}
        {/* ============================== */}

        {/* Marktname ändern */}
        <Dialog open={showEditName} onOpenChange={setShowEditName}>
          <DialogContent>
            <DialogHeader><DialogTitle>Marktname ändern</DialogTitle></DialogHeader>
            <div className="space-y-2 py-4">
              <Label>Neuer Name</Label>
              <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditName(false)}>Abbrechen</Button>
              <Button onClick={async () => {
                await updateStore.mutateAsync({ id: store.id, name: editValue.trim() })
                setShowEditName(false)
              }}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Subdomain ändern */}
        <Dialog open={showEditSubdomain} onOpenChange={setShowEditSubdomain}>
          <DialogContent>
            <DialogHeader><DialogTitle>Subdomain ändern</DialogTitle></DialogHeader>
            <div className="space-y-2 py-4">
              <Label>Neue Subdomain</Label>
              <Input value={editValue} onChange={e => setEditValue(e.target.value.toLowerCase())} />
              <p className="text-xs text-destructive">
                Achtung: Bestehende Links und Bookmarks funktionieren danach nicht mehr.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditSubdomain(false)}>Abbrechen</Button>
              <Button onClick={async () => {
                const err = validateSubdomain(editValue)
                if (err) { toast.error(err); return }
                await updateStore.mutateAsync({ id: store.id, subdomain: editValue.trim() })
                setShowEditSubdomain(false)
              }}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Markt löschen */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Markt endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle Daten, User-Zuordnungen und Einstellungen dieses Marktes werden unwiderruflich gelöscht.
                Gib den Marktnamen ein um zu bestätigen:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input placeholder={store.name} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button variant="destructive"
                disabled={deleteConfirm !== store.name || deleteStore.isPending}
                onClick={async () => {
                  await deleteStore.mutateAsync(store.id)
                  navigate(`/super-admin/companies/${companyId}`)
                }}
              >
                {deleteStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Endgültig löschen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bestehenden Benutzer zuweisen */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Benutzer zuweisen</DialogTitle>
              <DialogDescription>Bestehenden Benutzer diesem Markt zuweisen.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[320px] overflow-y-auto space-y-2 py-2">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine weiteren Benutzer verfügbar.
                </p>
              ) : (
                availableUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{u.display_name || u.personalnummer || u.email}</p>
                      <p className="text-xs text-muted-foreground">{roleBadgeLabel(u.role)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1"
                      disabled={addUserToStore.isPending}
                      onClick={async () => {
                        await addUserToStore.mutateAsync({ userId: u.id, storeId: store.id })
                        setShowAddUser(false)
                      }}
                    >
                      <UserPlus className="h-3 w-3" /> Zuweisen
                    </Button>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUser(false)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Neuen Benutzer anlegen */}
        <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
              <DialogDescription>
                Der Benutzer wird automatisch diesem Markt zugewiesen und erhält ein Einmalpasswort.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Max Mustermann" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Personalnummer (7-stellig)</Label>
                <Input placeholder="1234567" value={newPersonalnummer} onChange={e => setNewPersonalnummer(e.target.value)} maxLength={7} />
              </div>
              <div className="space-y-2">
                <Label>E-Mail-Adresse</Label>
                <Input type="email" placeholder="name@firma.de" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">Mindestens Personalnummer oder E-Mail angeben.</p>
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Rolle</Label>
                  <Select value={newRole} onValueChange={v => setNewRole(v as 'user' | 'admin' | 'viewer')} disabled={createUserMutation.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Personal)</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateUser(false)}>Abbrechen</Button>
              <Button
                onClick={() =>
                  createUserMutation.mutate({
                    newEmail,
                    newPersonalnummer,
                    newDisplayName,
                    newRole,
                  })
                }
                disabled={!(newPersonalnummer.trim() || newEmail.trim()) || createUserMutation.isPending}
              >
                {createUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird erstellt...</> : 'Benutzer erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Einmalpasswort anzeigen */}
        <Dialog open={showPasswordDialog} onOpenChange={open => {
          setShowPasswordDialog(open)
          if (!open) { setGeneratedPassword(''); setSelectedUser(null); setCopied(false) }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Einmalpasswort</DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? `Neues Einmalpasswort für ${selectedUser.display_name || selectedUser.personalnummer}:`
                  : 'Gib dieses Passwort an den Benutzer weiter.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
              <code className="flex-1 text-center text-2xl font-mono font-bold tracking-wider">{generatedPassword}</code>
              <Button variant="outline" size="icon" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Dieses Passwort wird nur einmal angezeigt.
            </p>
            <DialogFooter>
              <Button onClick={() => setShowPasswordDialog(false)}>Verstanden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Passwort zurücksetzen – Bestätigung */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Passwort zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Der Benutzer erhält ein neues Einmalpasswort und muss sich damit neu anmelden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button disabled={!selectedUser || resetPasswordMutation.isPending}
                onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
              >
                {resetPasswordMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird zurückgesetzt...</> : 'Passwort zurücksetzen'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Benutzer vom Markt entfernen – Bestätigung */}
        <AlertDialog open={showRemoveConfirm} onOpenChange={open => {
          setShowRemoveConfirm(open)
          if (!open) setSelectedUser(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Benutzer vom Markt entfernen?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.display_name || selectedUser?.personalnummer} wird von diesem Markt entfernt.
                Der Benutzer-Account bleibt bestehen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button variant="destructive"
                disabled={!selectedUser || removeUserFromStore.isPending}
                onClick={async () => {
                  if (!selectedUser) return
                  await removeUserFromStore.mutateAsync({ userId: selectedUser.id, storeId: store.id })
                  setShowRemoveConfirm(false)
                  setSelectedUser(null)
                }}
              >
                {removeUserFromStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entfernen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Benutzer endgueltig loeschen – Bestätigung */}
        <AlertDialog open={showDeleteUserConfirm} onOpenChange={open => {
          setShowDeleteUserConfirm(open)
          if (!open) setSelectedUser(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Benutzer endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{selectedUser?.display_name || selectedUser?.personalnummer}</strong> wird
                unwiderruflich aus dem gesamten System gelöscht (Auth, Profil, alle Marktzuordnungen).
                Die Personalnummer wird danach wieder frei.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button variant="destructive"
                disabled={!selectedUser || deleteUserMutation.isPending}
                onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              >
                {deleteUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Endgültig löschen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

/* ═══════════════════════════════════════════════════ */
/* ══ User-Detail-Dialog (zentriertes Popup)        ══ */
/* ═══════════════════════════════════════════════════ */

type StoreUser = Profile & { isHomeStore: boolean }

interface UserDetailVisibilitySwitchesProps {
  user: StoreUser
  storeId: string
  visibilityRows: UserListVisibility[]
  updateVisibility: ReturnType<typeof useUpdateUserListVisibility>
}

/** Eigener Mount pro Benutzer/Markt (key) – initiale Schalter aus Serverdaten ohne setState im Effect */
function UserDetailVisibilitySwitches({
  user,
  storeId,
  visibilityRows,
  updateVisibility,
}: UserDetailVisibilitySwitchesProps) {
  const { obstGemuese: storeObstOn, backshop: storeBackshopOn } = useStoreListAreaEnabled(storeId)
  const obst = visibilityRows.find(v => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const backshop = visibilityRows.find(v => v.list_type === 'backshop')?.is_visible ?? true
  const [obstLocal, setObstLocal] = useState(obst)
  const [backshopLocal, setBackshopLocal] = useState(backshop)

  const setVisibility = async (listType: string, isVisible: boolean) => {
    if (listType === 'obst_gemuese' && !storeObstOn) return
    if (listType === 'backshop' && !storeBackshopOn) return
    if (listType === 'obst_gemuese') setObstLocal(isVisible)
    else setBackshopLocal(isVisible)
    await updateVisibility.mutateAsync({ userId: user.id, storeId, listType, isVisible })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sichtbare Bereiche</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Welche Listen sieht dieser Benutzer? (Nur möglich, wenn die Liste am Markt freigeschaltet ist.)</p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-1 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Apple className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Obst & Gemüse</span>
            </div>
            <Switch
              checked={storeObstOn ? obstLocal : false}
              disabled={updateVisibility.isPending || !storeObstOn}
              onCheckedChange={(checked) => void setVisibility('obst_gemuese', checked)}
            />
          </div>
          {!storeObstOn && (
            <p className="text-xs text-muted-foreground">Am Markt deaktiviert – unter Einstellungen dieses Marktes einschalten.</p>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Croissant className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium">Backshop</span>
            </div>
            <Switch
              checked={storeBackshopOn ? backshopLocal : false}
              disabled={updateVisibility.isPending || !storeBackshopOn}
              onCheckedChange={(checked) => void setVisibility('backshop', checked)}
            />
          </div>
          {!storeBackshopOn && (
            <p className="text-xs text-muted-foreground">Am Markt deaktiviert – unter Einstellungen dieses Marktes einschalten.</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface UserDetailDialogProps {
  user: StoreUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  isSuperAdmin: boolean
  isSelf: boolean
  roleMutationPending?: boolean
  onResetPassword: (u: StoreUser) => void
  onRemove: (u: StoreUser) => void
  onDelete: (u: StoreUser) => void
  onRoleChange: (userId: string, newRole: string) => void
}

function UserDetailDialog({
  user, open, onOpenChange, storeId, isSuperAdmin, isSelf, roleMutationPending,
  onResetPassword, onRemove, onDelete, onRoleChange,
}: UserDetailDialogProps) {
  const { data: visibilityRows } = useUserListVisibilityForUser(user?.id, storeId)
  const updateVisibility = useUpdateUserListVisibility()

  const syncKey = user?.id && storeId ? `${user.id}-${storeId}` : ''

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header mit Avatar-Kreis */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {(user.display_name ?? user.personalnummer ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{user.display_name || user.personalnummer || '–'}</DialogTitle>
              <DialogDescription className="text-xs">
                {formatProfileDisplayEmail(user.email) !== '–' ? formatProfileDisplayEmail(user.email) : `Nr. ${formatProfileDisplayPersonalnummer(user.personalnummer)}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* ── Profil-Infos als kompakte Kacheln ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Personalnr.</p>
              <p className="text-sm font-mono font-medium mt-0.5">{formatProfileDisplayPersonalnummer(user.personalnummer)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Heimatmarkt</p>
              <p className="text-sm font-medium mt-0.5">{user.isHomeStore ? 'Ja' : 'Nein'}</p>
            </div>
          </div>

          {/* ── Rolle ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rolle</Label>
            {isSuperAdmin && !isSelf ? (
              <Select value={user.role} onValueChange={(val) => onRoleChange(user.id, val)} disabled={roleMutationPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Personal</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div>
                <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'} className="text-sm">
                  {roleBadgeLabel(user.role)}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Sichtbare Bereiche ── */}
          {visibilityRows !== undefined ? (
            <UserDetailVisibilitySwitches
              key={open ? syncKey : 'closed'}
              user={user}
              storeId={storeId}
              visibilityRows={visibilityRows}
              updateVisibility={updateVisibility}
            />
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sichtbare Bereiche</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Welche Listen sieht dieser Benutzer?</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade Bereiche…
              </div>
            </div>
          )}

          <Separator />

          {/* ── Aktionen ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktionen</Label>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onOpenChange(false); onResetPassword(user) }}>
              <KeyRound className="h-4 w-4" />
              Passwort zurücksetzen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2"
                disabled={isSelf}
                onClick={() => { onOpenChange(false); onRemove(user) }}
              >
                <UserMinus className="h-4 w-4" />
                Entfernen
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2 text-destructive hover:text-destructive"
                disabled={isSelf}
                onClick={() => { onOpenChange(false); onDelete(user) }}
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Entfernen = nur von diesem Markt. Löschen = Account komplett weg.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
