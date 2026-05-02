import { useState } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { invokeEdgeFunction, isTestModeActive } from '@/lib/supabase'
import { createUserSchema, createUserResponseSchema, validateEdgeFunctionResponse } from '@/lib/validation'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from 'react-router-dom'
import { UserPlus, KeyRound, Loader2, Copy, Check, Users, Trash2, Building2, Eye, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { formatProfileDisplayEmail, formatProfileDisplayPersonalnummer, roleBadgeLabel, generateOneTimePassword } from '@/lib/profile-helpers'
import { useUserManagementProfileList } from '@/hooks/useUserManagementProfileList'
import { useAllStores } from '@/hooks/useStores'
import { useStoreAccessByUser, useAddUserToStore, useRemoveUserFromStore } from '@/hooks/useStoreAccess'
import {
  useStoreListAreaEnabled,
  useUserListVisibilityForUser,
  useUpdateUserListVisibility,
} from '@/hooks/useStoreListVisibility'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

/**
 * Benutzerverwaltung – für Admin und Super-Admin.
 * - Super-Admin: Kann User, Admin und Viewer anlegen; Rollen ändern; Märkte zuweisen
 * - Admin: Kann User, Admin und Viewer anlegen; Rollen ändern (außer sich selbst); Märkte zuweisen
 * Beide können Passwörter zurücksetzen (Einmalpasswort).
 */
function invalidateProfileLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
  queryClient.invalidateQueries({ queryKey: ['company-profiles'] })
}

export function UserManagement() {
  const {
    isSuperAdmin,
    currentUserId,
    currentCompanyId,
    storeName,
    isLoading,
    isError,
    needsCompanyHint,
    filteredUsers,
    firstUserRowId,
    defaultStoreId,
  } = useUserManagementProfileList()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [copied, setCopied] = useState(false)

  // Märkte-Dialog State
  const [storeDialogUser, setStoreDialogUser] = useState<Profile | null>(null)
  const { data: allStores } = useAllStores()
  const { data: userStoreAccess } = useStoreAccessByUser(storeDialogUser?.id)
  const addUserToStore = useAddUserToStore()
  const removeUserFromStore = useRemoveUserFromStore()
  const userAssignedStoreIds = new Set(userStoreAccess?.map(a => a.store_id) ?? [])

  // Firmen: Ziel-User oder (bei leer) aktuelle Firma (Admin/Super-Admin)
  const userCompanyIds = new Set(
    allStores?.filter(s => userAssignedStoreIds.has(s.id)).map(s => s.company_id) ?? [],
  )
  const targetCompanyIds = userCompanyIds.size > 0
    ? userCompanyIds
    : isSuperAdmin && currentCompanyId
      ? new Set([currentCompanyId])
      : new Set(allStores?.map(s => s.company_id) ?? [])
  const companyFilteredStores = (allStores ?? []).filter(s => targetCompanyIds.has(s.company_id))

  // Bereiche-Dialog State
  const [visibilityDialogUser, setVisibilityDialogUser] = useState<Profile | null>(null)
  const { data: userVisibility } = useUserListVisibilityForUser(visibilityDialogUser?.id, defaultStoreId)
  const updateUserVisibility = useUpdateUserListVisibility()
  const { obstGemuese: storeObstEnabled, backshop: storeBackshopEnabled, kiosk: storeKioskEnabled } =
    useStoreListAreaEnabled(defaultStoreId)
  const userObstVisible = userVisibility?.find(v => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const userBackshopVisible = userVisibility?.find(v => v.list_type === 'backshop')?.is_visible ?? true

  // Formular States für neuen User
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPersonalnummer, setNewPersonalnummer] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'viewer'>('user')

  // User erstellen
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!defaultStoreId) {
        throw new Error('Standard-Markt konnte nicht geladen werden. Bitte versuche es später erneut.')
      }

      const oneTimePassword = generateOneTimePassword()
      const roleToCreate = newRole

      const validated = createUserSchema.safeParse({
        email: newEmail.trim(),
        password: oneTimePassword,
        display_name: newDisplayName.trim(),
        personalnummer: newPersonalnummer.trim() || undefined,
        role: roleToCreate,
      })
      if (!validated.success) {
        throw new Error(validated.error.issues[0]?.message ?? 'Ungültige Eingabe')
      }

      const raw = await invokeEdgeFunction('create-user', {
        email: validated.data.email || undefined,
        password: oneTimePassword,
        personalnummer: validated.data.personalnummer || undefined,
        displayName: validated.data.display_name,
        role: roleToCreate,
        home_store_id: defaultStoreId,
        additional_store_ids: [],
      })
      const data = validateEdgeFunctionResponse(raw, createUserResponseSchema, 'create-user')

      return { oneTimePassword, user: data?.user }
    },
    onSuccess: (result) => {
      setGeneratedPassword(result.oneTimePassword)
      setShowCreateDialog(false)
      setShowPasswordDialog(true)
      invalidateProfileLists(queryClient)
      if (isTestModeActive()) {
        toast.info('Testmodus: Es wurde kein echter Benutzer angelegt. Das Einmalpasswort dient nur zur Übung.')
      } else {
        toast.success('Benutzer erfolgreich angelegt!')
      }

      // Formular zurücksetzen
      setNewDisplayName('')
      setNewEmail('')
      setNewPersonalnummer('')
      setNewRole('user')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    },
  })

  // Passwort zurücksetzen
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const oneTimePassword = generateOneTimePassword()
      await invokeEdgeFunction('reset-password', { userId, newPassword: oneTimePassword })
      return oneTimePassword
    },
    onSuccess: (password) => {
      setShowResetConfirmDialog(false)
      setGeneratedPassword(password)
      setShowPasswordDialog(true)
      invalidateProfileLists(queryClient)
      if (isTestModeActive()) {
        toast.info('Testmodus: Passwort wurde nicht wirklich geändert.')
      } else {
        toast.success('Passwort wurde zurückgesetzt!')
      }
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    },
  })

  // Benutzer löschen
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await invokeEdgeFunction('delete-user', { userId })
    },
    onSuccess: () => {
      setShowDeleteConfirmDialog(false)
      setUserToDelete(null)
      invalidateProfileLists(queryClient)
      if (isTestModeActive()) {
        toast.info('Testmodus: Benutzer wurde nicht wirklich gelöscht.')
      } else {
        toast.success('Benutzer wurde gelöscht.')
      }
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    },
  })

  // Passwort in Zwischenablage kopieren (mit Fallback für ältere Browser/HTTP)
  const copyPassword = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPassword)
      } else {
        const ta = document.createElement('textarea')
        ta.value = generatedPassword
        ta.setAttribute('readonly', '')
        ta.style.position = 'absolute'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kopieren fehlgeschlagen. Bitte Passwort manuell kopieren.')
    }
  }

  // Rollen-Badge Farbe und Label
  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default' as const
      case 'admin': return 'secondary' as const
      case 'viewer': return 'outline' as const
      default: return 'outline' as const
    }
  }


  // Rolle ändern (nur Super-Admin und Admin; nicht für sich selbst)
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'user' | 'admin' | 'viewer' }) => {
      await invokeEdgeFunction('update-user-role', { userId, newRole })
    },
    onSuccess: () => {
      invalidateProfileLists(queryClient)
      if (isTestModeActive()) {
        toast.info('Testmodus: Rolle wurde nicht wirklich geändert.')
      } else {
        toast.success('Rolle wurde geändert.')
      }
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

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

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="user-management-page">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight" data-tour="user-management-heading">
              Benutzerverwaltung
            </h2>
            <p className="text-muted-foreground">
              {isSuperAdmin
                ? 'Admins und Personal anlegen, Rollen und Passwörter verwalten.'
                : 'Personal anlegen, Rollen und Passwörter verwalten.'}
            </p>
          </div>

          {/* Neuen Benutzer anlegen */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-tour="user-management-new-user">
                <UserPlus className="h-4 w-4" />
                Neuer Benutzer
              </Button>
            </DialogTrigger>
            <DialogContent data-tour="user-management-create-dialog">
              <DialogHeader>
                <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
                <DialogDescription>
                  Der Benutzer erhält ein Einmalpasswort und muss beim ersten Login ein eigenes Passwort vergeben.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    placeholder="Max Mustermann"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-personalnr">Personalnummer (7-stellig)</Label>
                  <Input
                    id="create-personalnr"
                    placeholder="1234567"
                    value={newPersonalnummer}
                    onChange={(e) => setNewPersonalnummer(e.target.value)}
                    maxLength={7}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-email">E-Mail-Adresse</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="name@firma.de"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Personalnummer und E-Mail: mindestens eines angeben; bei beiden kann sich der Benutzer mit Personalnummer oder E-Mail anmelden.
                  </p>
                </div>

                {/* Admin und Super-Admin können Rolle wählen */}
                {(isSuperAdmin || isAdmin) && (
                  <div className="space-y-2">
                    <Label>Rolle</Label>
                    <Select
                      value={newRole}
                      onValueChange={(v) => setNewRole(v as 'user' | 'admin' | 'viewer')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User (Personal)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="viewer">Viewer (nur Liste + PDF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!defaultStoreId ? (
                  <p className="text-sm text-amber-600">
                    Kein Standard-Markt verfügbar. Bitte warte, bis die Märkte geladen sind, oder weise dir zuerst einen Heimatmarkt zu.
                  </p>
                ) : storeName && (
                  <p className="text-sm text-muted-foreground">
                    Der Benutzer wird dem Markt <strong>{storeName}</strong> zugewiesen.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  data-tour="user-management-create-submit"
                  onClick={() => createUserMutation.mutate()}
                  disabled={!(newPersonalnummer.trim() || newEmail.trim()) || !defaultStoreId || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    'Benutzer erstellen'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Einmalpasswort anzeigen Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          setShowPasswordDialog(open)
          if (!open) {
            setGeneratedPassword('')
            setSelectedUser(null)
            setCopied(false)
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Einmalpasswort</DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? `Neues Einmalpasswort für ${selectedUser.display_name || selectedUser.personalnummer}:`
                  : 'Gib dieses Passwort an den Benutzer weiter. Er muss es beim nächsten Login ändern.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
              <code className="flex-1 text-center text-2xl font-mono font-bold tracking-wider">
                {generatedPassword}
              </code>
              <Button variant="outline" size="icon" onClick={copyPassword} aria-label="Passwort kopieren">
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Dieses Passwort wird nur einmal angezeigt. Bitte notieren oder kopieren.
            </p>

            <DialogFooter>
              <Button onClick={() => setShowPasswordDialog(false)}>
                Verstanden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Passwort zurücksetzen – Bestätigung */}
        <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Passwort zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie wirklich das Passwort zurücksetzen? Die Person erhält ein Einmalpasswort
                und muss sich damit neu anmelden. Beim ersten Login muss ein eigenes Passwort vergeben werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button
                onClick={() => selectedUser && resetPasswordMutation.mutate(selectedUser.id)}
                disabled={!selectedUser || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird zurückgesetzt...
                  </>
                ) : (
                  'Passwort zurücksetzen'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Benutzer löschen – Bestätigung */}
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(open) => {
          setShowDeleteConfirmDialog(open)
          if (!open) setUserToDelete(null)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Benutzer wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass die Person gelöscht werden soll? Wenn Sie das bestätigen,
                werden alle Benutzerdaten unwiderruflich entfernt. Die Person kann sich nicht mehr anmelden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nein, nicht löschen</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                disabled={!userToDelete || deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gelöscht...
                  </>
                ) : (
                  'Ja, löschen'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* User-Tabelle */}
        <Card data-tour="user-management-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alle Benutzer ({filteredUsers?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {needsCompanyHint ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Bitte wähle oben eine Firma und einen Markt. Anschließend werden nur Benutzer dieser Firma angezeigt.
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Personalnr.</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Märkte</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow
                      key={user.id}
                      data-tour={user.id === firstUserRowId ? 'user-management-row-first' : undefined}
                    >
                      <TableCell className="font-medium">
                        {user.display_name || '–'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatProfileDisplayPersonalnummer(user.personalnummer)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatProfileDisplayEmail(user.email)}
                      </TableCell>
                      <TableCell>
                        {(isSuperAdmin || isAdmin) && user.role !== 'super_admin' && user.id !== currentUserId ? (
                          <Select
                            value={user.role}
                            onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, newRole: v as 'user' | 'admin' | 'viewer' })}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger
                              className="w-[140px] h-8"
                              data-tour={user.id === firstUserRowId ? 'user-management-row-edit' : undefined}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={roleBadgeVariant(user.role)}>
                            {roleBadgeLabel(user.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role !== 'super_admin' && (
                          <div className="flex flex-wrap gap-1">
                            <Button variant="outline" size="sm" className="gap-1"
                              onClick={() => setStoreDialogUser(user)}
                            >
                              <Building2 className="h-3 w-3" /> Märkte
                            </Button>
                            {user.id !== currentUserId && (
                              <Button variant="outline" size="sm" className="gap-1"
                                onClick={() => setVisibilityDialogUser(user)}
                              >
                                <Eye className="h-3 w-3" /> Bereiche
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== 'super_admin' && (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              data-tour={user.id === firstUserRowId ? 'user-management-row-reset-pw' : undefined}
                              disabled={resetPasswordMutation.isPending}
                              onClick={() => {
                                setSelectedUser(user)
                                setShowResetConfirmDialog(true)
                              }}
                            >
                              <KeyRound className="h-3 w-3" />
                              Passwort
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-destructive hover:text-destructive"
                                    disabled={deleteUserMutation.isPending || user.id === currentUserId}
                                    onClick={() => {
                                      setUserToDelete(user)
                                      setShowDeleteConfirmDialog(true)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Löschen
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.id === currentUserId ? 'Sie können sich nicht selbst löschen' : 'Benutzer löschen'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredUsers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Noch keine Benutzer angelegt.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {storeKioskEnabled && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
                Kassen & QR
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                QR-Code drucken, Kassen anlegen und Passwörter für den Kassenmodus verwalten.
              </p>
              <Button variant="secondary" asChild className="shrink-0 self-start sm:self-auto">
                <Link to="/admin/kassenmodus">Zum Kassenmodus</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Märkte-Zuordnung Dialog */}
        <Dialog open={!!storeDialogUser} onOpenChange={(open) => { if (!open) setStoreDialogUser(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Märkte für {storeDialogUser?.display_name || storeDialogUser?.personalnummer}</DialogTitle>
              <DialogDescription>
                Märkte zuweisen oder entfernen. Änderungen werden sofort gespeichert.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[320px] overflow-y-auto space-y-3 py-2">
              {companyFilteredStores.map(store => {
                const assigned = userAssignedStoreIds.has(store.id)
                const isPending = addUserToStore.isPending || removeUserFromStore.isPending
                return (
                  <label key={store.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={assigned}
                      disabled={isPending}
                      onCheckedChange={async (checked) => {
                        if (!storeDialogUser) return
                        if (checked) {
                          await addUserToStore.mutateAsync({ userId: storeDialogUser.id, storeId: store.id })
                        } else {
                          await removeUserFromStore.mutateAsync({ userId: storeDialogUser.id, storeId: store.id })
                        }
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.subdomain}</p>
                    </div>
                    {!store.is_active && (
                      <Badge variant="secondary" className="text-xs">Pausiert</Badge>
                    )}
                  </label>
                )
              })}
              {companyFilteredStores.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {targetCompanyIds.size === 0
                    ? 'Kein Markt verfügbar. Bitte wende dich an den Administrator.'
                    : 'Keine weiteren Märkte in dieser Firma vorhanden.'}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStoreDialogUser(null)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bereichs-Sichtbarkeit Dialog */}
        <Dialog open={!!visibilityDialogUser} onOpenChange={(open) => { if (!open) setVisibilityDialogUser(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bereiche für {visibilityDialogUser?.display_name || visibilityDialogUser?.personalnummer}</DialogTitle>
              <DialogDescription>
                Welche Listen soll dieser Benutzer sehen? Änderungen werden sofort gespeichert.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Obst und Gemüse</p>
                    <p className="text-xs text-muted-foreground">PLU-Liste Obst/Gemüse anzeigen</p>
                  </div>
                  <Switch
                    checked={storeObstEnabled ? userObstVisible : false}
                    disabled={updateUserVisibility.isPending || !defaultStoreId || !storeObstEnabled}
                    onCheckedChange={async (checked) => {
                      if (!visibilityDialogUser || !defaultStoreId || !storeObstEnabled) return
                      await updateUserVisibility.mutateAsync({
                        userId: visibilityDialogUser.id,
                        storeId: defaultStoreId,
                        listType: 'obst_gemuese',
                        isVisible: checked,
                      })
                    }}
                  />
                </div>
                {defaultStoreId && !storeObstEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Am Markt deaktiviert – die Listen-Sichtbarkeit kann der Super-Admin unter Firmen &amp; Märkte ändern.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Backshop</p>
                    <p className="text-xs text-muted-foreground">Backshop-Liste anzeigen</p>
                  </div>
                  <Switch
                    checked={storeBackshopEnabled ? userBackshopVisible : false}
                    disabled={updateUserVisibility.isPending || !defaultStoreId || !storeBackshopEnabled}
                    onCheckedChange={async (checked) => {
                      if (!visibilityDialogUser || !defaultStoreId || !storeBackshopEnabled) return
                      await updateUserVisibility.mutateAsync({
                        userId: visibilityDialogUser.id,
                        storeId: defaultStoreId,
                        listType: 'backshop',
                        isVisible: checked,
                      })
                    }}
                  />
                </div>
                {defaultStoreId && !storeBackshopEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Am Markt deaktiviert – die Listen-Sichtbarkeit kann der Super-Admin unter Firmen &amp; Märkte ändern.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVisibilityDialogUser(null)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
