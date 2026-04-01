// Backshop: Umbenannte Produkte (Admin/Super-Admin), inkl. Bild im Umbenennen-Dialog

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
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import {
  useBackshopOfferCampaignWithLines,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useResetBackshopProductName } from '@/hooks/useBackshopRename'
import { useAuth } from '@/hooks/useAuth'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { RenameProductsDialog } from '@/components/plu/RenameProductsDialog'
import { RenamedProductsResponsiveList } from '@/components/plu/RenamedProductsResponsiveList'
import type { BackshopMasterPLUItem, Block } from '@/types/database'

export function BackshopRenamedProductsPage() {
  useAuth()
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [resetConfirmItem, setResetConfirmItem] = useState<BackshopMasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [], isLoading: itemsLoading } = useBackshopPLUData(activeVersion?.id)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const { data: globalRenamed = [], isLoading: renamedLoading } = useBackshopRenamedItems()
  const resetName = useResetBackshopProductName()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )
  const renameDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks: blocks as Block[],
      storeBlockOrder: storeBackshopBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeBackshopBlockOrder, nameBlockOverrides],
  )

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
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

  const canonicalListOrderPlu = useMemo(() => {
    const activeRegeln = regeln.filter((r) => r.is_active)
    const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
    const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
    const { items } = buildBackshopDisplayList({
      masterItems,
      hiddenPLUs: new Set(),
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
      renamedItems: globalRenamed,
      markYellowKwCount: markYellow,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
    })
    return items.map((i) => i.plu)
  }, [
    masterItems,
    customProducts,
    offerDisplayByPlu,
    regeln,
    blocks,
    layoutSettings,
    globalRenamed,
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
  ])

  // Produkte, die in der aktuellen Version vorkommen UND global umbenannt sind
  const renamedItems = useMemo(() => {
    const renamedPlus = new Set(globalRenamed.map((r) => r.plu))
    const byPlu = new Map(globalRenamed.map((r) => [r.plu, r]))
    return masterItems
      .filter((m) => renamedPlus.has(m.plu))
      .map((m) => {
        const r = byPlu.get(m.plu)!
        return { ...m, display_name: r.display_name }
      })
  }, [masterItems, globalRenamed])

  const sortedRenamedItems = useMemo(
    () => orderByPluDisplayOrder(renamedItems, (x) => x.plu, canonicalListOrderPlu),
    [renamedItems, canonicalListOrderPlu],
  )

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    const systemName = resetConfirmItem.system_name?.trim()
    if (!systemName) return
    try {
      await resetName.mutateAsync({
        item_id: resetConfirmItem.id,
        system_name: systemName,
      })
      setResetConfirmItem(null)
    } catch {
      // Toast im Hook
    }
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
              <h2 className="text-2xl font-bold tracking-tight">Umbenannte Produkte (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Anzeigenamen und optional Bilder anpassen oder auf das Original zurücksetzen.
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
                Klicke auf „Produkte umbenennen“, um Anzeigenamen und optional Bilder in der Backshop-Liste zu ändern.
              </p>
            </CardContent>
          </Card>
        )}

        {!itemsLoading && !renamedLoading && sortedRenamedItems.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <RenamedProductsResponsiveList
                variant="backshop"
                resetPending={resetName.isPending}
                rows={sortedRenamedItems.map((item) => {
                  const r = globalRenamed.find((g) => g.plu === item.plu)
                  const thumb = (r?.image_url ?? item.image_url) || null
                  return {
                    plu: item.plu,
                    systemName: item.system_name,
                    currentName: item.display_name ?? item.system_name,
                    thumbUrl: thumb,
                    onReset: () => setResetConfirmItem(item),
                  }
                })}
              />
            </CardContent>
          </Card>
        )}

        <RenameProductsDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          searchableItems={masterItems}
          listType="backshop"
          displayMode={(layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'}
          renamedOverrides={globalRenamed.map((r) => ({ plu: r.plu, display_name: r.display_name }))}
          listLayout={renameDialogListLayout}
        />

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Aus Liste entfernen?'
                  : 'Produktnamen zurücksetzen?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Das Produkt wird aus der Liste „Umbenannte Produkte“ entfernt (nur die Einstellung „umbenannt“ wird zurückgesetzt). Name und Bild bleiben unverändert.'
                  : `Der Anzeigename wird wieder auf „${resetConfirmItem?.system_name}“ gesetzt. Das Bild bleibt unverändert.`}
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
