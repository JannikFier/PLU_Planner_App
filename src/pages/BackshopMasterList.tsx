// BackshopMasterList – Backshop-PLU-Tabelle (Bild | PLU | Name)

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  FileDown,
  Plus,
  EyeOff,
  Pencil,
  Megaphone,
  GitCompareArrows,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BackshopMasterListPageHeader } from '@/components/plu/BackshopMasterListPageHeader'
import { BackshopMasterListToolbar } from '@/components/plu/BackshopMasterListToolbar'
import {
  BackshopMasterListArchiveAlert,
  BackshopMasterListEmptyDataCard,
  BackshopMasterListItemsErrorCard,
  BackshopMasterListLoadingSkeletonCard,
  BackshopMasterListNoVersionCard,
  BackshopMasterListSnapshotInvalidCard,
  BackshopMasterListSourceFilterAlert,
  BackshopMasterListWgSortHintAlert,
} from '@/components/plu/BackshopMasterListPageStates'
import type { PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import { PLUTable, type PLUTableHandle } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'
import {
  formatKwLabelWithOptionalMonSatRange,
  getBackshopToolbarWerbungLayout,
} from '@/lib/date-kw-utils'
import { useRegisterKioskListFindInPage, useRegisterKioskListHeaderSummary, type KioskListHeaderSummary } from '@/contexts/KioskListFindContext'
import { BACKSHOP_SOURCE_META, type BackshopExcelSource } from '@/lib/backshop-sources'
import { useRolePrefixFromLocation } from '@/hooks/useRolePrefixFromLocation'
import { useBackshopMasterListPdfExportList } from '@/hooks/useBackshopMasterListPdfExportList'
import { useBackshopMasterListDisplayBundle } from '@/hooks/useBackshopMasterListDisplayBundle'

const ExportBackshopPDFDialog = lazy(() =>
  import('@/components/plu/ExportBackshopPDFDialog').then((m) => ({ default: m.ExportBackshopPDFDialog })),
)

/**
 * Backshop-Masterliste: Tabelle mit Bild, PLU, Name.
 * Immer die aktive eingespielte PLU-Liste; zentrale Werbung (KW) per Dropdown wählbar.
 */
export function BackshopMasterList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isViewer, isKiosk, isSuperAdmin } = useAuth()
  const listReadOnly = isViewer || isKiosk

  const rolePrefix = useRolePrefixFromLocation()

  const bundle = useBackshopMasterListDisplayBundle()
  const {
    isSnapshot,
    snapshotInvalid,
    snapshotReadOnly,
    snapshotSourceOnly,
    setSearchParams,
    resolvedBackshopVersion,
    listVersion,
    itemsRefetching,
    itemsError,
    refetchItems,
    isLoading,
    hasNoVersion,
    rawItems,
    masterScopeItems,
    displayItems,
    stats,
    sortMode,
    flowDirection,
    fontSizes,
    blocks,
    customProducts,
    storeBackshopNameOverrides,
    offerPreviewSelectValue,
    onOfferPreviewChange,
    forwardWerbungSlots,
    calendarKw,
    effectiveWerbungEndKw,
    effectiveWerbungEndJahr,
    showWeekMonSat,
    isSuperAdminCentralBackshopMasterView,
    bezeichnungsregeln,
    renamedItems,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    markYellowKwCount,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
    carryoverMasterScoped,
  } = bundle

  const [showPdfDialog, setShowPdfDialog] = useState(false)

  const { pdfDisplayItems, pdfStats, pdfContextKwLabel } = useBackshopMasterListPdfExportList({
    showPdfDialog,
    masterScopeItems,
    carryoverMasterScoped,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    bezeichnungsregeln,
    renamedItems,
    markYellowKwCount,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
    listVersion,
    effectiveWerbungEndKw,
    effectiveWerbungEndJahr,
    showWeekMonSat,
  })

  const werbungToolbarLayout = useMemo(() => {
    if (!listVersion) return null
    return getBackshopToolbarWerbungLayout(
      listVersion.kw_nummer,
      listVersion.jahr,
      effectiveWerbungEndKw,
      effectiveWerbungEndJahr,
    )
  }, [listVersion, effectiveWerbungEndKw, effectiveWerbungEndJahr])

  const showWerbungKwDropdown = forwardWerbungSlots.length > 0 && !snapshotReadOnly

  const versionDisplayKwLabelForPdf = useMemo(() => {
    if (!listVersion) return 'Backshop'
    return formatKwLabelWithOptionalMonSatRange(
      listVersion.kw_label,
      listVersion.kw_nummer,
      listVersion.jahr,
      showWeekMonSat,
    )
  }, [listVersion, showWeekMonSat])

  const kioskBackshopHeaderSummary = useMemo((): KioskListHeaderSummary | null => {
    if (!listVersion) return null
    const kw = versionDisplayKwLabelForPdf.trim()
    if (!kw) return null
    return {
      kwLine: versionDisplayKwLabelForPdf,
      listStatus: listVersion.status === 'frozen' ? 'frozen' : 'active',
    }
  }, [listVersion, versionDisplayKwLabelForPdf])

  useRegisterKioskListHeaderSummary(kioskBackshopHeaderSummary, isKiosk)

  const pluTableRef = useRef<PLUTableHandle>(null)
  const openKioskBackshopFind = useCallback(() => {
    pluTableRef.current?.openFindInPage()
  }, [])
  useRegisterKioskListFindInPage(openKioskBackshopFind, isKiosk)

  const closeBackshopListSearch = useCallback(() => {
    pluTableRef.current?.closeFindInPage()
  }, [])

  const openPdfDialog = useCallback(() => {
    closeBackshopListSearch()
    setShowPdfDialog(true)
  }, [closeBackshopListSearch])

  const backshopMarkenTinderHrefForGroup = useCallback(
    (groupId: string) => {
      const backTo = location.pathname + location.search
      return `${rolePrefix}/marken-auswahl?backTo=${encodeURIComponent(backTo)}&focusGroup=${encodeURIComponent(groupId)}`
    },
    [rolePrefix, location.pathname, location.search],
  )

  // Tab wurde sichtbar: Browser throttelt Hintergrund-Tabs – Re-Render erzwingen
  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') setVisibilityTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const pdfDisabled = isLoading || displayItems.length === 0

  /** Schmale/mittlere Viewports (unter lg): Aktionen im Menü-Button (≡) */
  /* eslint-disable react-hooks/refs -- Menü-onClick schließt Find-in-Page erst beim Tap (pluTableRef), nicht während Render */
  let backshopMobileMenuItems: PLUListPageActionMenuItem[] = []
  if (!listReadOnly) {
    if (snapshotReadOnly) {
      backshopMobileMenuItems = [
        {
          label: 'PDF exportieren',
          icon: <FileDown className="h-4 w-4" />,
          onClick: openPdfDialog,
          disabled: pdfDisabled,
        },
      ]
    } else {
      const backTo = location.pathname + location.search
      const encodedBackTo = encodeURIComponent(backTo)
      const go = (path: string) => {
        closeBackshopListSearch()
        navigate(`${rolePrefix}${path}?backTo=${encodedBackTo}`, { state: { backTo } })
      }
      if (!isSuperAdminCentralBackshopMasterView) {
        backshopMobileMenuItems.push({
          label: 'Eigene Produkte',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => go('/backshop-custom-products'),
        })
      }
      backshopMobileMenuItems.push(
        {
          label: 'Ausgeblendete',
          icon: <EyeOff className="h-4 w-4" />,
          onClick: () => go('/backshop-hidden-products'),
        },
        {
          label: 'Werbung',
          icon: <Megaphone className="h-4 w-4" />,
          onClick: () => go('/backshop-offer-products'),
        },
      )
      if (isSuperAdmin && location.pathname.startsWith('/super-admin')) {
        backshopMobileMenuItems.push({
          label: 'Warengruppen bearbeiten',
          icon: <LayoutGrid className="h-4 w-4" />,
          onClick: () => go('/backshop-warengruppen'),
        })
      }
      backshopMobileMenuItems.push(
        {
          label: 'Marken-Auswahl',
          icon: <GitCompareArrows className="h-4 w-4" />,
          onClick: () => go('/marken-auswahl'),
        },
        {
          label: 'Umbenennen',
          icon: <Pencil className="h-4 w-4" />,
          onClick: () => go('/backshop-renamed-products'),
        },
        {
          label: 'PDF exportieren',
          icon: <FileDown className="h-4 w-4" />,
          onClick: openPdfDialog,
          disabled: pdfDisabled,
        },
      )
    }
  }
  /* eslint-enable react-hooks/refs */

  return (
    <DashboardLayout hideHeader={location.pathname.startsWith('/kiosk')}>
      <div className={isKiosk ? 'space-y-2' : 'space-y-4'} data-tour="backshop-master-page">
        <BackshopMasterListPageHeader
          isKiosk={isKiosk}
          snapshotReadOnly={snapshotReadOnly}
          currentVersion={listVersion}
          isLoading={isLoading}
          hasNoVersion={hasNoVersion}
          snapshotInvalid={snapshotInvalid}
          mobileMenuItems={backshopMobileMenuItems}
        />

        {isSnapshot && resolvedBackshopVersion && (
          <BackshopMasterListArchiveAlert kwLabel={versionDisplayKwLabelForPdf} />
        )}

        {snapshotInvalid && (
          <BackshopMasterListSnapshotInvalidCard
            onBack={() => {
              closeBackshopListSearch()
              navigate('/super-admin/backshop-versions')
            }}
          />
        )}

        {listVersion && !isLoading && !hasNoVersion && !snapshotInvalid && !isKiosk && (
          <BackshopMasterListToolbar
            isKiosk={isKiosk}
            isViewer={isViewer}
            pluTableRef={pluTableRef}
            werbungToolbarLayout={werbungToolbarLayout}
            currentVersion={listVersion}
            showWeekMonSat={showWeekMonSat}
            showWerbungKwDropdown={showWerbungKwDropdown}
            calendarKw={calendarKw}
            forwardWerbungSlots={forwardWerbungSlots}
            offerPreviewSelectValue={offerPreviewSelectValue}
            onOfferPreviewChange={onOfferPreviewChange}
            listReadOnly={listReadOnly}
            snapshotReadOnly={snapshotReadOnly}
            isSuperAdminCentralBackshopMasterView={isSuperAdminCentralBackshopMasterView}
            isSuperAdmin={isSuperAdmin}
            pathname={location.pathname}
            rolePrefix={rolePrefix}
            backTo={location.pathname + location.search}
            navigate={navigate}
            onBeforeNavigate={closeBackshopListSearch}
            openPdfDialog={openPdfDialog}
            pdfDisabled={pdfDisabled}
            hasNoVersion={hasNoVersion}
            isLoading={isLoading}
            displayItemsLength={displayItems.length}
          />
        )}

        {listVersion &&
          !isLoading &&
          !snapshotInvalid &&
          !hasNoVersion &&
          storeBackshopNameOverrides.length > 0 &&
          sortMode === 'ALPHABETICAL' && (
            <BackshopMasterListWgSortHintAlert
              showAdminLayoutLink={(rolePrefix === '/admin' || rolePrefix === '/super-admin') && !snapshotReadOnly}
              layoutSettingsHref={`${rolePrefix}/backshop-layout`}
              onBeforeNavigate={closeBackshopListSearch}
            />
          )}

        {hasNoVersion && <BackshopMasterListNoVersionCard />}

        {snapshotSourceOnly && !hasNoVersion && !snapshotInvalid && resolvedBackshopVersion && (
          <BackshopMasterListSourceFilterAlert
            sourceLabel={BACKSHOP_SOURCE_META[snapshotSourceOnly as BackshopExcelSource].label}
            kwLabel={resolvedBackshopVersion.kw_label}
            onClearSource={() => {
              closeBackshopListSearch()
              setSearchParams(
                (prev: URLSearchParams) => {
                  const next = new URLSearchParams(prev)
                  next.delete('source')
                  return next
                },
                { replace: true },
              )
            }}
          />
        )}

        {(isLoading || (itemsError != null && itemsRefetching)) && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListLoadingSkeletonCard />
        )}

        {itemsError != null && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListItemsErrorCard
            message={itemsError instanceof Error ? itemsError.message : 'Unbekannter Fehler'}
            onRetry={() => refetchItems()}
          />
        )}

        {!isLoading &&
          !itemsError &&
          !hasNoVersion &&
          !snapshotInvalid &&
          displayItems.length === 0 &&
          masterScopeItems.length === 0 && (
            <BackshopMasterListEmptyDataCard
              snapshotSourceOnly={Boolean(snapshotSourceOnly)}
              rawItemsLength={rawItems.length}
              sourceLabel={snapshotSourceOnly ? BACKSHOP_SOURCE_META[snapshotSourceOnly as BackshopExcelSource].label : ''}
            />
          )}

        {!isLoading &&
          !itemsError &&
          !hasNoVersion &&
          !snapshotInvalid &&
          (displayItems.length > 0 || masterScopeItems.length > 0) && (
          <div data-tour="backshop-master-table">
            <PLUTable
              ref={pluTableRef}
              items={displayItems}
              displayMode="MIXED"
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              fontSizes={fontSizes}
              listType="backshop"
              showFindInPage
              findInPageExternalTrigger
              backshopMarkenTinderHrefForGroup={
                snapshotReadOnly ? undefined : backshopMarkenTinderHrefForGroup
              }
            />
            <PLUFooter stats={stats} />
          </div>
        )}

        {showPdfDialog && !isKiosk && (
          <Suspense fallback={null}>
            <ExportBackshopPDFDialog
            open={showPdfDialog}
            onOpenChange={setShowPdfDialog}
            items={pdfDisplayItems}
            stats={pdfStats}
            kwLabel={pdfContextKwLabel}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            versions={[]}
            selectedVersionId={undefined}
            onVersionChange={undefined}
            fontSizes={fontSizes}
            showWeekMonSat={showWeekMonSat}
          />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  )
}
