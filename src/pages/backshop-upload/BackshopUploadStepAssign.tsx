// Schritt 3: Warengruppen zuordnen und entfernte Artikel optional behalten.

import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import { BackshopUploadGroupAssignment } from '@/components/backshop/BackshopUploadGroupAssignment'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { BackshopThumbnail } from '@/lib/backshop-wizard-thumbnail'
import { formatKWLabel } from '@/lib/plu-helpers'

export function BackshopUploadStepAssign() {
  const navigate = useNavigate()
  const {
    source,
    setStep,
    comparison,
    targetKW,
    targetJahr,
    summary,
    hasConflicts,
    newProducts,
    itemsNeedingAssignment,
    blockAssignments,
    setBlockAssignments,
    suggestedMap,
    sortedBlocks,
    canProceedAssign,
    keepRemoved,
    toggleKeepRemoved,
  } = useBackshopUploadWizard()

  useEffect(() => {
    setStep(3)
  }, [setStep])

  if (!comparison || !summary) {
    return <Navigate to={backshopUploadWizardPath(source)} replace />
  }

  return (
    <div className="space-y-6" data-tour="backshop-upload-step-groups">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-5 w-5 text-primary" />
            Warengruppen zuordnen
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatKWLabel(Number(targetKW), Number(targetJahr))} – Ordnen Sie neue und ggf. noch nicht gruppierte Artikel
            einer Warengruppe zu. Entfernte Artikel können Sie optional in der Liste behalten.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{summary.total}</strong> Gesamt
            </span>
            <span>
              <strong className="text-foreground">{summary.newProducts}</strong> neu
            </span>
            <span>
              <strong className="text-foreground">{summary.removed}</strong> entfernt
            </span>
            {hasConflicts && <span className="text-destructive font-medium">Konflikte – Einspielen blockiert</span>}
          </div>

          {itemsNeedingAssignment.length > 0 && (
            <BackshopUploadGroupAssignment
              newItems={itemsNeedingAssignment}
              blockAssignments={blockAssignments}
              suggestedMap={suggestedMap}
              blocks={sortedBlocks}
              onBulkAssign={(updates) => setBlockAssignments((prev) => ({ ...prev, ...updates }))}
              onAssignOne={(plu, blockId) => setBlockAssignments((prev) => ({ ...prev, [plu]: blockId }))}
            />
          )}

          {newProducts.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Neue Produkte – Warengruppe wählen</p>
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium w-[100px]">Bild</th>
                      <th className="px-3 py-2 text-left font-medium">Produkt</th>
                      <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[180px]">Warengruppe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newProducts.map((item) => (
                      <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                        <td className="px-3 py-2 align-middle">
                          <BackshopThumbnail src={item.image_url} size={96} />
                        </td>
                        <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                        <td className="px-3 py-2">{item.plu}</td>
                        <td className="px-3 py-2">
                          <Select
                            value={blockAssignments[item.plu] ?? '__none__'}
                            onValueChange={(value) =>
                              setBlockAssignments((prev) => ({
                                ...prev,
                                [item.plu]: value === '__none__' ? null : value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 min-w-[160px]">
                              <SelectValue placeholder="– Keine Zuordnung" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">– Keine Zuordnung</SelectItem>
                              {sortedBlocks.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {comparison.removed.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">{comparison.removed.length} entfernte Produkte – optional behalten</p>
              <p className="text-xs text-muted-foreground">
                Diese Produkte sind in der neuen Liste nicht mehr enthalten. „Behalten“ übernimmt sie in die Version.
              </p>
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-2 py-2 text-left font-medium w-14">Bild</th>
                      <th className="px-3 py-2 text-left font-medium">Produkt</th>
                      <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                      <th className="px-3 py-2 text-left font-medium w-32">Behalten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.removed.map((item) => (
                      <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                        <td className="px-2 py-2 align-middle">
                          <BackshopThumbnail src={item.image_url} />
                        </td>
                        <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                        <td className="px-3 py-2">{item.plu}</td>
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={keepRemoved.has(item.plu)}
                              onChange={(e) => toggleKeepRemoved(item.plu, e.target.checked)}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="text-xs">Behalten</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate(backshopUploadWizardPath(source, 'review'))}
              data-tour="backshop-upload-wizard-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
            </Button>
            <Button
              onClick={() => {
                setStep(4)
                navigate(backshopUploadWizardPath(source, 'preview'))
              }}
              disabled={!canProceedAssign}
              data-tour="backshop-upload-wizard-next"
            >
              Zur Vorschau
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
