// RenamedProductsPage – Umbenannte Produkte (Admin/Super-Admin)
// Liste der umbenannten Master-Items, „Produkte umbenennen“-Dialog, Zurücksetzen mit Bestätigung

import { useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil } from 'lucide-react'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useRenamedItems } from '@/hooks/useRenamedItems'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBlocks } from '@/hooks/useBlocks'
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { useOfferItems } from '@/hooks/useOfferItems'
import {
  useObstOfferCampaignForKwYear,
  useObstOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useObstOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useResetProductName, useDeleteObstRenamedByPlu } from '@/hooks/useCustomProducts'
import { useAuth } from '@/hooks/useAuth'
import { buildDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { itemMatchesSearch } from '@/lib/plu-helpers'
import { useListFindInPageSection } from '@/hooks/useListFindInPageSection'
import { ListFindInPageToolbar } from '@/components/plu/ListFindInPageToolbar'
import type { ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import {
  RenamedProductsResponsiveList,
  type RenamedProductDisplayRow,
} from '@/components/plu/RenamedProductsResponsiveList'
import type { MasterPLUItem } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverObstRowToMasterItem } from '@/lib/carryover-master-snapshot'

export function RenamedProductsPage() {
  useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pathPrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'
  const [resetConfirmItem, setResetConfirmItem] = useState<MasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [], isLoading: itemsLoading, isError: itemsError } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: storeRenamed = [], isLoading: renamedLoading } = useRenamedItems()
  const { data: obstCarryoverRows = [] } = useStoreListCarryoverRows('obst', activeVersion?.id)
  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const { data: offerItems = [] } = useOfferItems()
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    activeVersion?.kw_nummer,
    activeVersion?.jahr,
    !!activeVersion,
  )
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const { overrideMap: obstLocalOverrides } = useObstOfferLocalPriceOverrides(obstCampaign ?? undefined)
  const resetName = useResetProductName()
  const deleteObstRenamedByPlu = useDeleteObstRenamedByPlu()

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const offerMapKw = activeVersion?.kw_nummer ?? calendarKw
  const offerMapJahr = activeVersion?.jahr ?? calendarJahr
  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        offerMapKw,
        offerMapJahr,
        obstCampaign ?? null,
        obstStoreDisabled,
        offerItems,
        obstLocalOverrides,
      ),
    [offerMapKw, offerMapJahr, obstCampaign, obstStoreDisabled, offerItems, obstLocalOverrides],
  )

  const canonicalListOrderPlu = useMemo(() => {
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
      hiddenPLUs: new Set(),
      offerDisplayByPlu,
      renamedItems: storeRenamed.map((r) => ({
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
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
    })
    return items.map((i) => i.plu)
  }, [
    masterItems,
    customProducts,
    offerDisplayByPlu,
    storeRenamed,
    regeln,
    blocks,
    layoutSettings,
    activeVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
  ])

  /** Nur in der Liste (Carryover), nicht im Zentral-Master dieser KW – für Umbenennen-Dialog + Übersicht. */
  const carryoverMastersIncluded = useMemo(() => {
    if (!activeVersion?.id) return [] as MasterPLUItem[]
    return obstCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverObstRowToMasterItem(r, activeVersion.id))
  }, [obstCarryoverRows, activeVersion?.id])

  const masterByPluForRenamed = useMemo(() => {
    const m = new Map<string, MasterPLUItem>()
    for (const item of masterItems) m.set(item.plu, item)
    for (const c of carryoverMastersIncluded) {
      if (!m.has(c.plu)) m.set(c.plu, c)
    }
    return m
  }, [masterItems, carryoverMastersIncluded])

  // Marktspezifisch umbenannt: Master ODER Carryover-Zeile (PLU nur in Carryover)
  const renamedItems = useMemo(() => {
    const out: MasterPLUItem[] = []
    for (const r of storeRenamed) {
      const base = masterByPluForRenamed.get(r.plu)
      if (!base) continue
      out.push({ ...base, display_name: r.display_name })
    }
    return out
  }, [storeRenamed, masterByPluForRenamed])

  const sortedRenamedItems = useMemo(
    () => orderByPluDisplayOrder(renamedItems, (x) => x.plu, canonicalListOrderPlu),
    [renamedItems, canonicalListOrderPlu],
  )

  const renamedListRows: RenamedProductDisplayRow[] = useMemo(
    () =>
      sortedRenamedItems.map((item) => ({
        plu: item.plu,
        systemName: item.system_name,
        currentName: item.display_name ?? item.system_name,
        thumbUrl: null,
        onReset: () => setResetConfirmItem(item),
      })),
    [sortedRenamedItems],
  )

  const matchRenamedRowForFind = useCallback((row: RenamedProductDisplayRow, q: string) => {
    return itemMatchesSearch(
      { plu: row.plu, display_name: row.currentName, system_name: row.systemName },
      q,
    )
  }, [])

  const renamedListFind = useListFindInPageSection({
    items: renamedListRows,
    scopeId: 'renamed-products-obst-page',
    isMatch: matchRenamedRowForFind,
  })

  const renamedFindInPageBinding = useMemo((): ListFindInPageBinding | undefined => {
    if (renamedListRows.length === 0) return undefined
    return {
      scopeId: 'renamed-products-obst-page',
      activeRowIndex: renamedListFind.activeRowIndex,
      matchIndices: renamedListFind.matchIndices,
    }
  }, [renamedListRows.length, renamedListFind.activeRowIndex, renamedListFind.matchIndices])

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    try {
      if (resetConfirmItem.id.startsWith('carryover-')) {
        await deleteObstRenamedByPlu.mutateAsync({ plu: resetConfirmItem.plu })
      } else {
        await resetName.mutateAsync({ id: resetConfirmItem.id, systemName: resetConfirmItem.system_name })
      }
      setResetConfirmItem(null)
    } catch {
      // Toast im Hook
    }
  }

  if (itemsError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Fehler beim Laden der Daten</p>
            <p className="text-sm mt-1">Bitte lade die Seite neu oder versuche es später erneut.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          data-tour="obst-renamed-toolbar"
        >
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-muted">
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Umbenannte Produkte</h2>
                <p className="text-sm text-muted-foreground">
                  Anzeigenamen anpassen oder auf das Original zurücksetzen.
                </p>
              </div>
            </div>
            {!itemsLoading && !renamedLoading && renamedListRows.length > 0 && (
              <ListFindInPageToolbar
                showBar={renamedListFind.showBar}
                onOpen={renamedListFind.openSearch}
                barProps={renamedListFind.findInPageBarProps}
                dataTour="obst-renamed-search"
              />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`${pathPrefix}/pick-rename-obst`, {
                state: { backTo: `${location.pathname}${location.search ?? ''}` },
              })
            }
            data-tour="obst-renamed-add-button"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Produkte umbenennen
          </Button>
        </div>

        {(itemsLoading || renamedLoading) && (
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

        {!itemsLoading && !renamedLoading && sortedRenamedItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Pencil className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine umbenannten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Klicke oben rechts auf „Produkte umbenennen“, um Anzeigenamen in der PLU-Liste zu
                ändern.
              </p>
            </CardContent>
          </Card>
        )}

        {!itemsLoading && !renamedLoading && sortedRenamedItems.length > 0 && (
          <Card data-tour="obst-renamed-list">
            <CardContent className="p-0">
              <RenamedProductsResponsiveList
                variant="obst"
                resetPending={resetName.isPending || deleteObstRenamedByPlu.isPending}
                rows={renamedListRows}
                findInPage={renamedFindInPageBinding}
                firstItemDataTour="obst-renamed-first-item"
                firstResetButtonDataTour="obst-renamed-reset-button"
              />
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent data-tour="obst-renamed-reset-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Produktnamen zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Der Anzeigename wird wieder auf das Original „
                {resetConfirmItem?.system_name}“ gesetzt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetConfirm}
                disabled={resetName.isPending || deleteObstRenamedByPlu.isPending}
              >
                {resetName.isPending || deleteObstRenamedByPlu.isPending
                  ? 'Wird zurückgesetzt…'
                  : 'Zurücksetzen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
