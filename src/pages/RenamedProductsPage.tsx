// RenamedProductsPage – Umbenannte Produkte (Admin/Super-Admin)
// Liste der umbenannten Master-Items, „Produkte umbenennen“-Dialog, Zurücksetzen mit Bestätigung

import { useMemo, useState } from 'react'
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
  useObstOfferCampaignWithLines,
  useObstOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useObstOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useResetProductName } from '@/hooks/useCustomProducts'
import { useAuth } from '@/hooks/useAuth'
import { buildDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { RenameProductsDialog } from '@/components/plu/RenameProductsDialog'
import { RenamedProductsResponsiveList } from '@/components/plu/RenamedProductsResponsiveList'
import type { MasterPLUItem } from '@/types/database'

export function RenamedProductsPage() {
  useAuth()
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [resetConfirmItem, setResetConfirmItem] = useState<MasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [], isLoading: itemsLoading, isError: itemsError } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: storeRenamed = [], isLoading: renamedLoading } = useRenamedItems()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const renameDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks,
      storeBlockOrder: storeObstBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeObstBlockOrder, nameBlockOverrides],
  )
  const { data: offerItems = [] } = useOfferItems()
  const { data: obstCampaign } = useObstOfferCampaignWithLines()
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const { overrideMap: obstLocalOverrides } = useObstOfferLocalPriceOverrides(obstCampaign ?? undefined)
  const resetName = useResetProductName()
  const displayMode = (layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'
  const flowDirection = (layoutSettings?.flow_direction ?? 'COLUMN_FIRST') as 'ROW_BY_ROW' | 'COLUMN_FIRST'
  const dialogFontSizes = {
    header: layoutSettings?.font_header_px ?? 24,
    column: layoutSettings?.font_column_px ?? 16,
    product: layoutSettings?.font_product_px ?? 12,
  }

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
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
      currentKwNummer: currentKw,
      currentJahr,
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
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
  ])

  // Produkte, die in der aktuellen Version vorkommen UND marktspezifisch umbenannt sind
  const renamedItems = useMemo(() => {
    const renamedPlus = new Set(storeRenamed.map((r) => r.plu))
    const byPlu = new Map(storeRenamed.map((r) => [r.plu, r]))
    return masterItems
      .filter((m) => renamedPlus.has(m.plu))
      .map((m) => {
        const r = byPlu.get(m.plu)!
        return { ...m, display_name: r.display_name }
      })
  }, [masterItems, storeRenamed])

  const sortedRenamedItems = useMemo(
    () => orderByPluDisplayOrder(renamedItems, (x) => x.plu, canonicalListOrderPlu),
    [renamedItems, canonicalListOrderPlu],
  )

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    try {
      await resetName.mutateAsync({ id: resetConfirmItem.id, systemName: resetConfirmItem.system_name })
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          <Button variant="outline" size="sm" onClick={() => setShowRenameDialog(true)}>
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
          <Card>
            <CardContent className="p-0">
              <RenamedProductsResponsiveList
                variant="obst"
                resetPending={resetName.isPending}
                rows={sortedRenamedItems.map((item) => ({
                  plu: item.plu,
                  systemName: item.system_name,
                  currentName: item.display_name ?? item.system_name,
                  thumbUrl: null,
                  onReset: () => setResetConfirmItem(item),
                }))}
              />
            </CardContent>
          </Card>
        )}

        <RenameProductsDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          searchableItems={masterItems}
          displayMode={displayMode}
          renamedOverrides={storeRenamed.map((r) => ({ plu: r.plu, display_name: r.display_name }))}
          listLayout={renameDialogListLayout}
          flowDirection={flowDirection}
          fontSizes={dialogFontSizes}
        />

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Produktnamen zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Der Anzeigename wird wieder auf das Original „
                {resetConfirmItem?.system_name}“ gesetzt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirm} disabled={resetName.isPending}>
                {resetName.isPending ? 'Wird zurückgesetzt…' : 'Zurücksetzen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
