import { useCallback, useEffect, useMemo, useState } from 'react'
import { writeBackshopOfferPreviewSelection } from '@/lib/backshop-master-offer-preview'
import type { BackshopVersion } from '@/types/database'
import type { BackshopOfferPreviewSelection } from '@/hooks/useCentralOfferCampaigns'

export type BackshopOfferSlot = { kw: number; jahr: number }

/**
 * Werbungs-KW-Vorschau (Toolbar-Dropdown): State, Persistenz und Snapshot-Sperre.
 */
export function useBackshopOfferPreviewUi(options: {
  isSnapshot: boolean
  resolvedBackshopVersion: BackshopVersion | null | undefined
  offerSlots: BackshopOfferSlot[]
  offerSlotsFetched: boolean
}) {
  const { isSnapshot, resolvedBackshopVersion, offerSlots, offerSlotsFetched } = options

  const [offerPreviewSelection, setOfferPreviewSelection] = useState<BackshopOfferPreviewSelection>({
    mode: 'auto',
  })

  /** Bei jedem Betreten der Live-Liste: Werbung wieder auf automatische aktuelle KW. */
  useEffect(() => {
    if (isSnapshot) return
    queueMicrotask(() => {
      setOfferPreviewSelection({ mode: 'auto' })
      writeBackshopOfferPreviewSelection({ mode: 'auto' })
    })
  }, [isSnapshot])

  const lockedSnapshotPreview = useMemo((): BackshopOfferPreviewSelection | null => {
    if (!isSnapshot || !resolvedBackshopVersion) return null
    return {
      mode: 'explicit',
      kw: resolvedBackshopVersion.kw_nummer,
      jahr: resolvedBackshopVersion.jahr,
    }
  }, [isSnapshot, resolvedBackshopVersion])

  const previewForCampaign = lockedSnapshotPreview ?? offerPreviewSelection

  useEffect(() => {
    if (lockedSnapshotPreview) return
    if (!offerSlotsFetched) return
    if (offerPreviewSelection.mode !== 'explicit') return
    const ok = offerSlots.some(
      (s) => s.kw === offerPreviewSelection.kw && s.jahr === offerPreviewSelection.jahr,
    )
    if (!ok) {
      const next = { mode: 'auto' as const }
      queueMicrotask(() => {
        setOfferPreviewSelection(next)
        writeBackshopOfferPreviewSelection(next)
      })
    }
  }, [lockedSnapshotPreview, offerPreviewSelection, offerSlots, offerSlotsFetched])

  useEffect(() => {
    if (isSnapshot) return
    writeBackshopOfferPreviewSelection(offerPreviewSelection)
  }, [offerPreviewSelection, isSnapshot])

  const offerPreviewSelectValue = useMemo(() => {
    if (offerPreviewSelection.mode === 'auto') return 'auto'
    return `${offerPreviewSelection.jahr}:${offerPreviewSelection.kw}`
  }, [offerPreviewSelection])

  const onOfferPreviewChange = useCallback((v: string) => {
    if (v === 'auto') {
      setOfferPreviewSelection({ mode: 'auto' })
      return
    }
    const parts = v.split(':')
    const jahr = Number(parts[0])
    const kw = Number(parts[1])
    if (!Number.isFinite(jahr) || !Number.isFinite(kw)) return
    setOfferPreviewSelection({ mode: 'explicit', kw, jahr })
  }, [])

  return {
    previewForCampaign,
    offerPreviewSelectValue,
    onOfferPreviewChange,
  }
}
