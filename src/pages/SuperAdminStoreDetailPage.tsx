import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, invokeEdgeFunction } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { DashboardGroupCard, type DashboardGroupCardItem } from '@/components/layout/DashboardCard'
import { useStoreById, useUpdateStore, useDeleteStore } from '@/hooks/useStores'
import { useStoreListVisibility, useUpdateStoreListVisibility } from '@/hooks/useStoreListVisibility'
import { useStoreUserProfiles, useAddUserToStore, useRemoveUserFromStore } from '@/hooks/useStoreAccess'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ClipboardList, Users, Settings, Trash2, Loader2,
  Apple, Croissant, Eye, Globe, Home, UserPlus, KeyRound, Copy, Check, UserMinus,
  Plus, EyeOff, Megaphone, Pencil, Palette, FileText, ListOrdered,
} from 'lucide-react'
import { validateSubdomain } from '@/lib/subdomain'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { formatProfileDisplayEmail, formatProfileDisplayPersonalnummer, roleBadgeLabel, generateOneTimePassword } from '@/lib/profile-helpers'

type Section = 'overview' | 'listen' | 'listen-obst' | 'listen-backshop' | 'benutzer' | 'einstellungen'

function buildObstItems(backTo: string): DashboardGroupCardItem[] {
  const s = { backTo }
  return [
    { title: 'Masterliste Obst/Gemüse', description: 'PLU-Liste anzeigen und bearbeiten', icon: ClipboardList, to: '/super-admin/masterlist', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Eigene Produkte', description: 'Hinzufügen, bearbeiten, ausblenden', icon: Plus, to: '/super-admin/custom-products', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Ausgeblendete', description: 'Einsehen und wieder einblenden', icon: EyeOff, to: '/super-admin/hidden-products', state: s, color: 'text-gray-600', bg: 'bg-gray-100' },
    { title: 'Werbung', description: 'Angebote verwalten', icon: Megaphone, to: '/super-admin/offer-products', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Umbenannte', description: 'Anzeigenamen anpassen', icon: Pencil, to: '/super-admin/renamed-products', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]
}

function buildObstConfigItems(backTo: string): DashboardGroupCardItem[] {
  const s = { backTo }
  return [
    { title: 'Layout', description: 'Sortierung, Anzeige, Schriftgrößen', icon: Palette, to: '/super-admin/layout', state: s, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Inhalt & Regeln', description: 'Bezeichnungsregeln und Warengruppen', icon: FileText, to: '/super-admin/rules', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Block-Sortierung', description: 'Reihenfolge der Blöcke anpassen', icon: ListOrdered, to: '/super-admin/block-sort', state: s, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]
}

function buildBackshopItems(backTo: string): DashboardGroupCardItem[] {
  const s = { backTo }
  return [
    { title: 'Backshop-Liste', description: 'Liste mit Bild, PLU und Name', icon: ClipboardList, to: '/super-admin/backshop-list', state: s, color: 'text-slate-600', bg: 'bg-slate-100' },
    { title: 'Eigene Produkte (Backshop)', description: 'Eigene Backshop-Produkte anlegen', icon: Plus, to: '/super-admin/backshop-custom-products', state: s, color: 'text-slate-600', bg: 'bg-slate-100' },
    { title: 'Ausgeblendete (Backshop)', description: 'Ausgeblendete einblenden', icon: EyeOff, to: '/super-admin/backshop-hidden-products', state: s, color: 'text-slate-600', bg: 'bg-slate-100' },
    { title: 'Werbung (Backshop)', description: 'Angebote verwalten', icon: Megaphone, to: '/super-admin/backshop-offer-products', state: s, color: 'text-slate-600', bg: 'bg-slate-100' },
    { title: 'Umbenannte (Backshop)', description: 'Anzeigenamen anpassen', icon: Pencil, to: '/super-admin/backshop-renamed-products', state: s, color: 'text-slate-600', bg: 'bg-slate-100' },
  ]
}

function buildBackshopConfigItems(backTo: string): DashboardGroupCardItem[] {
  const s = { backTo }
  return [
    { title: 'Layout (Backshop)', description: 'Sortierung und Schriftgrößen', icon: Palette, to: '/super-admin/backshop-layout', state: s, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Inhalt & Regeln (Backshop)', description: 'Bezeichnungsregeln und Warengruppen', icon: FileText, to: '/super-admin/backshop-rules', state: s, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Block-Sortierung (Backshop)', description: 'Reihenfolge der Blöcke', icon: ListOrdered, to: '/super-admin/backshop-block-sort', state: s, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]
}

export function SuperAdminStoreDetailPage() {
  const { companyId, storeId } = useParams<{ companyId: string; storeId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { isSuperAdmin, user: currentUser } = useAuth()
  const { setActiveStore } = useCurrentStore()

  const view = (searchParams.get('view') ?? 'overview') as Section
  const setView = (s: Section) => {
    if (s === 'overview') setSearchParams({}, { replace: true })
    else setSearchParams({ view: s }, { replace: true })
  }

  const { data: store, isLoading } = useStoreById(storeId)
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

  // Alle Profile laden (für "Benutzer hinzufügen" Dialog)
  const { data: allProfiles } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('display_name')
      if (error) throw error
      return data as Profile[]
    },
  })

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
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  // Create-User Formular
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPersonalnummer, setNewPersonalnummer] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'viewer'>('user')

  const obstVisible = visibility?.find(v => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const backshopVisible = visibility?.find(v => v.list_type === 'backshop')?.is_visible ?? true

  const currentPath = `/super-admin/companies/${companyId}/stores/${storeId}?view=${view}`

  // Benutzer erstellen (Edge Function)
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const pw = generateOneTimePassword()
      await invokeEdgeFunction('create-user', {
        email: newEmail.trim() || undefined,
        password: pw,
        personalnummer: newPersonalnummer.trim() || undefined,
        displayName: newDisplayName,
        role: isSuperAdmin ? newRole : 'user',
        home_store_id: storeId,
        additional_store_ids: [],
      })
      return { oneTimePassword: pw }
    },
    onSuccess: (result) => {
      setGeneratedPassword(result.oneTimePassword)
      setShowCreateUser(false)
      setShowPasswordDialog(true)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      setNewDisplayName(''); setNewEmail(''); setNewPersonalnummer(''); setNewRole('user')
      toast.success('Benutzer angelegt und diesem Markt zugewiesen!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Passwort zurücksetzen (Edge Function)
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const pw = generateOneTimePassword()
      await invokeEdgeFunction('reset-password', { userId, newPassword: pw })
      return pw
    },
    onSuccess: (pw) => {
      setShowResetConfirm(false)
      setGeneratedPassword(pw)
      setShowPasswordDialog(true)
      toast.success('Passwort wurde zurückgesetzt!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Benutzer endgueltig loeschen (Edge Function)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await invokeEdgeFunction('delete-user', { userId })
    },
    onSuccess: () => {
      setShowDeleteUserConfirm(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['store-access'] })
      toast.success('Benutzer wurde endgültig gelöscht.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Rolle aendern (Edge Function)
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole: role }: { userId: string; newRole: string }) => {
      await invokeEdgeFunction('update-user-role', { userId, newRole: role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      toast.success('Rolle wurde geändert.')
    },
    onError: (e: Error) => toast.error(e.message),
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

  // Benutzer die noch NICHT diesem Markt zugewiesen sind
  const assignedUserIds = new Set(storeUsers?.map(u => u.id) ?? [])
  const availableUsers = allProfiles?.filter(
    p => p.role !== 'super_admin' && !assignedUserIds.has(p.id),
  ) ?? []

  if (isLoading || !store) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
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
          <div className="grid gap-6 sm:grid-cols-3">
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

        {/* === LISTEN-OBST: Marktspezifische Obst-Items === */}
        {view === 'listen-obst' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardGroupCard
              title="PLU-Listen (Obst/Gemüse)"
              description="Masterliste, eigene und ausgeblendete Produkte"
              items={buildObstItems(currentPath)}
            />
            <DashboardGroupCard
              title="Konfiguration (Obst/Gemüse)"
              description="Layout und Inhaltsregeln"
              items={buildObstConfigItems(currentPath)}
            />
          </div>
        )}

        {/* === LISTEN-BACKSHOP: Marktspezifische Backshop-Items === */}
        {view === 'listen-backshop' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardGroupCard
              title="Backshop-Listen"
              description="Liste, eigene und ausgeblendete Produkte"
              items={buildBackshopItems(currentPath)}
            />
            <DashboardGroupCard
              title="Konfiguration (Backshop)"
              description="Layout und Inhaltsregeln"
              items={buildBackshopConfigItems(currentPath)}
            />
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
                        <TableHead className="hidden md:table-cell">E-Mail</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead className="hidden sm:table-cell">Heimat</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.display_name || '–'}</TableCell>
                          <TableCell className="font-mono hidden sm:table-cell">{formatProfileDisplayPersonalnummer(u.personalnummer)}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{formatProfileDisplayEmail(u.email)}</TableCell>
                          <TableCell>
                            {isSuperAdmin && u.id !== currentUser?.id ? (
                              <Select
                                value={u.role}
                                onValueChange={(val) => updateRoleMutation.mutate({ userId: u.id, newRole: val })}
                              >
                                <SelectTrigger className="h-8 w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="user">Personal</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={u.role === 'admin' ? 'secondary' : 'outline'}>
                                {roleBadgeLabel(u.role)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {u.isHomeStore && (
                              <Badge variant="default" className="gap-1">
                                <Home className="h-3 w-3" /> Heimatmarkt
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button variant="outline" size="sm" className="gap-1"
                                onClick={() => { setSelectedUser(u); setShowResetConfirm(true) }}
                              >
                                <KeyRound className="h-3 w-3" /><span className="hidden sm:inline"> Passwort</span>
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1"
                                disabled={u.id === currentUser?.id}
                                onClick={() => { setSelectedUser(u); setShowRemoveConfirm(true) }}
                              >
                                <UserMinus className="h-3 w-3" /><span className="hidden sm:inline"> Entfernen</span>
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive"
                                disabled={u.id === currentUser?.id}
                                onClick={() => { setSelectedUser(u); setShowDeleteUserConfirm(true) }}
                              >
                                <Trash2 className="h-3 w-3" /><span className="hidden sm:inline"> Löschen</span>
                              </Button>
                            </div>
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
                  <Switch checked={store.is_active}
                    onCheckedChange={async (checked) => {
                      await updateStore.mutateAsync({ id: storeId!, isActive: checked })
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
                  <Switch checked={obstVisible}
                    onCheckedChange={async (checked) => {
                      await updateVisibility.mutateAsync({ storeId: storeId!, listType: 'obst_gemuese', isVisible: checked })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Backshop</p>
                    <p className="text-xs text-muted-foreground">Backshop-Liste für diesen Markt anzeigen</p>
                  </div>
                  <Switch checked={backshopVisible}
                    onCheckedChange={async (checked) => {
                      await updateVisibility.mutateAsync({ storeId: storeId!, listType: 'backshop', isVisible: checked })
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Subdomain</p>
                    <p className="text-sm text-muted-foreground">{store.subdomain}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditValue(store.subdomain); setShowEditSubdomain(true) }}>
                    Ändern
                  </Button>
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
                await updateStore.mutateAsync({ id: storeId!, name: editValue.trim() })
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
                await updateStore.mutateAsync({ id: storeId!, subdomain: editValue.trim() })
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
                  await deleteStore.mutateAsync(storeId!)
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
                        await addUserToStore.mutateAsync({ userId: u.id, storeId: storeId! })
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
                  <Select value={newRole} onValueChange={v => setNewRole(v as 'user' | 'admin' | 'viewer')}>
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
                onClick={() => createUserMutation.mutate()}
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
                  await removeUserFromStore.mutateAsync({ userId: selectedUser.id, storeId: storeId! })
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
