// Backshop: Ausgeblendete Produkte – Liste, Einblenden, „Produkte ausblenden“

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EyeOff, Undo2, Pencil } from 'lucide-react'
import { useBackshopHiddenItems, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { useQuery } from '@tanstack/react-query'
import { HideBackshopProductsDialog } from '@/components/plu/HideBackshopProductsDialog'
import { EditBackshopCustomProductDialog } from '@/components/plu/EditBackshopCustomProductDialog'
import type { BackshopCustomProduct } from '@/types/database'
import type { Profile } from '@/types/database'

interface HiddenProductInfo {
  plu: string
  name: string
  source: 'master' | 'custom' | 'unknown'
  customProduct: BackshopCustomProduct | null
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
}

export function BackshopHiddenProductsPage() {
  const { user } = useAuth()

  const [showHideDialog, setShowHideDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BackshopCustomProduct | null>(null)

  const { data: hiddenItems = [], isLoading: hiddenLoading } = useBackshopHiddenItems()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: blocks = [] } = useBackshopBlocks()
  const unhideProduct = useBackshopUnhideProduct()

  const hiddenPLUSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])

  const searchableItems = useMemo(() => {
    const master = masterItems
      .filter((m) => !hiddenPLUSet.has(m.plu))
      .map((m) => ({
        id: m.id,
        plu: m.plu,
        display_name: m.display_name ?? m.system_name,
        system_name: m.system_name,
      }))
    const custom = customProducts
      .filter((c) => !hiddenPLUSet.has(c.plu))
      .map((c) => ({
        id: c.id,
        plu: c.plu,
        display_name: c.name,
        system_name: c.name,
      }))
    return [...master, ...custom]
  }, [masterItems, customProducts, hiddenPLUSet])

  const hiddenByIds = useMemo(() => [...new Set(hiddenItems.map((h) => h.hidden_by))], [hiddenItems])

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-hidden-by', hiddenByIds],
    queryFn: async () => {
      if (hiddenByIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, personalnummer')
        .in('id', hiddenByIds)
      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'display_name' | 'personalnummer'>[]
    },
    enabled: hiddenByIds.length > 0,
  })

  const profileMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) {
      map.set(p.id, p.display_name ?? p.personalnummer)
    }
    return map
  }, [profiles])

  const hiddenProductInfos: HiddenProductInfo[] = useMemo(() => {
    return hiddenItems.map((hidden) => {
      const masterItem = masterItems.find((m) => m.plu === hidden.plu)
      if (masterItem) {
        return {
          plu: hidden.plu,
          name: masterItem.display_name ?? masterItem.system_name,
          source: 'master' as const,
          customProduct: null,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }
      const customItem = customProducts.find((c) => c.plu === hidden.plu)
      if (customItem) {
        return {
          plu: hidden.plu,
          name: customItem.name,
          source: 'custom' as const,
          customProduct: customItem,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }
      return {
        plu: hidden.plu,
        name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
        source: 'unknown' as const,
        customProduct: null,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
      }
    })
  }, [hiddenItems, masterItems, customProducts, profileMap])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ausgeblendete Produkte (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Produkte einblenden oder weitere ausblenden.
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowHideDialog(true)}>
            <EyeOff className="h-4 w-4 mr-2" />
            Produkte ausblenden
          </Button>
        </div>

        {hiddenLoading && (
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

        {!hiddenLoading && hiddenItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <EyeOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine ausgeblendeten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Du hast noch keine Backshop-Produkte ausgeblendet. Klicke auf „Produkte ausblenden“, um Produkte aus der Backshop-Liste auszublenden.
              </p>
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && hiddenProductInfos.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artikel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Ausgeblendet von</th>
                    <th className="px-4 py-3 text-right w-[180px]" />
                  </tr>
                </thead>
                <tbody>
                  {hiddenProductInfos.map((info) => (
                    <tr key={info.plu} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(info.plu)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          {info.name}
                          {info.source === 'custom' && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Eigen</Badge>
                          )}
                          {info.source === 'unknown' && (
                            <Badge variant="secondary" className="text-xs">Unbekannt</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          {info.hiddenByName}
                          {user && info.hidden_by === user.id && (
                            <Badge variant="secondary" className="text-xs shrink-0">Von mir</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {info.customProduct && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProduct(info.customProduct!)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Bearbeiten
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unhideProduct.mutate(info.plu)}
                            disabled={unhideProduct.isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Einblenden
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <HideBackshopProductsDialog
          open={showHideDialog}
          onOpenChange={setShowHideDialog}
          searchableItems={searchableItems}
        />

        {editingProduct && (
          <EditBackshopCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={blocks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
