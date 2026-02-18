import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
import { UserPlus, KeyRound, Loader2, Copy, Check, Users, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { formatProfileDisplayEmail, formatProfileDisplayPersonalnummer } from '@/lib/profile-helpers'

/**
 * Generiert ein zufälliges 8-stelliges Einmalpasswort.
 */
function generateOneTimePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Benutzerverwaltung – für Admin und Super-Admin.
 * - Super-Admin: Kann User + Admins anlegen
 * - Admin: Kann nur User anlegen
 * Beide können Passwörter zurücksetzen (Einmalpasswort).
 */
export function UserManagement() {
  const { isSuperAdmin, user: currentUser } = useAuth()
  const currentUserId = currentUser?.id ?? null
  const queryClient = useQueryClient()

  // User-Liste laden
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Profile[]
    },
  })

  // Gefilterte User: Super-Admin sieht alle, Admin sieht alle außer Super-Admin
  const filteredUsers = users?.filter(u => {
    if (isSuperAdmin) return true
    return u.role !== 'super_admin'
  })

  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [copied, setCopied] = useState(false)

  // Formular States für neuen User
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPersonalnummer, setNewPersonalnummer] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'viewer'>('user')

  // User erstellen
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data: { session: currentSession }, error: refreshError } =
        await supabase.auth.refreshSession()
      if (refreshError || !currentSession?.access_token) {
        throw new Error('Nicht angemeldet oder Sitzung abgelaufen. Bitte erneut einloggen.')
      }

      const oneTimePassword = generateOneTimePassword()

      // Edge Function aufrufen (erstellt User über Admin API)
      // Admin darf nur User anlegen (Rolle immer 'user'); Super-Admin wählt Rolle
      const roleToCreate = isSuperAdmin ? newRole : 'user'
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail.trim() || undefined,
          password: oneTimePassword,
          personalnummer: newPersonalnummer.trim() || undefined,
          displayName: newDisplayName,
          role: roleToCreate,
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return { oneTimePassword, user: data?.user }
    },
    onSuccess: (result) => {
      setGeneratedPassword(result.oneTimePassword)
      setShowCreateDialog(false)
      setShowPasswordDialog(true)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      toast.success('Benutzer erfolgreich angelegt!')

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
      const { data: { session: currentSession }, error: refreshError } =
        await supabase.auth.refreshSession()
      if (refreshError || !currentSession?.access_token) {
        throw new Error('Nicht angemeldet oder Sitzung abgelaufen. Bitte erneut einloggen.')
      }

      const oneTimePassword = generateOneTimePassword()

      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          userId,
          newPassword: oneTimePassword,
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return oneTimePassword
    },
    onSuccess: (password) => {
      setShowResetConfirmDialog(false)
      setGeneratedPassword(password)
      setShowPasswordDialog(true)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      toast.success('Passwort wurde zurückgesetzt!')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    },
  })

  // Benutzer löschen
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session: currentSession }, error: refreshError } =
        await supabase.auth.refreshSession()
      if (refreshError || !currentSession?.access_token) {
        throw new Error('Nicht angemeldet oder Sitzung abgelaufen. Bitte erneut einloggen.')
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      setShowDeleteConfirmDialog(false)
      setUserToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      toast.success('Benutzer wurde gelöscht.')
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

  const roleBadgeLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super-Admin'
      case 'admin': return 'Admin'
      case 'viewer': return 'Viewer'
      default: return 'User'
    }
  }

  // Rolle ändern (nur Super-Admin)
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'user' | 'admin' | 'viewer' }) => {
      const { data: { session } } = await supabase.auth.refreshSession()
      if (!session?.access_token) throw new Error('Nicht angemeldet.')
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, newRole },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] })
      toast.success('Rolle wurde geändert.')
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Benutzerverwaltung</h2>
            <p className="text-muted-foreground">
              {isSuperAdmin
                ? 'Admins und Personal anlegen, Passwörter zurücksetzen.'
                : 'Personal anlegen und Passwörter zurücksetzen.'}
            </p>
          </div>

          {/* Neuen Benutzer anlegen */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Neuer Benutzer
              </Button>
            </DialogTrigger>
            <DialogContent>
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

                {/* Nur Super-Admin kann Rolle wählen */}
                {isSuperAdmin && (
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
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => createUserMutation.mutate()}
                  disabled={!(newPersonalnummer.trim() || newEmail.trim()) || createUserMutation.isPending}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alle Benutzer ({filteredUsers?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
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
                        {isSuperAdmin && user.role !== 'super_admin' ? (
                          <Select
                            value={user.role}
                            onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, newRole: v as 'user' | 'admin' | 'viewer' })}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-[140px] h-8">
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
                      <TableCell className="text-right">
                        {/* Super-Admin kann nicht bearbeitet werden */}
                        {user.role !== 'super_admin' && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Noch keine Benutzer angelegt.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
