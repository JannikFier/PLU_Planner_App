// BackshopOfferProductsPage – Produkte in der Werbung (Backshop)
// Liste, Aus Werbung entfernen, Produkte zur Werbung hinzufügen, Per Excel (Super-Admin)

import { useMemo, useState, useRef, useCallback } from 'react'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, FileSpreadsheet } from 'lucide-react'
import {
  useBackshopOfferItems,
  useBackshopAddOfferItem,
  useBackshopRemoveOfferItem,
  useBackshopAddOfferItemsBatch,
  useBackshopUpdateOfferItem,
} from '@/hooks/useBackshopOfferItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import {
  useBackshopHiddenItems,
  useBackshopHideProduct,
  useBackshopUnhideProduct,
} from '@/hooks/useBackshopHiddenItems'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import {
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import { useAuth } from '@/hooks/useAuth'
import { EXCEL_READ_ERROR_FALLBACK, formatError } from '@/lib/error-messages'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { getActiveOfferPLUs } from '@/lib/offer-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import {
  useBackshopOfferCampaignWithLines,
  useBackshopOfferStoreDisabled,
  useToggleBackshopOfferDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { parseOfferItemsExcel } from '@/lib/excel-parser'
import { AddToOfferDialog } from '@/components/plu/AddToOfferDialog'
import { CentralOfferLocalPriceDialog } from '@/components/plu/CentralOfferLocalPriceDialog'
import {
  CentralOfferCampaignSection,
  LocalOwnOfferSection,
  type CentralOfferCampaignRow,
  type LocalOwnOfferRow,
} from '@/components/plu/OfferAdvertisingResponsiveSections'
import {
  CentralOfferMegaphoneDialog,
  type CentralOfferMegaphoneAction,
  type CentralOfferMegaphonePhase,
} from '@/components/plu/CentralOfferMegaphoneDialog'
import { toast } from 'sonner'
import type { BackshopOfferItem, BackshopSource } from '@/types/database'
import type { OfferItemsParseResult } from '@/types/plu'

interface OfferProductInfo {
  item: BackshopOfferItem
  name: string
  isActive: boolean
}

export function BackshopOfferProductsPage() {
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
  const [megaphoneDialogPlu, setMegaphoneDialogPlu] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: offerItems = [], isLoading: offerLoading } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const toggleCentralBackshop = useToggleBackshopOfferDisabled()
  const hideBackshopProduct = useBackshopHideProduct()
  const unhideBackshopProduct = useBackshopUnhideProduct()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { lineForceShowKeys, lineForceHideKeys } = useBackshopLineVisibilityOverrides()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const addOffer = useBackshopAddOfferItem()
  const removeOffer = useBackshopRemoveOfferItem()
  const addBatch = useBackshopAddOfferItemsBatch()
  const updateOffer = useBackshopUpdateOfferItem()

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
  const activeOfferPLUs = useMemo(
    () => getActiveOfferPLUs(offerItems, currentKw, currentJahr),
    [offerItems, currentKw, currentJahr],
  )

  const rawHiddenPluSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign, backshopStoreDisabled),
    [rawHiddenPluSet, backshopCampaign, backshopStoreDisabled],
  )

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        currentKw,
        currentJahr,
        backshopCampaign ?? null,
        backshopStoreDisabled,
        offerItems,
        backshopLocalOverrides,
      ),
    [currentKw, currentJahr, backshopCampaign, backshopStoreDisabled, offerItems, backshopLocalOverrides],
  )

  const { currentStoreId } = useCurrentStore()
  const { data: productGroups = [] } = useBackshopProductGroups()
  const { data: sourceChoices = [] } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()

  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )
  const productGroupsForStore = useMemo(
    () => scopeProductGroupsByEffectiveBlock(productGroups, nameBlockOverrides),
    [productGroups, nameBlockOverrides],
  )
  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])

  const {
    productGroupByPluSource,
    chosenSourcesByGroup,
    memberSourcesByGroup,
    productGroupNames,
    groupBlockIdByGroupId,
  } = useMemo(() => {
    const byPluSource = new Map<string, string>()
    const names = new Map<string, string>()
    for (const g of productGroupsForStore) {
      names.set(g.id, g.display_name)
      for (const mm of g.members) {
        byPluSource.set(`${mm.plu}|${mm.source}`, g.id)
      }
    }
    const chosen = new Map<string, BackshopSource[]>()
    for (const c of sourceChoices) {
      chosen.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
    }
    const memberSourcesByG = new Map<string, Set<BackshopSource>>()
    const groupBlock = new Map<string, string | null>()
    for (const g of productGroupsForStore) {
      const s = new Set<BackshopSource>()
      for (const mem of g.members) s.add(mem.source as BackshopSource)
      memberSourcesByG.set(g.id, s)
      groupBlock.set(g.id, g.block_id ?? null)
    }
    return {
      productGroupByPluSource: byPluSource,
      chosenSourcesByGroup: chosen,
      memberSourcesByGroup: memberSourcesByG,
      productGroupNames: names,
      groupBlockIdByGroupId: groupBlock,
    }
  }, [productGroupsForStore, sourceChoices])

  const searchableItems = useMemo(() => {
    const activeRegeln = regeln.filter((r) => r.is_active)
    const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
    const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
    const { items } = buildBackshopDisplayList({
      masterItems,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks,
      customProducts: customProducts.map((c) => ({
        id: c.id,
        plu: c.plu,
        name: c.name,
        image_url: c.image_url,
        block_id: c.block_id,
        created_at: c.created_at,
      })),
      bezeichnungsregeln: activeRegeln,
      renamedItems,
      markYellowKwCount: markYellow,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup,
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
      lineForceShowKeys,
      lineForceHideKeys,
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
    regeln,
    blocks,
    layoutSettings,
    renamedItems,
    currentKw,
    currentJahr,
    nameBlockOverrides,
    productGroupByPluSource,
    memberSourcesByGroup,
    chosenSourcesByGroup,
    productGroupNames,
    blockPreferredSourceByBlockId,
    groupBlockIdByGroupId,
    lineForceShowKeys,
    lineForceHideKeys,
  ])

  const centralPluSet = useMemo(
    () => new Set((backshopCampaign?.lines ?? []).map((l) => l.plu)),
    [backshopCampaign],
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

  const listOrderPlu = useMemo(() => searchableItems.map((i) => i.plu), [searchableItems])

  const sortedCampaignLines = useMemo(
    () => orderByPluDisplayOrder([...(backshopCampaign?.lines ?? [])], (l) => l.plu, listOrderPlu),
    [backshopCampaign?.lines, listOrderPlu],
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
        const hiddenForStore = backshopStoreDisabled.has(line.plu)
        const hiddenFromList = rawHiddenPluSet.has(line.plu)
        const central = Number(line.promo_price)
        const localOverride = backshopLocalOverrides.get(line.plu) ?? null
        const effective = localOverride ?? central
        const custom = customProducts.find((c) => c.plu === line.plu)
        const thumbUrl = masterItem?.image_url ?? custom?.image_url ?? null
        return {
          plu: line.plu,
          name,
          hiddenForStore,
          hiddenFromList,
          central,
          effective,
          localOverride,
          thumbUrl,
        }
      }),
    [sortedCampaignLines, masterItems, customProducts, backshopStoreDisabled, backshopLocalOverrides, rawHiddenPluSet],
  )

  const megaphoneDialogRow = useMemo(
    () => (megaphoneDialogPlu ? centralCampaignRows.find((r) => r.plu === megaphoneDialogPlu) ?? null : null),
    [megaphoneDialogPlu, centralCampaignRows],
  )

  const megaphonePhase: CentralOfferMegaphonePhase | null = useMemo(() => {
    if (!megaphoneDialogRow) return null
    if (!megaphoneDialogRow.hiddenForStore) return 'promo_on'
    if (megaphoneDialogRow.hiddenFromList) return 'promo_off_hidden'
    return 'promo_off_visible'
  }, [megaphoneDialogRow])

  const megaphoneBusy =
    toggleCentralBackshop.isPending || hideBackshopProduct.isPending || unhideBackshopProduct.isPending

  const handleCentralMegaphoneAction = useCallback(
    async (action: CentralOfferMegaphoneAction) => {
      const plu = megaphoneDialogRow?.plu
      if (!plu) return
      try {
        switch (action) {
          case 'promo_off_keep_in_list':
            await toggleCentralBackshop.mutateAsync({ plu, disabled: true, silentToast: true })
            toast.success('Werbung aus, Produkt bleibt in der Liste')
            break
          case 'promo_off_hide_from_list':
            await toggleCentralBackshop.mutateAsync({ plu, disabled: true, silentToast: true })
            await hideBackshopProduct.mutateAsync(plu)
            toast.success('Werbung aus und aus Liste/PDF entfernt')
            break
          case 'promo_on_restore_central':
            await unhideBackshopProduct.mutateAsync({ plu, silentToast: true })
            await toggleCentralBackshop.mutateAsync({ plu, disabled: false, silentToast: true })
            toast.success('Zentrale Werbung wieder aktiv')
            break
          case 'promo_off_add_hide':
            await hideBackshopProduct.mutateAsync(plu)
            toast.success('Aus Liste und PDF entfernt')
            break
          case 'unhide_keep_promo_off':
            await unhideBackshopProduct.mutateAsync({ plu, silentToast: true })
            toast.success('Zeile wieder sichtbar (ohne Werbung)')
            break
          default:
            break
        }
        setMegaphoneDialogPlu(null)
      } catch {
        // Fehler-Toasts in den Hooks
      }
    },
    [megaphoneDialogRow, toggleCentralBackshop, hideBackshopProduct, unhideBackshopProduct],
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
        { onSuccess: () => {} },
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
      <div className="space-y-6" data-tour="backshop-offer-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Produkte in der Werbung (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Angebote verwalten: hinzufügen, Laufzeit anzeigen, aus Werbung entfernen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" data-tour="backshop-offer-toolbar">
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
                  data-tour="backshop-offer-excel-button"
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
              data-tour="backshop-offer-add-button"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Produkte zur Werbung hinzufügen
            </Button>
          </div>
        </div>

        {excelResult && (
          <Card>
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
                <Button variant="outline" size="sm" onClick={() => setExcelResult(null)}>
                  Abbrechen
                </Button>
                <Button size="sm" onClick={() => handleExcelConfirm()} disabled={addBatch.isPending}>
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

        {!offerLoading && (backshopCampaign?.lines.length ?? 0) === 0 && offerItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine Produkte in der Werbung</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Klicke auf „Produkte zur Werbung hinzufügen“, um Produkte als Angebot zu markieren.
              </p>
            </CardContent>
          </Card>
        )}

        {!offerLoading && (backshopCampaign?.lines.length ?? 0) > 0 && (
          <Card data-tour="backshop-offer-section-zentral">
            <CardContent className="p-0">
              <CentralOfferCampaignSection
                title="Zentrale Werbung"
                description="Megafon neben dem Stift: Klick fragt, ob nur die Werbung aus soll oder die Zeile aus Liste/PDF."
                dataTestId="backshop-offer-central-campaign-scroll-root"
                domain="backshop"
                currentKw={currentKw}
                currentJahr={currentJahr}
                rows={centralCampaignRows}
                isViewer={isViewer}
                megaphonePending={megaphoneBusy}
                firstItemDataTour="backshop-offer-zentral-first-item"
                onMegaphoneClick={(row) => setMegaphoneDialogPlu(row.plu)}
                onOpenLocalPrice={(row) => {
                  const camp = backshopCampaign!
                  setLocalPriceTarget({
                    plu: row.plu,
                    name: row.name,
                    centralPrice: row.central,
                    initialLocalPrice: row.localOverride,
                    kw: camp.kw_nummer,
                    jahr: camp.jahr,
                  })
                }}
              />
            </CardContent>
          </Card>
        )}

        {!offerLoading && offerProductInfos.length > 0 && (
          <Card data-tour="backshop-offer-section-eigen">
            <CardContent className="p-0">
              <LocalOwnOfferSection
                title="Eigene Werbung"
                dataTestId="backshop-offer-local-advertising-scroll-root"
                rows={localOfferRows}
                updatePending={updateOffer.isPending}
                removePending={removeOffer.isPending}
                firstItemDataTour="backshop-offer-eigen-first-item"
                onDurationChange={(plu, durationWeeks) =>
                  updateOffer.mutate({ plu, durationWeeks })
                }
                onRemove={(plu) => removeOffer.mutate(plu)}
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
          dataTour="backshop-offer-add-dialog"
          submitDataTour="backshop-offer-add-dialog-submit"
        />

        {localPriceTarget && (
          <CentralOfferLocalPriceDialog
            open
            onOpenChange={(o) => !o && setLocalPriceTarget(null)}
            domain="backshop"
            plu={localPriceTarget.plu}
            productName={localPriceTarget.name}
            centralPrice={localPriceTarget.centralPrice}
            initialLocalPrice={localPriceTarget.initialLocalPrice}
            kw_nummer={localPriceTarget.kw}
            jahr={localPriceTarget.jahr}
            dataTour="backshop-offer-local-price-dialog"
          />
        )}

        {megaphoneDialogRow && megaphonePhase && (
          <CentralOfferMegaphoneDialog
            open={megaphoneDialogPlu != null}
            onOpenChange={(o) => {
              if (!o) setMegaphoneDialogPlu(null)
            }}
            productLabel={`${megaphoneDialogRow.name} (${getDisplayPlu(megaphoneDialogRow.plu)})`}
            phase={megaphonePhase}
            isBusy={megaphoneBusy}
            onAction={handleCentralMegaphoneAction}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
