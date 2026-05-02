/**
 * Props-only Zustände für BackshopHiddenProductsPage (Stufe 4.4).
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EyeOff } from 'lucide-react'

export function BackshopHiddenProductsLoadingSkeletonCard({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function BackshopHiddenProductsNoManualHiddenPanel() {
  return (
    <div className="bshva-panel">
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <EyeOff className="h-10 w-10 text-[var(--bshva-n-400)] mb-2" />
        <p className="text-sm text-[var(--bshva-n-500)] max-w-md">
          Keine bewusst ausgeblendeten Produkte. „Produkte ausblenden“ legt einen dauerhaften Markt-Eintrag an.
        </p>
      </div>
    </div>
  )
}

export function BackshopHiddenProductsNoRuleFilteredPanel() {
  return (
    <div className="bshva-panel p-6 text-sm text-center text-[var(--bshva-n-500)]">
      Keine durch Regeln zusätzlich ausgefilterten Artikel; die sichtbaren Quellzeilen in der Hauptliste entsprechen der
      aktuellen Regel-Logik.
    </div>
  )
}

export function BackshopHiddenProductsBrandFilterEmptyPanel() {
  return (
    <div className="bshva-panel p-6 text-sm text-center text-[var(--bshva-n-500)]">
      Keine Treffer für den gewählten Marken-Filter.
    </div>
  )
}
