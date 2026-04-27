// Persistenz der Werbungs-KW-Vorschau auf der Backshop-Masterliste (sessionStorage)

import type { BackshopOfferPreviewSelection } from '@/hooks/useCentralOfferCampaigns'

const STORAGE_KEY = 'plu-planner-backshop-offer-preview-v1'

function isExplicit(
  v: unknown,
): v is { mode: 'explicit'; kw: number; jahr: number } {
  return (
    typeof v === 'object'
    && v != null
    && (v as { mode?: string }).mode === 'explicit'
    && typeof (v as { kw?: unknown }).kw === 'number'
    && typeof (v as { jahr?: unknown }).jahr === 'number'
  )
}

/** Liest gespeicherte Auswahl; bei Fehler oder unbekanntem Format null. */
export function readBackshopOfferPreviewSelection(): BackshopOfferPreviewSelection | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (parsed === 'auto' || (typeof parsed === 'object' && parsed && (parsed as { mode: string }).mode === 'auto')) {
      return { mode: 'auto' }
    }
    if (isExplicit(parsed)) {
      return { mode: 'explicit', kw: parsed.kw, jahr: parsed.jahr }
    }
  } catch {
    /* ignorieren */
  }
  return null
}

export function writeBackshopOfferPreviewSelection(sel: BackshopOfferPreviewSelection): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sel))
  } catch {
    /* ignorieren */
  }
}
