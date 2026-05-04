// Super-Admin: Werbung einer KW bearbeiten (Backshop)
// Wie Obst-Edit, zusaetzlich VK (Akt. UVP) und optional Erwerb pro Zeile.

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
  useBackshopOfferCampaignDetail,
  useUpdateBackshopOfferCampaignLines,
  useDeleteBackshopOfferCampaign,
  type SaveCampaignLineInput,
} from '@/hooks/useCentralOfferCampaigns'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import { formatKWLabel } from '@/lib/plu-helpers'
import {
  CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE,
  centralOfferAdminDeleteDialogDescription,
} from '@/lib/central-offer-admin-copy'

type EditableRow = CampaignReviewRow & {
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

export function SuperAdminBackshopCampaignEditPage() {
  const navigate = useNavigate()
  const params = useParams<{ kw: string; jahr: string }>()
  const kw = Number(params.kw)
  const jahr = Number(params.jahr)

  const { data: activeBackshop } = useActiveBackshopVersion()
  const { data: backshopMasters = [] } = useBackshopPLUData(activeBackshop?.id, {
    enabled: !!activeBackshop?.id,
  })
  const candidates: MasterPluCandidate[] = useMemo(
    () =>
      backshopMasters.map((r) => ({
        plu: r.plu,
        label: r.system_name || r.plu,
        source: r.source,
      })),
    [backshopMasters],
  )

  const { data: detail, isLoading } = useBackshopOfferCampaignDetail(
    Number.isFinite(kw) ? kw : null,
    Number.isFinite(jahr) ? jahr : null,
  )
  const updateMutation = useUpdateBackshopOfferCampaignLines()
  const deleteMutation = useDeleteBackshopOfferCampaign()

  const [rows, setRows] = useState<EditableRow[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [purchasePrices, setPurchasePrices] = useState<Record<string, number | null>>({})

  /* Server-Snapshot (Kampagnen-Detail) in lokalen Editor-Status; Refetch/Navigation */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!detail) {
      setRows([])
      setPrices({})
      setPurchasePrices({})
      return
    }
    const nextRows: EditableRow[] = detail.lines.map((l) => ({
      id: l.id,
      rowIndex: null,
      sourcePlu: l.source_plu,
      sourceArtikel: l.source_artikel,
      sourceArtNr: l.source_art_nr,
      selectedPlu: l.plu,
      origin: l.origin,
      createdManually: l.origin === 'manual',
    }))
    const nextPrices: Record<string, number> = {}
    const nextPurchase: Record<string, number | null> = {}
    for (const l of detail.lines) {
      nextPrices[l.id] = l.promo_price
      nextPurchase[l.id] = l.purchase_price ?? null
    }
    setRows(nextRows)
    setPrices(nextPrices)
    setPurchasePrices(nextPurchase)
  }, [detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!Number.isFinite(kw) || !Number.isFinite(jahr)) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Ungültiger Link.</p>
        </div>
      </DashboardLayout>
    )
  }

  const title = `Werbung ${formatKWLabel(kw, jahr)} (Backshop)`

  const onChangePlu = (
    rowId: string,
    plu: string | null,
    extra?: CampaignPluComboboxChangeExtra,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const trimmed = plu?.trim() ?? ''
        if (trimmed) {
          const display =
            extra?.selectedCandidate && extra.selectedCandidate.plu === trimmed
              ? { label: extra.selectedCandidate.label, source: extra.selectedCandidate.source }
              : (() => {
                  const m = candidates.find((c) => c.plu === trimmed)
                  return m ? { label: m.label, source: m.source } : { label: trimmed }
                })()
          return {
            ...r,
            selectedPlu: trimmed,
            selectedMasterDisplay: display,
            origin: r.createdManually ? 'manual' : 'excel',
          }
        }
        if (extra?.pendingNewProduct) {
          return { ...r, selectedPlu: null, selectedMasterDisplay: null, origin: 'pending_custom' }
        }
        return { ...r, selectedPlu: null, selectedMasterDisplay: null, origin: 'unassigned' }
      }),
    )
  }

  const onChangePrice = (rowId: string, price: number) => {
    setPrices((prev) => ({ ...prev, [rowId]: price }))
  }

  const onChangePurchasePrice = (rowId: string, price: number | null) => {
    setPurchasePrices((prev) => ({ ...prev, [rowId]: price }))
  }

  const onAddRow = () => {
    const nr = newManualRow()
    setRows((prev) => [...prev, nr])
    setPrices((prev) => ({ ...prev, [nr.id]: 0 }))
    setPurchasePrices((prev) => ({ ...prev, [nr.id]: null }))
  }

  const onRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => !(r.id === rowId && r.createdManually)))
    setPrices((prev) => {
      const n = { ...prev }
      delete n[rowId]
      return n
    })
    setPurchasePrices((prev) => {
      const n = { ...prev }
      delete n[rowId]
      return n
    })
  }

  const handleSave = () => {
    const seenPlu = new Set<string>()
    const lines: SaveCampaignLineInput[] = []
    for (const r of rows) {
      const price = prices[r.id] ?? 0
      if (r.selectedPlu) {
        if (seenPlu.has(r.selectedPlu)) {
          toast.error(`PLU ${r.selectedPlu} ist doppelt – bitte eindeutig zuordnen.`)
          return
        }
        if (price <= 0 || !Number.isFinite(price)) {
          toast.error(`Bitte für PLU ${r.selectedPlu} einen gültigen Preis eingeben.`)
          return
        }
        seenPlu.add(r.selectedPlu)
        const orig = detail?.lines.find((l) => l.id === r.id)
        lines.push({
          plu: r.selectedPlu,
          promo_price: price,
          purchase_price: purchasePrices[r.id] ?? null,
          list_ek: orig?.list_ek ?? null,
          list_vk: orig?.list_vk ?? null,
          source_art_nr: orig?.source_art_nr ?? null,
          source_plu: r.sourcePlu,
          source_artikel: r.sourceArtikel,
          origin: r.createdManually ? 'manual' : 'excel',
        })
      } else {
        if (price <= 0 || !Number.isFinite(price)) {
          toast.error(
            r.origin === 'pending_custom'
              ? 'Bitte für jede Zeile „Neues Produkt“ einen gültigen Aktions-VK eingeben.'
              : 'Bitte für Zeilen ohne Master-PLU einen gültigen Preis eingeben (Archiv).',
          )
          return
        }
        const orig = detail?.lines.find((l) => l.id === r.id)
        lines.push({
          plu: null,
          promo_price: price,
          purchase_price: purchasePrices[r.id] ?? null,
          list_ek: orig?.list_ek ?? null,
          list_vk: orig?.list_vk ?? null,
          source_art_nr: orig?.source_art_nr ?? null,
          source_plu: r.sourcePlu,
          source_artikel: r.sourceArtikel,
          origin: r.origin === 'pending_custom' ? 'pending_custom' : 'unassigned',
        })
      }
    }
    updateMutation.mutate(
      {
        kwNummer: kw,
        jahr,
        fileName: detail?.source_file_name ?? null,
        lines,
      },
      {
        onSuccess: () => {
          navigate('/super-admin/backshop-versions')
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
            Links steht, was aus der Exit-Excel ausgelesen wurde. Rechts kannst du die Master-PLU
            wählen, „Keine Zuordnung“ (Archiv, nicht in der Markt-/Werbungsliste), „Neues Produkt“
            (Markt legt später eine PLU über die KW-Werbung an) oder eigene Zeilen hinzufügen.
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
                Für diese KW gibt es noch keine Werbung. Du kannst unten Zeilen hinzufügen und so
                manuell anlegen.
              </p>
            ) : null}

            <CampaignReviewTable
              rows={rows}
              candidates={candidates}
              onChangePlu={onChangePlu}
              pricesById={prices}
              onChangePrice={onChangePrice}
              purchasePricesById={purchasePrices}
              onChangePurchasePrice={onChangePurchasePrice}
              showSourceArtNrColumn
              showNeuesProduktOption
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
                onClick={() => navigate('/super-admin/backshop-versions')}
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
                  try {
                    await deleteMutation.mutateAsync({ kwNummer: kw, jahr })
                    setDeleteDialogOpen(false)
                    navigate('/super-admin/backshop-versions')
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

export default SuperAdminBackshopCampaignEditPage
