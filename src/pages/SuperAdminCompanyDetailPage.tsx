import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCompanies, useUpdateCompany, useDeleteCompany } from '@/hooks/useCompanies'
import { useStoresByCompany, useCreateStore } from '@/hooks/useStores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Store, Plus, Loader2, Trash2 } from 'lucide-react'
import { generateSubdomainSuggestion, validateSubdomain } from '@/lib/subdomain'
import { toast } from 'sonner'

export function SuperAdminCompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: companies, isLoading: companiesLoading } = useCompanies()
  const company = companies?.find(c => c.id === companyId)
  const { data: stores, isLoading: storesLoading } = useStoresByCompany(companyId)
  const updateCompany = useUpdateCompany()
  const deleteCompany = useDeleteCompany()
  const createStore = useCreateStore()

  const [editName, setEditName] = useState('')
  const [showEditName, setShowEditName] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showCreateStore, setShowCreateStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newSubdomain, setNewSubdomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (companiesLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-32 w-full" />
      </DashboardLayout>
    )
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Eintrag nicht gefunden.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Zurück</Button>
        </div>
      </DashboardLayout>
    )
  }

  // company ist ab hier sicher definiert – Funktionen nutzen lokale Kopie
  const companyName = company.name
  const companyIsActive = company.is_active

  function handleStoreNameChange(name: string) {
    setNewStoreName(name)
    setNewSubdomain(generateSubdomainSuggestion(name))
  }

  async function handleCreateStore() {
    if (!newStoreName.trim() || !newSubdomain.trim()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    const subError = validateSubdomain(newSubdomain)
    if (subError) { toast.error(subError); return }

    setIsSubmitting(true)
    try {
      if (!companyId) {
        toast.error('Keine Firma angegeben.')
        return
      }
      const store = await createStore.mutateAsync({
        companyId,
        name: newStoreName.trim(),
        subdomain: newSubdomain.trim(),
      })
      await queryClient.refetchQueries({ queryKey: ['stores', companyId] })
      setShowCreateStore(false)
      setNewStoreName('')
      setNewSubdomain('')
      navigate(`/super-admin/companies/${companyId}/stores/${store.id}`)
    } catch { /* toast in hook */ } finally { setIsSubmitting(false) }
  }

  async function handleToggleActive() {
    if (!companyId) return
    await updateCompany.mutateAsync({ id: companyId, isActive: !companyIsActive })
  }

  async function handleDeleteCompany() {
    if (!companyId) return
    if (deleteConfirm !== companyName) {
      toast.error('Firmenname stimmt nicht überein.')
      return
    }
    await deleteCompany.mutateAsync(companyId)
    navigate('/super-admin/companies')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{company.name}</h2>
            <p className="text-muted-foreground">Firma verwalten – Märkte, Einstellungen</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle" className="text-sm">
                {company.is_active ? 'Aktiv' : 'Pausiert'}
              </Label>
              <Switch
                id="active-toggle"
                checked={company.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>
        </div>

        {/* Firmen-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle>Firmen-Einstellungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Firmenname</p>
                <p className="text-sm text-muted-foreground">{company.name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setEditName(company.name)
                setShowEditName(true)
              }}>Ändern</Button>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-3 w-3" />
                Firma löschen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Märkte */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Märkte ({stores?.length ?? 0})
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setShowCreateStore(true)}>
              <Plus className="h-4 w-4" />
              Neuer Markt
            </Button>
          </CardHeader>
          <CardContent>
            {storesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : stores?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Noch keine Märkte angelegt.
              </p>
            ) : (
              <div className="space-y-3">
                {stores?.map(store => (
                  <div
                    key={store.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/super-admin/companies/${companyId}/stores/${store.id}`)}
                  >
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Subdomain: {store.subdomain}
                      </p>
                    </div>
                    <Badge variant={store.is_active ? 'default' : 'secondary'}>
                      {store.is_active ? 'Aktiv' : 'Pausiert'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Firmenname ändern */}
        <Dialog open={showEditName} onOpenChange={setShowEditName}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Firmenname ändern</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="edit-name">Neuer Name</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditName(false)}>Abbrechen</Button>
              <Button onClick={async () => {
                if (!companyId) return
                await updateCompany.mutateAsync({ id: companyId, name: editName.trim() })
                setShowEditName(false)
              }}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Neuen Markt anlegen */}
        <Dialog open={showCreateStore} onOpenChange={setShowCreateStore}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Markt anlegen</DialogTitle>
              <DialogDescription>Erstelle einen weiteren Markt für {company.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Marktname *</Label>
                <Input placeholder="z.B. Invedo" value={newStoreName} onChange={e => handleStoreNameChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subdomain *</Label>
                <Input placeholder="z.B. invedo" value={newSubdomain} onChange={e => setNewSubdomain(e.target.value.toLowerCase())} />
                <p className="text-xs text-muted-foreground">
                  Subdomain: {newSubdomain || '...'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateStore(false)}>Abbrechen</Button>
              <Button onClick={handleCreateStore} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird erstellt...</> : 'Markt erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Firma löschen */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Firma endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle Daten, Märkte, User-Zuordnungen und Einstellungen dieser Firma werden unwiderruflich gelöscht.
                Gib den Firmennamen ein um zu bestätigen:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              placeholder={company.name}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== company.name || deleteCompany.isPending}
                onClick={handleDeleteCompany}
              >
                {deleteCompany.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Endgültig löschen
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
