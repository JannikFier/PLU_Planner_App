// OfferProductsPage – Produkte in der Werbung (Obst/Gemüse)
// Liste, Aus Werbung entfernen, Produkte zur Werbung hinzufügen, Per Excel (Super-Admin)

import { useMemo, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Megaphone, Undo2, FileSpreadsheet } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOfferItems, useAddOfferItem, useRemoveOfferItem, useAddOfferItemsBatch, useUpdateOfferItem } from '@/hooks/useOfferItems'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useHiddenItems } from '@/hooks/useHiddenItems'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { getActiveOfferPLUs } from '@/lib/offer-utils'
import { parseOfferItemsExcel } from '@/lib/excel-parser'
import { AddToOfferDialog } from '@/components/plu/AddToOfferDialog'
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
  const [showAddDialog, setShowAddDialog] = useState(false)
  // Per Excel nur in Super-Admin-URL; in User-/Admin-Ansicht nur manuell hinzufügen
  const showExcelUpload = location.pathname.startsWith('/super-admin/')
  const [excelResult, setExcelResult] = useState<OfferItemsParseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: offerItems = [], isLoading: offerLoading } = useOfferItems()
  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
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

  const handleAddFromDialog = useCallback(
    (plu: string, durationWeeks: number) => {
      addOffer.mutate(
        { plu, durationWeeks },
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
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden.')
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

        {!offerLoading && offerItems.length === 0 && (
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

        {!offerLoading && offerProductInfos.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artikel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">Laufzeit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Status</th>
                    <th className="px-4 py-3 text-right w-[160px]" />
                  </tr>
                </thead>
                <tbody>
                  {offerProductInfos.map(({ item, name, isActive }) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(item.plu)}</td>
                      <td className="px-4 py-3 text-sm">{name}</td>
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
            </CardContent>
          </Card>
        )}

        <AddToOfferDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          searchableItems={searchableItems}
          onAdd={handleAddFromDialog}
          isAdding={addOffer.isPending}
        />
      </div>
    </DashboardLayout>
  )
}
