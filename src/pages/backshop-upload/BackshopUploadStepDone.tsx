// Schritt 5: Erfolg nach Veröffentlichung.

import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { BACKSHOP_UPLOAD_WIZARD_BASE, backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { formatKWLabel } from '@/lib/plu-helpers'

export function BackshopUploadStepDone() {
  const navigate = useNavigate()
  const { source, setStep, publishResult, targetKW, targetJahr, reset } = useBackshopUploadWizard()

  useEffect(() => {
    setStep(5)
  }, [setStep])

  if (!publishResult) {
    return <Navigate to={backshopUploadWizardPath(source, 'preview')} replace />
  }

  const handleNewUpload = () => {
    reset()
    navigate(`${BACKSHOP_UPLOAD_WIZARD_BASE}/${source}`)
  }

  return (
    <Card>
      <CardContent className="space-y-4 text-center py-10">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold">Backshop-Version veröffentlicht</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formatKWLabel(Number(targetKW), Number(targetJahr))}
          </p>
        </div>
        <div className="flex justify-center gap-6 text-sm">
          <div>
            <span className="font-bold text-lg">{publishResult.itemCount}</span>
            <div className="text-muted-foreground">Artikel</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Neue Artikel wurden beim Einspielen Warengruppen zugeordnet. Unter „Inhalt &amp; Regeln“ können Sie bei Bedarf
          nachjustieren.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="outline" className="w-full max-w-xs mx-auto sm:mx-0" onClick={() => navigate('/super-admin/backshop-rules')}>
            Inhalt &amp; Regeln (Warengruppen)
          </Button>
          <Button className="w-full max-w-xs mx-auto sm:mx-0" onClick={() => navigate('/super-admin/backshop-list')}>
            Zur Backshop-Liste
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleNewUpload}>
          Neuen Upload starten (gleiche Quelle)
        </Button>
      </CardContent>
    </Card>
  )
}
