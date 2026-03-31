// OfferProductsPage – Produkte in der Werbung (Obst/Gemüse)
// Liste, Aus Werbung entfernen, Produkte zur Werbung hinzufügen, Per Excel (Super-Admin)

import { useMemo, useState, useRef, useCallback } from 'react'
import { buildDisplayList } from '@/lib/layout-engine'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, Undo2, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOfferItems, useAddOfferItem, useRemoveOfferItem, useAddOfferItemsBatch, useUpdateOfferItem } from '@/hooks/useOfferItems'
import {
  useObstOfferCampaignWithLines,
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
import { formatPreisEur, getDisplayPlu } from '@/lib/plu-helpers'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { getActiveOfferPLUs } from '@/lib/offer-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { parseOfferItemsExcel } from '@/lib/excel-parser'
import { AddToOfferDialog } from '@/components/plu/AddToOfferDialog'
import { CentralOfferLocalPriceDialog } from '@/components/plu/CentralOfferLocalPriceDialog'
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
  const { data: obstCampaign } = useObstOfferCampaignWithLines()
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const toggleCentralObst = useToggleObstOfferDisabled()
  const { data: activeVersion } = useActiveVersion()
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

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
  const activeOfferPLUs = useMemo(
    () => getActiveOfferPLUs(offerItems, currentKw, currentJahr),
    [offerItems, currentKw, currentJahr],
  )

  const hiddenPLUSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        currentKw,
        currentJahr,
        obstCampaign ?? null,
        obstStoreDisabled,
        offerItems,
        obstLocalOverrides,
      ),
    [currentKw, currentJahr, obstCampaign, obstStoreDisabled, offerItems, obstLocalOverrides],
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
      hiddenPLUs: hiddenPLUSet,
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
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
    })
    return items.map((i) => ({
      id: i.id,
      plu: i.plu,
      display_name: i.display_name,
      system_name: i.system_name,
      block_id: i.block_id,
    }))
  }, [
    masterItems,
    customProducts,
    hiddenPLUSet,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    activeVersion,
    currentKw,
    currentJahr,
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

  const handleAddFromDialog = useCallback(
    (plu: string, durationWeeks: number, promoPrice: number) => {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Per Excel hinzufügen
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
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
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <h3 className="text-sm font-semibold">Zentrale Werbung (KW {currentKw}/{currentJahr})</h3>
                <p className="text-xs text-muted-foreground">Megafon: Angebot für diesen Markt ein/aus (aus = nicht in Liste/PDF).</p>
              </div>
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 w-12" aria-label="Megafon" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">Artikel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">Preis</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaignLines.map((line) => {
                    const masterItem = masterItems.find((m) => m.plu === line.plu)
                    const name =
                      masterItem?.display_name ?? masterItem?.system_name
                      ?? customProducts.find((c) => c.plu === line.plu)?.name
                      ?? `PLU ${getDisplayPlu(line.plu)}`
                    const hiddenForStore = obstStoreDisabled.has(line.plu)
                    const central = Number(line.promo_price)
                    const localOverride = obstLocalOverrides.get(line.plu)
                    const effective = localOverride ?? central
                    const camp = obstCampaign!
                    return (
                      <tr
                        key={line.plu}
                        className={cn(
                          'border-b border-border last:border-b-0 hover:bg-muted/30',
                          hiddenForStore && 'opacity-50 line-through',
                        )}
                      >
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            title={hiddenForStore ? 'Werbung für diesen Markt aktivieren' : 'Werbung für diesen Markt ausblenden'}
                            onClick={() =>
                              toggleCentralObst.mutate({ plu: line.plu, disabled: !hiddenForStore })
                            }
                            disabled={toggleCentralObst.isPending}
                          >
                            <Megaphone className={cn('h-4 w-4', hiddenForStore && 'opacity-40')} />
                          </Button>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(line.plu)}</td>
                        <td className="px-4 py-3 text-sm">{name}</td>
                        <td className="px-4 py-3 text-sm align-top">
                          {!isViewer ? (
                            <button
                              type="button"
                              className={cn(
                                'w-full max-w-[240px] rounded-md border border-transparent px-2 py-2 text-left transition-colors',
                                'hover:bg-muted/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              )}
                              title="Eigener Verkaufspreis – Klicken zum Bearbeiten"
                              onClick={() =>
                                setLocalPriceTarget({
                                  plu: line.plu,
                                  name,
                                  centralPrice: central,
                                  initialLocalPrice: localOverride ?? null,
                                  kw: camp.kw_nummer,
                                  jahr: camp.jahr,
                                })
                              }
                            >
                              <p className="text-xs text-muted-foreground">
                                Zentral vorgegeben:{' '}
                                <span className="tabular-nums font-medium text-foreground">{formatPreisEur(central)}</span>
                              </p>
                              <p className="tabular-nums font-semibold mt-1">
                                Deine Anzeige: {formatPreisEur(effective)}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">Tippen zum Ändern</p>
                            </button>
                          ) : (
                            <div className="space-y-1 max-w-[200px]">
                              <p className="text-xs text-muted-foreground">
                                Zentral vorgegeben:{' '}
                                <span className="tabular-nums font-medium text-foreground">{formatPreisEur(central)}</span>
                              </p>
                              <p className="tabular-nums font-semibold">Anzeige: {formatPreisEur(effective)}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!offerLoading && offerProductInfos.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <h3 className="text-sm font-semibold">Eigene Werbung</h3>
              </div>
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artikel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Aktionspreis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Laufzeit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Status</th>
                    <th className="px-4 py-3 text-right w-[160px]" />
                  </tr>
                </thead>
                <tbody>
                  {sortedOfferProductInfos.map(({ item, name, isActive }) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(item.plu)}</td>
                      <td className="px-4 py-3 text-sm">{name}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">
                        {item.promo_price != null ? formatPreisEur(Number(item.promo_price)) : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={String(item.duration_weeks)}
                          onValueChange={(v) => updateOffer.mutate({ plu: item.plu, durationWeeks: Number(v) })}
                          disabled={updateOffer.isPending}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Woche</SelectItem>
                            <SelectItem value="2">2 Wochen</SelectItem>
                            <SelectItem value="3">3 Wochen</SelectItem>
                            <SelectItem value="4">4 Wochen</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <Badge variant="default" className="text-xs">Aktiv</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Abgelaufen</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOffer.mutate(item.plu)}
                          disabled={removeOffer.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Aus Werbung entfernen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
          />
        )}
      </div>
    </DashboardLayout>
  )
}
