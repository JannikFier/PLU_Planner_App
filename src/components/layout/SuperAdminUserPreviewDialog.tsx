import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioCard } from '@/components/ui/radio-card'
import { useCompanies } from '@/hooks/useCompanies'
import { useStoresByCompany } from '@/hooks/useStores'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { roleToDashboardPath } from '@/lib/effective-route-prefix'
import type { UserPreviewSimulatedRole } from '@/lib/user-preview-session'
import { Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'

export interface SuperAdminUserPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Super-Admin: Firma und Markt wählen, Rolle simulieren, dann Navigation in den jeweiligen Bereich.
 */
export function SuperAdminUserPreviewDialog({ open, onOpenChange }: SuperAdminUserPreviewDialogProps) {
  const navigate = useNavigate()
  const { enterUserPreview } = useUserPreview()
  const { data: companies = [], isLoading: companiesLoading } = useCompanies()

  const [companyId, setCompanyId] = useState<string>('')
  const [storeId, setStoreId] = useState<string>('')
  const [simulatedRole, setSimulatedRole] = useState<UserPreviewSimulatedRole>('user')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: stores = [], isLoading: storesLoading } = useStoresByCompany(
    companyId || undefined,
  )

  const activeStores = useMemo(() => stores.filter(s => s.is_active), [stores])

  function handleCompanyChange(id: string) {
    setCompanyId(id)
    setStoreId('')
  }

  async function handleStart() {
    if (!storeId) {
      toast.error('Bitte einen Markt auswählen.')
      return
    }
    setIsSubmitting(true)
    try {
      await enterUserPreview({ storeId, simulatedRole })
      const path = roleToDashboardPath(simulatedRole)
      handleDialogOpenChange(false)
      navigate(path)
    } catch (e) {
      console.error(e)
      toast.error('Vorschau konnte nicht gestartet werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) {
      setCompanyId('')
      setStoreId('')
      setSimulatedRole('user')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User-Vorschau
          </DialogTitle>
          <DialogDescription>
            Wähle Firma, Markt und die Rolle, die du simulieren möchtest. Es werden nur Oberfläche und
            Navigation angepasst – deine Super-Admin-Berechtigung in der Datenbank bleibt unverändert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="preview-company">Firma</Label>
            <Select
              value={companyId}
              onValueChange={handleCompanyChange}
              disabled={companiesLoading}
            >
              <SelectTrigger id="preview-company">
                <SelectValue placeholder={companiesLoading ? 'Laden…' : 'Firma wählen'} />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview-store">Markt</Label>
            <Select
              value={storeId}
              onValueChange={setStoreId}
              disabled={!companyId || storesLoading}
            >
              <SelectTrigger id="preview-store">
                <SelectValue
                  placeholder={
                    !companyId
                      ? 'Zuerst Firma wählen'
                      : storesLoading
                        ? 'Laden…'
                        : 'Markt wählen'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activeStores.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rolle simulieren</Label>
            <div className="flex flex-col gap-2">
              <RadioCard
                selected={simulatedRole === 'user'}
                onClick={() => setSimulatedRole('user')}
                title="Mitarbeiter (User)"
                description="PLU-Listen wie ein normaler Mitarbeiter"
              />
              <RadioCard
                selected={simulatedRole === 'viewer'}
                onClick={() => setSimulatedRole('viewer')}
                title="Nur Ansicht (Viewer)"
                description="Nur Listen und PDF, keine Bearbeitung"
              />
              <RadioCard
                selected={simulatedRole === 'admin'}
                onClick={() => setSimulatedRole('admin')}
                title="Abteilungsleiter (Admin)"
                description="Admin-Bereich inkl. Team-Funktionen"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={() => void handleStart()} disabled={isSubmitting || !storeId}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starten…
              </>
            ) : (
              'Vorschau starten'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
