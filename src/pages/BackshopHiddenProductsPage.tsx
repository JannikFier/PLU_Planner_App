// Backshop: Ausgeblendete Produkte – manuell vs. regelbasiert nicht in der Hauptliste

import { useState, useCallback } from 'react'
import '@/styles/backshop-hidden-variant-a.css'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CircleHelp, EyeOff, Hand, ListFilter } from 'lucide-react'
import { EditBackshopCustomProductDialog } from '@/components/plu/EditBackshopCustomProductDialog'
import { cn } from '@/lib/utils'
import { BackshopHiddenBlockOverview } from '@/components/backshop/BackshopHiddenBlockOverview'
import { BackshopHiddenManualDesktopTable } from '@/components/backshop/hidden-variant-a/BackshopHiddenManualDesktopTable'
import { BackshopHiddenRuleDesktopTable } from '@/components/backshop/hidden-variant-a/BackshopHiddenRuleDesktopTable'
import { HiddenProductsResponsiveList } from '@/components/plu/HiddenProductsResponsiveList'
import { BackshopRuleFilteredResponsiveList } from '@/components/plu/BackshopRuleFilteredResponsiveList'
import { ListFindInPageToolbar } from '@/components/plu/ListFindInPageToolbar'
import type { BackshopCustomProduct } from '@/types/database'
import type { BackshopHiddenSourceSegment } from '@/lib/backshop-hidden-source-segment'
import { useBackshopHiddenProductsPageModel } from '@/hooks/useBackshopHiddenProductsPageModel'
import {
  BackshopHiddenProductsBrandFilterEmptyPanel,
  BackshopHiddenProductsLoadingSkeletonCard,
  BackshopHiddenProductsNoManualHiddenPanel,
  BackshopHiddenProductsNoRuleFilteredPanel,
} from '@/components/backshop/BackshopHiddenProductsPageSlices'

export function BackshopHiddenProductsPage() {
  const [searchParamsForInit] = useSearchParams()
  const [sourceSegment, setSourceSegment] = useState<BackshopHiddenSourceSegment>('all')
  const [editingProduct, setEditingProduct] = useState<BackshopCustomProduct | null>(null)
  const [showHiddenHelp, setShowHiddenHelp] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'rule'>(() =>
    searchParamsForInit.get('ruleBlock') && !searchParamsForInit.get('manualBlock') ? 'rule' : 'manual',
  )

  const onEditCustomProduct = useCallback((product: BackshopCustomProduct) => {
    setEditingProduct(product)
  }, [])

  const m = useBackshopHiddenProductsPageModel({
    sourceSegment,
    activeTab,
    setActiveTab,
    onEditCustomProduct,
  })

  return (
    <DashboardLayout>
      <div
        data-page="backshop-hidden"
        data-tour="backshop-hidden-page"
        className="space-y-5 max-w-[1600px] mx-auto min-w-0"
        data-testid="hidden-products-scroll-root"
      >
        <div className="space-y-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2">
            <div className="flex min-w-0 w-full items-center gap-2 sm:flex-1 sm:min-w-0">
              <div className="shrink-0 rounded-lg bg-muted p-1.5">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="min-w-0 flex-1 text-lg font-bold tracking-tight break-words sm:flex-none sm:text-xl">
                Ausgeblendete Produkte (Backshop)
              </h2>
            </div>
            <div
              className="flex min-w-0 w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-1 sm:justify-end"
              data-tour="backshop-hidden-toolbar"
            >
              {!m.isLoading && m.activeTabHasFindableList && m.backshopFindItems.length > 0 && (
                <ListFindInPageToolbar
                  showBar={m.backshopListFind.showBar}
                  onOpen={() => {
                    m.setBlockNav(activeTab, m.ALL_BLOCKS_PARAM)
                    window.setTimeout(() => {
                      m.backshopListFind.openSearch()
                    }, 0)
                  }}
                  barProps={m.backshopListFind.findInPageBarProps}
                  dataTour="backshop-hidden-search"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                aria-haspopup="dialog"
                title="Hilfe anzeigen"
                onClick={() => setShowHiddenHelp(true)}
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
                <span className="sr-only">Hilfe zu Ausblendliste und Regeln</span>
              </Button>
              {m.canManageHidden && (
                <Button
                  size="sm"
                  className="shrink-0 bshva-btn-primary border-0 shadow-sm"
                  data-tour="backshop-hidden-add-button"
                  onClick={() =>
                    m.navigate(`${m.rolePrefix}/pick-hide-backshop`, {
                      state: { backTo: `${m.pathname}${m.location.search ?? ''}` },
                    })
                  }
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Produkte ausblenden
                </Button>
              )}
            </div>
          </div>

          <Dialog open={showHiddenHelp} onOpenChange={setShowHiddenHelp}>
            <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Hilfe: Ausgeblendete Produkte</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-1 text-left text-muted-foreground">
                    <p>
                      Oben: bewusst für diesen Markt ausgeblendete Artikel. Unten: Artikel aus der eingespielten Version,
                      die in der normalen Backshop-Liste wegen Marken- oder Warengruppen-Logik nicht erscheinen (ohne
                      Eintrag in der Ausblendliste).
                    </p>
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      <p className="font-medium text-foreground">Kurz erklärt: Ausblendliste, Regeln, Werbung</p>
                      <p>
                        <span className="font-medium text-foreground">Ausblendliste (Tabelle oben):</span>{' '}
                        PLUs, die jemand mit &quot;Produkte ausblenden&quot; für diesen Markt gespeichert hat.
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Regeln (Tabelle unten):</span>{' '}
                        Dieselbe Berechnung wie die Backshop-Hauptliste. Master-Zeilen, die dort fehlen, obwohl die PLU
                        nicht auf der Ausblendliste steht (z. B. andere Markenwahl, Warengruppen-Regeln).
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Werbung:</span> Steht eine PLU in der zentralen
                        Werbung, kann sie in der Hauptliste trotzdem sichtbar sein – in der oberen Tabelle weist ein Badge
                        darauf hin.
                      </p>
                      {!m.isLoading && m.hasMultiSourceManual && (
                        <p className="rounded-md border border-dashed border-border/80 bg-muted/40 px-2.5 py-2">
                          <span className="font-medium text-foreground">Mehrere Marken zu einer PLU:</span> Eine
                          manuell ausgeblendete Nummer gilt pro Markt für alle Quellzeilen zu dieser PLU, auch wenn hier
                          nur eine Marke in der Zeile sichtbar ist.
                        </p>
                      )}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bshva-filter-card">
          <div
            className="bshva-tabs"
            role="tablist"
            aria-label="Ausgeblendet: Listen"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                m.switchMainTab(activeTab === 'manual' ? 'rule' : 'manual')
              }
            }}
          >
            <button
              type="button"
              id="backshop-hidden-tab-manual"
              role="tab"
              className="bshva-tab"
              aria-selected={activeTab === 'manual'}
              tabIndex={activeTab === 'manual' ? 0 : -1}
              onClick={() => m.switchMainTab('manual')}
              title="Manuell ausgeblendet"
              data-tour="backshop-hidden-mode-manual"
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <Hand className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="sm:hidden">Manuell </span>
                <span className="hidden sm:inline">Manuell ausgeblendet </span>
                <span className="bshva-tab-count">{m.hiddenListRows.length}</span>
              </span>
            </button>
            <button
              type="button"
              id="backshop-hidden-tab-rule"
              role="tab"
              className="bshva-tab"
              aria-selected={activeTab === 'rule'}
              tabIndex={activeTab === 'rule' ? 0 : -1}
              onClick={() => m.switchMainTab('rule')}
              title="Durch Regel gefiltert"
              data-tour="backshop-hidden-mode-rule"
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <ListFilter className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="sm:hidden">Regeln </span>
                <span className="hidden sm:inline">Durch Regel gefiltert </span>
                <span className="bshva-tab-count">{m.ruleListRows.length}</span>
              </span>
            </button>
            <div className="hidden min-w-[8px] sm:block sm:flex-1" />
          </div>
          <div className="bshva-filter-strip">
            <div className="bshva-chip-row">
              <button
                type="button"
                className="bshva-chip"
                aria-pressed={sourceSegment === 'all'}
                onClick={() => setSourceSegment('all')}
              >
                Alle <span className="bshva-chip-count">{m.brandChipCounts.all}</span>
              </button>
              {m.BACKSHOP_SOURCES.map((s) => {
                const meta = m.BACKSHOP_SOURCE_META[s]
                const count =
                  s === 'edeka' ? m.brandChipCounts.edeka : s === 'harry' ? m.brandChipCounts.harry : m.brandChipCounts.aryzta
                return (
                  <button
                    key={s}
                    type="button"
                    className="bshva-chip"
                    aria-pressed={sourceSegment === s}
                    onClick={() => setSourceSegment(s)}
                  >
                    <span
                      className={cn(
                        'bshva-bbadge shrink-0',
                        s === 'edeka' && 'bshva-bbadge--E',
                        s === 'harry' && 'bshva-bbadge--H',
                        s === 'aryzta' && 'bshva-bbadge--A',
                      )}
                    >
                      {meta.short}
                    </span>
                    {meta.label} <span className="bshva-chip-count">{count}</span>
                  </button>
                )
              })}
              <button
                type="button"
                className="bshva-chip"
                aria-pressed={sourceSegment === 'eigen'}
                onClick={() => setSourceSegment('eigen')}
              >
                <span className="bshva-bbadge bshva-bbadge--O shrink-0">O</span>
                Eigene <span className="bshva-chip-count">{m.brandChipCounts.eigen}</span>
              </button>
            </div>
          </div>
          {!m.isLoading &&
            activeTab === 'manual' &&
            m.hiddenListRowsFiltered.length > 0 &&
            !m.manualBlockParam && (
              <div className="bshva-tiles-wrap">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="bshva-section-label">
                    Warengruppen
                    <button
                      type="button"
                      className={cn(
                        'ml-1.5 cursor-pointer rounded-full border border-[var(--bshva-border)] bg-[var(--bshva-n-75)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--bshva-n-700)] underline decoration-dotted underline-offset-2 transition-colors',
                        'hover:border-[var(--bshva-blue-500)]/40 hover:bg-[var(--bshva-blue-50)] hover:text-[var(--bshva-blue-700)]',
                      )}
                      title="Alle Warengruppen in einer Liste"
                      aria-label="Alle Warengruppen in einer Liste"
                      onClick={() => m.setBlockNav('manual', m.ALL_BLOCKS_PARAM)}
                    >
                      Alle
                    </button>
                  </div>
                </div>
                <BackshopHiddenBlockOverview
                  tiles={m.manualBlockTiles}
                  onOpenBlock={(id) => m.onTileNavigate('manual', id)}
                  emptyMessage="Keine Treffer (Filter oder Suche)."
                  gridClassName="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4"
                />
              </div>
            )}
          {!m.isLoading &&
            activeTab === 'rule' &&
            m.ruleListRowsFiltered.length > 0 &&
            !m.ruleBlockParam && (
              <div className="bshva-tiles-wrap">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="bshva-section-label">
                    Warengruppen
                    <button
                      type="button"
                      className={cn(
                        'ml-1.5 cursor-pointer rounded-full border border-[var(--bshva-border)] bg-[var(--bshva-n-75)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--bshva-n-700)] underline decoration-dotted underline-offset-2 transition-colors',
                        'hover:border-[var(--bshva-blue-500)]/40 hover:bg-[var(--bshva-blue-50)] hover:text-[var(--bshva-blue-700)]',
                      )}
                      title="Alle Warengruppen in einer Liste"
                      aria-label="Alle Warengruppen in einer Liste"
                      onClick={() => m.setBlockNav('rule', m.ALL_BLOCKS_PARAM)}
                    >
                      Alle
                    </button>
                  </div>
                </div>
                <BackshopHiddenBlockOverview
                  tiles={m.ruleBlockTiles}
                  onOpenBlock={(id) => m.onTileNavigate('rule', id)}
                  emptyMessage="Keine Treffer (Filter oder Suche)."
                  gridClassName="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4"
                  tileSubtitle="Artikel, die in dieser Warengruppe per Regel nicht in der Liste erscheinen"
                />
              </div>
            )}
        </div>

        {m.isLoading && <BackshopHiddenProductsLoadingSkeletonCard />}

        {!m.isLoading &&
          ((activeTab === 'manual' && m.manualBlockParam) || (activeTab === 'rule' && m.ruleBlockParam)) && (
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2 pl-2"
                onClick={m.clearBlockNav}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Zurück Übersicht
              </Button>
            </div>
          )}

        {!m.isLoading && activeTab === 'manual' && m.hiddenItems.length === 0 && (
          <BackshopHiddenProductsNoManualHiddenPanel />
        )}

        {!m.isLoading &&
          activeTab === 'manual' &&
          m.hiddenListRows.length > 0 &&
          m.hiddenListRowsFiltered.length === 0 && <BackshopHiddenProductsBrandFilterEmptyPanel />}

        {!m.isLoading && activeTab === 'manual' && m.manualBlockParam && (
          <div className="bshva-panel" data-tour="backshop-hidden-list">
            <div className="bshva-panel-head">
              <div>
                <h3>Manuell ausgeblendet</h3>
                <p className="bshva-panel-head-sub">Warengruppe gefiltert – alle Zeilen dieser Gruppe.</p>
              </div>
              <div className="text-xs text-[var(--bshva-n-500)]">
                {m.manualBlockParam === m.ALL_BLOCKS_PARAM
                  ? 'Alle Warengruppen'
                  : (m.blockNameById.get(m.manualBlockParam) ??
                    (m.manualBlockParam === m.UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : m.manualBlockParam))}
              </div>
            </div>
            <div className="bshva-panel-body-flush">
              <div className="min-w-0" data-find-in-scope={m.BACKSHOP_HIDDEN_FIND_SCOPE_ID}>
                <div className="hidden lg:block">
                  <BackshopHiddenManualDesktopTable
                    rows={m.manualDetailRows}
                    canManageHidden={m.canManageHidden}
                    unhidePending={m.unhideProduct.isPending}
                    onUnhide={(plu) => m.unhideProduct.mutate(plu)}
                    findInPage={m.hiddenFindInPageBinding}
                    firstItemDataTour="backshop-hidden-first-item"
                    firstShowButtonDataTour="backshop-hidden-show-button"
                  />
                </div>
                <div className="lg:hidden p-0">
                  <HiddenProductsResponsiveList
                    variant="backshop"
                    canManageHidden={m.canManageHidden}
                    unhidePending={m.unhideProduct.isPending}
                    onUnhide={(plu) => m.unhideProduct.mutate(plu)}
                    rows={m.manualDetailRows}
                    findInPage={m.hiddenFindInPageBinding}
                    attachFindInScope={false}
                    firstItemDataTour="backshop-hidden-first-item"
                    firstShowButtonDataTour="backshop-hidden-show-button"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!m.isLoading && activeTab === 'rule' && m.ruleListRows.length === 0 && (
          <BackshopHiddenProductsNoRuleFilteredPanel />
        )}

        {!m.isLoading &&
          activeTab === 'rule' &&
          m.ruleListRows.length > 0 &&
          m.ruleListRowsFiltered.length === 0 && <BackshopHiddenProductsBrandFilterEmptyPanel />}

        {!m.isLoading && activeTab === 'rule' && m.ruleBlockParam && (
          <div className="bshva-panel" data-tour="backshop-hidden-rule-list">
            <div className="bshva-panel-head">
              <div>
                <h3>Durch Regeln nicht in der Hauptliste</h3>
                <p className="bshva-panel-head-sub">Warengruppe gefiltert – alle Zeilen dieser Ansicht.</p>
              </div>
              <div className="text-xs text-[var(--bshva-n-500)]">
                {m.ruleBlockParam === m.ALL_BLOCKS_PARAM
                  ? 'Alle Warengruppen'
                  : (m.blockNameById.get(m.ruleBlockParam) ??
                    (m.ruleBlockParam === m.UNGEORDNET_BLOCK ? 'Ohne Warengruppe' : m.ruleBlockParam))}
              </div>
            </div>
            <div className="bshva-panel-body-flush">
              <div className="min-w-0" data-find-in-scope={m.BACKSHOP_HIDDEN_FIND_SCOPE_ID}>
                <div className="hidden lg:block">
                  <BackshopHiddenRuleDesktopTable
                    rows={m.ruleDetailRows}
                    canEditLineActions={m.canManageHidden}
                    forceShowPending={m.upsertLineOverride.isPending}
                    onForceShow={m.onRuleForceShow}
                    onRequestBrandPicker={
                      m.canManageHidden
                        ? (row) => {
                            if (row.productGroupId) m.openMarkenAuswahlForGroup(row.productGroupId)
                          }
                        : undefined
                    }
                    findInPage={m.hiddenFindInPageBinding}
                    firstItemDataTour="backshop-hidden-rule-first-item"
                  />
                </div>
                <div className="lg:hidden">
                  <BackshopRuleFilteredResponsiveList
                    rows={m.ruleDetailRows}
                    canEditLineActions={m.canManageHidden}
                    onForceShow={m.onRuleForceShow}
                    forceShowPending={m.upsertLineOverride.isPending}
                    onRequestBrandPicker={
                      m.canManageHidden
                        ? (row) => {
                            if (row.productGroupId) m.openMarkenAuswahlForGroup(row.productGroupId)
                          }
                        : undefined
                    }
                    findInPage={m.hiddenFindInPageBinding}
                    attachFindInScope={false}
                    firstItemDataTour="backshop-hidden-rule-first-item"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {editingProduct && (
          <EditBackshopCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={m.blocks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
