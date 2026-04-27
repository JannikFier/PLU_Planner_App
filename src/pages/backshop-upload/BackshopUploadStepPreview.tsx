// Schritt 4: Vollständige Vorschau wie die Liste wirkt; optional Neu/Entfernt anpassen; Einspielen.

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
import { ArrowLeft, ArrowRight, Loader2, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { PLUTable } from '@/components/plu/PLUTable'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { BackshopThumbnail } from '@/lib/backshop-wizard-thumbnail'

export function BackshopUploadStepPreview() {
  const navigate = useNavigate()
  const {
    source,
    setStep,
    comparison,
    summary,
    hasConflicts,
    isProcessing,
    newProducts,
    blockAssignments,
    setBlockAssignments,
    sortedBlocks,
    previewDisplayItems,
    backshopSortMode,
    expandNew,
    setExpandNew,
    expandRemoved,
    setExpandRemoved,
    keepRemoved,
    toggleKeepRemoved,
    handlePublishWithBlocks,
  } = useBackshopUploadWizard()

  const runPublish = async () => {
    const ok = await handlePublishWithBlocks()
    if (ok) navigate(backshopUploadWizardPath(source, 'done'))
  }

  useEffect(() => {
    setStep(4)
  }, [setStep])

  if (!comparison || !summary) {
    return <Navigate to={backshopUploadWizardPath(source)} replace />
  }

  return (
    <div className="space-y-6" data-tour="backshop-upload-step-review">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="h-5 w-5 text-primary" />
            Vorschau – so wird die Liste
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gesamtliste mit Ihren Warengruppen. Neu und Entfernt können Sie bei Bedarf noch einmal aufklappen und
            anpassen.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border-2 border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <span>{summary.total} Gesamt</span>
              <span>{summary.unchanged} Unverändert</span>
              <button
                type="button"
                onClick={() => setExpandNew((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:underline"
              >
                {expandNew ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>{summary.newProducts} Neu</span>
              </button>
              <span>{summary.pluChanged} PLU geändert</span>
              <button
                type="button"
                onClick={() => setExpandRemoved((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:underline"
              >
                {expandRemoved ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>{summary.removed} Entfernt</span>
              </button>
            </div>
          </div>

          {expandNew && newProducts.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">{newProducts.length} neue Produkte – Warengruppen</p>
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-2 py-2 text-left font-medium w-14">Bild</th>
                      <th className="px-3 py-2 text-left font-medium">Produkt</th>
                      <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                      <th className="px-3 py-2 text-left font-medium min-w-[180px]">Warengruppe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newProducts.map((item) => (
                      <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                        <td className="px-2 py-2 align-middle">
                          <BackshopThumbnail src={item.image_url} />
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

          {expandRemoved && comparison.removed.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">{comparison.removed.length} entfernte Produkte – optional behalten</p>
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
                            <span className="text-xs">Behalten (nicht entfernen)</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewDisplayItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sortierung:{' '}
                {backshopSortMode === 'BY_BLOCK' ? 'Nach Warengruppen' : 'Alphabetisch'} (wie in der Backshop-Liste)
              </p>
              <div className="rounded-lg border border-border overflow-hidden">
                <PLUTable
                  items={previewDisplayItems}
                  displayMode="MIXED"
                  sortMode={backshopSortMode}
                  flowDirection="ROW_BY_ROW"
                  blocks={sortedBlocks}
                  listType="backshop"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate(backshopUploadWizardPath(source, 'assign'))}
              data-tour="backshop-upload-wizard-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
            </Button>
            <Button
              onClick={() => void runPublish()}
              disabled={isProcessing || hasConflicts}
              data-tour="backshop-upload-publish-button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird veröffentlicht…
                </>
              ) : (
                <>
                  Ins System einspielen <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
