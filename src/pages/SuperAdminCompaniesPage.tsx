import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCompanies, useCreateCompany } from '@/hooks/useCompanies'
import { useCreateStore } from '@/hooks/useStores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { generateSubdomainSuggestion, validateSubdomain } from '@/lib/subdomain'
import { toast } from 'sonner'

export function SuperAdminCompaniesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: companies, isLoading } = useCompanies()
  const createCompany = useCreateCompany()
  const createStore = useCreateStore()

  const [showCreate, setShowCreate] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleStoreNameChange(name: string) {
    setStoreName(name)
    setSubdomain(generateSubdomainSuggestion(name))
  }

  async function handleCreate() {
    if (!companyName.trim() || !storeName.trim() || !subdomain.trim()) {
      toast.error('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    const subError = validateSubdomain(subdomain)
    if (subError) {
      toast.error(subError)
      return
    }

    setIsSubmitting(true)
    try {
      const company = await createCompany.mutateAsync({ name: companyName.trim() })
      await createStore.mutateAsync({
        companyId: company.id,
        name: storeName.trim(),
        subdomain: subdomain.trim(),
      })

      await queryClient.refetchQueries({ queryKey: ['companies'] })
      setShowCreate(false)
      setCompanyName('')
      setStoreName('')
      setSubdomain('')
      navigate(`/super-admin/companies/${company.id}`)
    } catch {
      // Fehler werden in den Mutations-Hooks getoastet
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Firmen & Märkte</h2>
            <p className="text-muted-foreground">
              Alle Firmen und ihre Märkte verwalten.
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Neue Firma
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : companies?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Noch keine Firma angelegt</p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstelle eine Firma mit einem ersten Markt.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {companies?.map(company => (
              <Card
                key={company.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/super-admin/companies/${company.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    {company.name}
                  </CardTitle>
                  <Badge variant={company.is_active ? 'default' : 'secondary'}>
                    {company.is_active ? 'Aktiv' : 'Pausiert'}
                  </Badge>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Firma anlegen</DialogTitle>
              <DialogDescription>
                Erstelle eine Firma mit einem ersten Markt. Der Markt bekommt eine eigene Subdomain.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Firmenname *</Label>
                <Input
                  id="company-name"
                  placeholder="z.B. Friedrich-Tonscheit-KG"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-name">Erster Marktname *</Label>
                <Input
                  id="store-name"
                  placeholder="z.B. Angerbogen"
                  value={storeName}
                  onChange={e => handleStoreNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain *</Label>
                <Input
                  id="subdomain"
                  placeholder="z.B. angerbogen"
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value.toLowerCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Erreichbar unter: {subdomain || '...'}.domain.de
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird erstellt...</>
                ) : 'Firma erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
