// OfferProductsPage – Produkte in der Werbung (Obst/Gemüse)
// Liste, Aus Werbung entfernen, Produkte zur Werbung hinzufügen, Per Excel (Super-Admin)

import { useMemo, useState, useRef, useCallback } from 'react'
import { buildDisplayList } from '@/lib/layout-engine'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, FileSpreadsheet } from 'lucide-react'
import { useOfferItems, useAddOfferItem, useRemoveOfferItem, useAddOfferItemsBatch, useUpdateOfferItem } from '@/hooks/useOfferItems'
import {
  useObstOfferCampaignForKwYear,
  useObstOfferStoreDisabled,
  useToggleObstOfferDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBlocks } from '@/hooks/useBlocks'
import { useRenamedItems } from '@/hooks/useRenamedItems'
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { useObstOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useHiddenItems } from '@/hooks/useHiddenItems'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import { EXCEL_READ_ERROR_FALLBACK, formatError } from '@/lib/error-messages'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { getActiveOfferPLUs } from '@/lib/offer-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { parseOfferItemsExcel } from '@/lib/excel-parser'
import { AddToOfferDialog } from '@/components/plu/AddToOfferDialog'
import { CentralOfferLocalPriceDialog } from '@/components/plu/CentralOfferLocalPriceDialog'
import {
  CentralOfferCampaignSection,
  LocalOwnOfferSection,
  type CentralOfferCampaignRow,
  type LocalOwnOfferRow,
} from '@/components/plu/OfferAdvertisingResponsiveSections'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { OfferItem } from '@/types/database'
import type { OfferItemsParseResult } from '@/types/plu'

interface OfferProductInfo {
  item: OfferItem
  name: string
  isActive: boolean
}

export function OfferProductsPage() {
  const location = useLocation()
  const { isViewer } = useAuth()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [localPriceTarget, setLocalPriceTarget] = useState<{
    plu: string
    name: string
    centralPrice: number
    initialLocalPrice: number | null
    kw: number
    jahr: number
  } | null>(null)
  // Per Excel nur in Super-Admin-URL; in User-/Admin-Ansicht nur manuell hinzufügen
  const showExcelUpload = location.pathname.startsWith('/super-admin/')
  const [excelResult, setExcelResult] = useState<OfferItemsParseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: offerItems = [], isLoading: offerLoading } = useOfferItems()
  const { data: activeVersion } = useActiveVersion()
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    activeVersion?.kw_nummer,
    activeVersion?.jahr,
    !!activeVersion,
  )
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const toggleCentralObst = useToggleObstOfferDisabled()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: renamedItems = [] } = useRenamedItems()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const { overrideMap: obstLocalOverrides } = useObstOfferLocalPriceOverrides(obstCampaign ?? undefined)
  const addOffer = useAddOfferItem()
  const removeOffer = useRemoveOfferItem()
  const addBatch = useAddOfferItemsBatch()
  const updateOffer = useUpdateOfferItem()

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const listKw = activeVersion?.kw_nummer ?? calendarKw
  const listJahr = activeVersion?.jahr ?? calendarJahr
  const activeOfferPLUs = useMemo(
    () => getActiveOfferPLUs(offerItems, listKw, listJahr),
    [offerItems, listKw, listJahr],
  )

  const rawHiddenPluSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, obstCampaign),
    [rawHiddenPluSet, obstCampaign],
  )

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        listKw,
        listJahr,
        obstCampaign ?? null,
        obstStoreDisabled,
        offerItems,
        obstLocalOverrides,
      ),
    [listKw, listJahr, obstCampaign, obstStoreDisabled, offerItems, obstLocalOverrides],
  )

  const searchableItems = useMemo(() => {
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({
        keyword: r.keyword,
        position: r.position,
        case_sensitive: r.case_sensitive,
      }))
    const version = activeVersion
    const now = new Date()
    const { items } = buildDisplayList({
      masterItems,
      customProducts,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      renamedItems: renamedItems.map((r) => ({
        plu: r.plu,
        display_name: r.display_name,
        is_manually_renamed: r.is_manually_renamed,
      })),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode: layoutSettings?.sort_mode ?? 'ALPHABETICAL',
      displayMode: layoutSettings?.display_mode ?? 'MIXED',
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: version?.kw_nummer ?? 0,
      versionJahr: version?.jahr ?? now.getFullYear(),
      currentKwNummer: listKw,
      currentJahr: listJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
    })
    const customByPlu = new Map(customProducts.map((c) => [c.plu, c]))
    return items.map((i) => {
      const cp = customByPlu.get(i.plu)
      const collisionOwnProduct = cp != null && !i.is_custom
      return {
        id: i.id,
        plu: i.plu,
        display_name: i.display_name ?? i.system_name ?? '',
        system_name: i.system_name,
        block_id: i.block_id,
        ...(collisionOwnProduct
          ? { searchHaystack: cp.name, ownProductLabel: cp.name }
          : {}),
        ...(collisionOwnProduct || i.is_custom ? { searchFuzzyName: true as const } : {}),
      }
    })
  }, [
    masterItems,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    activeVersion,
    listKw,
    listJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
  ])

  const listOrderPlu = useMemo(() => searchableItems.map((i) => i.plu), [searchableItems])

  const centralPluSet = useMemo(
    () => new Set((obstCampaign?.lines ?? []).map((l) => l.plu)),
    [obstCampaign],
  )

  const offerProductInfos: OfferProductInfo[] = useMemo(() => {
    return offerItems.map((item) => {
      const masterItem = masterItems.find((m) => m.plu === item.plu)
      const name = masterItem
        ? (masterItem.display_name ?? masterItem.system_name)
        : customProducts.find((c) => c.plu === item.plu)?.name ?? `PLU ${getDisplayPlu(item.plu)}`
      const isActive = activeOfferPLUs.has(item.plu)
      return { item, name, isActive }
    })
  }, [offerItems, masterItems, customProducts, activeOfferPLUs])

  const sortedCampaignLines = useMemo(
    () => orderByPluDisplayOrder([...(obstCampaign?.lines ?? [])], (l) => l.plu, listOrderPlu),
    [obstCampaign?.lines, listOrderPlu],
  )

  const sortedOfferProductInfos = useMemo(
    () => orderByPluDisplayOrder(offerProductInfos, (x) => x.item.plu, listOrderPlu),
    [offerProductInfos, listOrderPlu],
  )

  const centralCampaignRows: CentralOfferCampaignRow[] = useMemo(
    () =>
      sortedCampaignLines.map((line) => {
        const masterItem = masterItems.find((m) => m.plu === line.plu)
        const name =
          masterItem?.display_name ?? masterItem?.system_name
          ?? customProducts.find((c) => c.plu === line.plu)?.name
          ?? `PLU ${getDisplayPlu(line.plu)}`
        const hiddenForStore = obstStoreDisabled.has(line.plu)
        const central = Number(line.promo_price)
        const localOverride = obstLocalOverrides.get(line.plu) ?? null
        const effective = localOverride ?? central
        return {
          plu: line.plu,
          name,
          hiddenForStore,
          central,
          effective,
          localOverride,
        }
      }),
    [sortedCampaignLines, masterItems, customProducts, obstStoreDisabled, obstLocalOverrides],
  )

  const localOfferRows: LocalOwnOfferRow[] = useMemo(
    () =>
      sortedOfferProductInfos.map(({ item, name, isActive }) => ({
        id: item.id,
        plu: item.plu,
        name,
        promoPrice: item.promo_price != null ? Number(item.promo_price) : null,
        durationWeeks: item.duration_weeks,
        isActive,
      })),
    [sortedOfferProductInfos],
  )

  const handleAddFromDialog = useCallback(
    (plu: string, durationWeeks: number, promoPrice: number | null) => {
      addOffer.mutate(
        { plu, durationWeeks, promoPrice },
        {
          onSuccess: () => {
            // Dialog bleibt offen, User kann weiter hinzufügen
          },
        },
      )
    },
    [addOffer],
  )

  const handleExcelSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await parseOfferItemsExcel(file)
      if (result.rows.length === 0) {
        toast.error('Keine gültigen Zeilen in der Excel-Datei (PLU, optional Name, Wochen 1–4).')
        return
      }
      setExcelResult(result)
    } catch (err) {
      toast.error(formatError(err, EXCEL_READ_ERROR_FALLBACK))
    }
  }, [])

  const handleExcelConfirm = useCallback(async () => {
    if (!excelResult || excelResult.rows.length === 0) return
    try {
      await addBatch.mutateAsync(
        excelResult.rows.map((r) => ({ plu: r.plu, durationWeeks: r.weeks })),
      )
      setExcelResult(null)
    } catch {
      // Toast im Hook
    }
  }, [excelResult, addBatch])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          data-tour="obst-offer-toolbar"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Produkte in der Werbung</h2>
              <p className="text-sm text-muted-foreground">
                Angebote verwalten: hinzufügen, Laufzeit anzeigen, aus Werbung entfernen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showExcelUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExcelSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-tour="obst-offer-excel-button"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Per Excel hinzufügen
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              data-tour="obst-offer-add-button"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Produkte zur Werbung hinzufügen
            </Button>
          </div>
        </div>

        {excelResult && (
          <Card data-tour="obst-offer-excel-preview-card">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Werbung aus Excel – Vorschau</h3>
              <p className="text-sm text-muted-foreground">
                {excelResult.rows.length} Zeile(n) werden zur Werbung hinzugefügt (Start: aktuelle KW).
              </p>
              <div className="overflow-auto max-h-[240px] border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium">PLU</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Wochen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelResult.rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-mono">{getDisplayPlu(r.plu)}</td>
                        <td className="px-3 py-2">{r.name ?? '–'}</td>
                        <td className="px-3 py-2">{r.weeks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExcelResult(null)}
                  data-tour="obst-offer-excel-cancel"
                >
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExcelConfirm()}
                  disabled={addBatch.isPending}
                  data-tour="obst-offer-excel-confirm"
                >
                  Zur Werbung hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {offerLoading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!offerLoading && (obstCampaign?.lines.length ?? 0) === 0 && offerItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine Produkte in der Werbung</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Klicke auf „Produkte zur Werbung hinzufügen“, um Produkte als Angebot zu markieren. Sie erscheinen dann in der PLU-Liste und im PDF mit dem Hinweis „Angebot“.
              </p>
            </CardContent>
          </Card>
        )}

        {!offerLoading && (obstCampaign?.lines.length ?? 0) > 0 && (
          <Card data-tour="obst-offer-section-zentral">
            <CardContent className="p-0">
              <CentralOfferCampaignSection
                title="Zentrale Werbung"
                description="Megafon: Angebot für diesen Markt ein/aus (aus = nicht in Liste/PDF)."
                dataTestId="offer-central-campaign-scroll-root"
                domain="obst"
                currentKw={listKw}
                currentJahr={listJahr}
                rows={centralCampaignRows}
                isViewer={isViewer}
                togglePending={toggleCentralObst.isPending}
                onToggleMegaphone={(plu, hiddenForStore) =>
                  toggleCentralObst.mutate({ plu, disabled: !hiddenForStore })
                }
                onOpenLocalPrice={(row) => {
                  const camp = obstCampaign!
                  setLocalPriceTarget({
                    plu: row.plu,
                    name: row.name,
                    centralPrice: row.central,
                    initialLocalPrice: row.localOverride,
                    kw: camp.kw_nummer,
                    jahr: camp.jahr,
                  })
                }}
                firstItemDataTour="obst-offer-zentral-first-item"
              />
            </CardContent>
          </Card>
        )}

        {!offerLoading && offerProductInfos.length > 0 && (
          <Card data-tour="obst-offer-section-eigen">
            <CardContent className="p-0">
              <LocalOwnOfferSection
                title="Eigene Werbung"
                dataTestId="offer-local-advertising-scroll-root"
                rows={localOfferRows}
                updatePending={updateOffer.isPending}
                removePending={removeOffer.isPending}
                onDurationChange={(plu, durationWeeks) =>
                  updateOffer.mutate({ plu, durationWeeks })
                }
                onRemove={(plu) => removeOffer.mutate(plu)}
                firstItemDataTour="obst-offer-eigen-first-item"
              />
            </CardContent>
          </Card>
        )}

        <AddToOfferDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          searchableItems={searchableItems}
          onAdd={handleAddFromDialog}
          isAdding={addOffer.isPending}
          blockedPlus={centralPluSet}
          dataTour="obst-offer-add-dialog"
          submitDataTour="obst-offer-add-dialog-submit"
        />

        {localPriceTarget && (
          <CentralOfferLocalPriceDialog
            open
            onOpenChange={(o) => !o && setLocalPriceTarget(null)}
            domain="obst"
            plu={localPriceTarget.plu}
            productName={localPriceTarget.name}
            centralPrice={localPriceTarget.centralPrice}
            initialLocalPrice={localPriceTarget.initialLocalPrice}
            kw_nummer={localPriceTarget.kw}
            jahr={localPriceTarget.jahr}
            dataTour="obst-offer-central-local-price-dialog"
            submitDataTour="obst-offer-central-local-price-dialog-submit"
          />
        )}
      </div>
    </DashboardLayout>
  )
}
