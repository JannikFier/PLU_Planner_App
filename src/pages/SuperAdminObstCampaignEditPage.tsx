// Super-Admin: Werbung einer KW bearbeiten (Obst/Gemuese)
// Linke Seite: Excel-Herkunft; rechts: Master-PLU-Zuordnung; Zeilen hinzufuegen/entfernen.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  CampaignReviewTable,
  type CampaignReviewRow,
  type CampaignPluComboboxChangeExtra,
} from '@/components/plu/CampaignReviewTable'
import {
  useObstOfferCampaignDetail,
  useUpdateObstOfferCampaignLines,
  useDeleteObstOfferCampaign,
  type SaveCampaignLineInput,
} from '@/hooks/useCentralOfferCampaigns'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import { formatKWLabel } from '@/lib/plu-helpers'
import {
  CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE,
  centralOfferAdminDeleteDialogDescription,
} from '@/lib/central-offer-admin-copy'

/** Zentrale Obst-Werbung: Preis wird nicht aus Excel uebernommen (nur Markierung). */
const MARK_ONLY_PROMO_PRICE = 0

type DbKind = 'ordersatz_week' | 'ordersatz_3day'

function kindFromUrl(u: string | undefined): { db: DbKind; label: string } | null {
  if (u === 'wochenwerbung') return { db: 'ordersatz_week', label: 'Wochenwerbung' }
  if (u === 'dreitagespreis') return { db: 'ordersatz_3day', label: '3-Tagespreis' }
  return null
}

type EditableRow = CampaignReviewRow & {
  /** Persist als 'manual' zurueckschreiben, auch wenn ohne Zuordnung bei Save. */
  createdManually: boolean
}

function newManualRow(): EditableRow {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rowIndex: null,
    sourcePlu: null,
    sourceArtikel: null,
    selectedPlu: null,
    origin: 'manual',
    createdManually: true,
  }
}

export function SuperAdminObstCampaignEditPage() {
  const navigate = useNavigate()
  const params = useParams<{ kw: string; jahr: string; kind: string }>()
  const kw = Number(params.kw)
  const jahr = Number(params.jahr)
  const kindInfo = kindFromUrl(params.kind)

  const { data: activeObst } = useActiveVersion()
  const { data: obstMasters = [] } = usePLUData(activeObst?.id, { enabled: !!activeObst?.id })
  const candidates: MasterPluCandidate[] = useMemo(
    () =>
      obstMasters.map((r) => ({
        plu: r.plu,
        label: r.system_name || r.plu,
      })),
    [obstMasters],
  )

  const { data: detail, isLoading } = useObstOfferCampaignDetail(
    Number.isFinite(kw) ? kw : null,
    Number.isFinite(jahr) ? jahr : null,
    kindInfo?.db ?? null,
  )
  const updateMutation = useUpdateObstOfferCampaignLines()
  const deleteMutation = useDeleteObstOfferCampaign()

  const [rows, setRows] = useState<EditableRow[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  /* Server-Snapshot (Kampagnen-Detail) in lokalen Editor-Status; Refetch/Navigation */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!detail) {
      setRows([])
      return
    }
    setRows(
      detail.lines.map((l) => ({
        id: l.id,
        rowIndex: null,
        sourcePlu: l.source_plu,
        sourceArtikel: l.source_artikel,
        selectedPlu: l.plu,
        origin: l.origin,
        createdManually: l.origin === 'manual',
      })),
    )
  }, [detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!kindInfo || !Number.isFinite(kw) || !Number.isFinite(jahr)) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Ungültiger Link.</p>
      </DashboardLayout>
    )
  }

  const title = `${kindInfo.label} ${formatKWLabel(kw, jahr)}`

  const onChangePlu = (rowId: string, plu: string | null, extra?: CampaignPluComboboxChangeExtra) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const trimmed = plu?.trim() ?? ''
        if (!trimmed) {
          return { ...r, selectedPlu: null, selectedMasterDisplay: null, origin: 'unassigned' }
        }
        const display =
          extra?.selectedCandidate && extra.selectedCandidate.plu === trimmed
            ? { label: extra.selectedCandidate.label, source: extra.selectedCandidate.source }
            : (() => {
                const m = candidates.find((c) => c.plu === trimmed)
                return m ? { label: m.label, source: m.source } : { label: trimmed }
              })()
        const origin = r.createdManually ? 'manual' : 'excel'
        return { ...r, selectedPlu: trimmed, selectedMasterDisplay: display, origin }
      }),
    )
  }

  const onAddRow = () => {
    setRows((prev) => [...prev, newManualRow()])
  }

  const onRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => !(r.id === rowId && r.createdManually)))
  }

  const handleSave = () => {
    if (!kindInfo) return
    const seenPlu = new Set<string>()
    const lines: SaveCampaignLineInput[] = []
    for (const r of rows) {
      if (r.selectedPlu) {
        if (seenPlu.has(r.selectedPlu)) {
          toast.error(`PLU ${r.selectedPlu} ist doppelt – bitte eindeutig zuordnen.`)
          return
        }
        seenPlu.add(r.selectedPlu)
        lines.push({
          plu: r.selectedPlu,
          promo_price: MARK_ONLY_PROMO_PRICE,
          source_plu: r.sourcePlu,
          source_artikel: r.sourceArtikel,
          origin: r.createdManually ? 'manual' : 'excel',
        })
      } else {
        lines.push({
          plu: null,
          promo_price: MARK_ONLY_PROMO_PRICE,
          source_plu: r.sourcePlu,
          source_artikel: r.sourceArtikel,
          origin: 'unassigned',
        })
      }
    }
    updateMutation.mutate(
      {
        kwNummer: kw,
        jahr,
        campaignKind: kindInfo.db,
        fileName: detail?.source_file_name ?? null,
        lines,
      },
      {
        onSuccess: () => {
          navigate('/super-admin/versions')
        },
      },
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Links steht, was aus der Excel ausgelesen wurde. Rechts kannst du die Master-PLU
            ändern, „Keine Zuordnung" setzen oder eigene Zeilen hinzufügen. „Keine Zuordnung"-
            Zeilen bleiben im Archiv, erscheinen aber nicht in der Marktliste.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artikel in dieser Werbung</CardTitle>
            <CardDescription>
              {detail?.source_file_name
                ? `Original-Datei: ${detail.source_file_name}`
                : 'Keine Original-Datei hinterlegt.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden…
              </div>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">
                Für diese KW gibt es noch keine {kindInfo.label.toLowerCase()}. Du kannst unten Zeilen
                hinzufügen und so manuell anlegen.
              </p>
            ) : null}

            <CampaignReviewTable
              rows={rows}
              candidates={candidates}
              onChangePlu={onChangePlu}
              onAddRow={onAddRow}
              onRemoveRow={onRemoveRow}
              disabled={updateMutation.isPending || deleteMutation.isPending}
              emptyMessage={'Keine Zeilen – füge welche über „Zeile hinzufügen" hinzu.'}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending || deleteMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Speichern
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/super-admin/versions')}
                disabled={updateMutation.isPending || deleteMutation.isPending}
              >
                Abbrechen
              </Button>
              {detail ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto sm:ml-0"
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Diese Werbung löschen
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE}</AlertDialogTitle>
              <AlertDialogDescription>
                {centralOfferAdminDeleteDialogDescription(title)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Abbrechen</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={async () => {
                  if (!kindInfo) return
                  try {
                    await deleteMutation.mutateAsync({
                      kwNummer: kw,
                      jahr,
                      campaignKind: kindInfo.db,
                    })
                    setDeleteDialogOpen(false)
                    navigate('/super-admin/versions')
                  } catch {
                    /* Fehler-Toast in der Mutation */
                  }
                }}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                    Löschen…
                  </>
                ) : (
                  'Löschen'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

export default SuperAdminObstCampaignEditPage
